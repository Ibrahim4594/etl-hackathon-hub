import { serverAuth } from "@/lib/auth/server-auth";
import { db } from "@/lib/db";
import { users, teams, teamMembers, competitions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";
import { createNotification } from "@/lib/services/notification";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId: clerkId } = await serverAuth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [dbUser] = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.clerkId, clerkId));
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Check access: must be a team member, the competition organizer, or admin
    if (dbUser.role !== "admin") {
      const [membership] = await db
        .select({ id: teamMembers.id })
        .from(teamMembers)
        .where(and(eq(teamMembers.teamId, id), eq(teamMembers.userId, dbUser.id)));

      const isMember = membership !== undefined;

      // Check if the user is the competition organizer
      let isOrganizer = false;
      if (!isMember) {
        const [comp] = await db
          .select({ createdBy: competitions.createdBy })
          .from(competitions)
          .where(eq(competitions.id, team.competitionId));
        isOrganizer = comp?.createdBy === dbUser.id;
      }

      if (!isMember && !isOrganizer) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const members = await db
      .select({
        id: teamMembers.id,
        userId: teamMembers.userId,
        role: teamMembers.role,
        joinedAt: teamMembers.joinedAt,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        imageUrl: users.imageUrl,
      })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(eq(teamMembers.teamId, id));

    return NextResponse.json({ team, members });
  } catch (error) {
    console.error("GET /api/teams/[id] error:", error);
    return apiError(error, "Failed to fetch team");
  }
}

/**
 * PATCH /api/teams/[id]
 * Transfer team ownership to another member.
 *
 * @auth Required (Clerk session, must be current team lead)
 * @body { newLeadId: string }
 * @returns { success: true }
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId: clerkId } = await serverAuth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [dbUser] = await db.select({ id: users.id }).from(users).where(eq(users.clerkId, clerkId));
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

    if (team.leadId !== dbUser.id) {
      return NextResponse.json({ error: "Only the team lead can transfer ownership" }, { status: 403 });
    }

    const { newLeadId } = await req.json();
    if (!newLeadId) return NextResponse.json({ error: "newLeadId is required" }, { status: 400 });

    // Verify new lead is a team member
    const [membership] = await db
      .select({ id: teamMembers.id })
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, id), eq(teamMembers.userId, newLeadId)));

    if (!membership) {
      return NextResponse.json({ error: "New lead must be a team member" }, { status: 400 });
    }

    // Transfer ownership
    await db.update(teams).set({ leadId: newLeadId }).where(eq(teams.id, id));
    await db.update(teamMembers).set({ role: "member" }).where(and(eq(teamMembers.teamId, id), eq(teamMembers.userId, dbUser.id)));
    await db.update(teamMembers).set({ role: "lead" }).where(and(eq(teamMembers.teamId, id), eq(teamMembers.userId, newLeadId)));

    // Notify new lead
    await createNotification({
      userId: newLeadId,
      type: "general",
      title: "You are now team lead",
      message: `You have been made the lead of "${team.name}".`,
      link: "/student/teams",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/teams/[id] error:", error);
    return apiError(error, "Failed to transfer ownership");
  }
}
