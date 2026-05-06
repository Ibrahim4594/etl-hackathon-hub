import { serverAuth } from "@/lib/auth/server-auth";
import { db } from "@/lib/db";
import { users, teams, teamMembers, submissions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";

/**
 * DELETE /api/competitions/[id]/unregister
 * Allow a participant to leave a competition they registered for.
 *
 * Rules:
 * - Cannot leave if the team already has a submission.
 * - If the participant is the sole member (solo team lead): delete the team.
 * - If the participant is a non-lead member: remove them from the team.
 * - If the participant is the lead with other members: transfer lead to oldest
 *   remaining member, then remove the requesting user.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: competitionId } = await params;
    const { userId: clerkId } = await serverAuth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [dbUser] = await db.select().from(users).where(eq(users.clerkId, clerkId));
    if (!dbUser || dbUser.role !== "student") {
      return NextResponse.json({ error: "Only participants can unregister" }, { status: 403 });
    }

    // Find the user's team membership for this competition
    const [membership] = await db
      .select({ teamId: teamMembers.teamId, role: teamMembers.role })
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(
        and(
          eq(teamMembers.userId, dbUser.id),
          eq(teams.competitionId, competitionId)
        )
      );

    if (!membership) {
      return NextResponse.json({ error: "You are not registered for this competition" }, { status: 404 });
    }

    // Block if the team already has a submission
    const [existingSub] = await db
      .select({ id: submissions.id })
      .from(submissions)
      .where(
        and(
          eq(submissions.teamId, membership.teamId),
          eq(submissions.competitionId, competitionId)
        )
      );

    if (existingSub) {
      return NextResponse.json(
        { error: "Cannot leave after your team has submitted. Contact the organizer if needed." },
        { status: 400 }
      );
    }

    // Count all members in this team
    const allMembers = await db
      .select({ userId: teamMembers.userId, role: teamMembers.role })
      .from(teamMembers)
      .where(eq(teamMembers.teamId, membership.teamId));

    if (allMembers.length === 1) {
      // Solo team — delete the whole team (cascades on team members)
      await db.delete(teams).where(eq(teams.id, membership.teamId));
    } else if (membership.role === "lead") {
      // Transfer lead to the next member before removing self
      const nextLead = allMembers.find((m) => m.userId !== dbUser.id);
      if (nextLead) {
        await db
          .update(teams)
          .set({ leadId: nextLead.userId })
          .where(eq(teams.id, membership.teamId));
        await db
          .update(teamMembers)
          .set({ role: "lead" })
          .where(
            and(
              eq(teamMembers.teamId, membership.teamId),
              eq(teamMembers.userId, nextLead.userId)
            )
          );
      }
      await db
        .delete(teamMembers)
        .where(
          and(
            eq(teamMembers.teamId, membership.teamId),
            eq(teamMembers.userId, dbUser.id)
          )
        );
    } else {
      // Regular member — just remove them
      await db
        .delete(teamMembers)
        .where(
          and(
            eq(teamMembers.teamId, membership.teamId),
            eq(teamMembers.userId, dbUser.id)
          )
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, "Failed to leave competition");
  }
}
