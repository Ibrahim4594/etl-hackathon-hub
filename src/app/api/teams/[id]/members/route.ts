import { serverAuth } from "@/lib/auth/server-auth";
import { db } from "@/lib/db";
import { users, teams, teamMembers, competitions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teamId } = await params;
    const { userId: clerkId } = await serverAuth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [dbUser] = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.clerkId, clerkId));
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Check access: must be a team member, the competition organizer, or admin
    if (dbUser.role !== "admin") {
      const [membership] = await db
        .select({ id: teamMembers.id })
        .from(teamMembers)
        .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, dbUser.id)));

      const isMember = membership !== undefined;

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
      .where(eq(teamMembers.teamId, teamId));

    return NextResponse.json({ members });
  } catch (error) {
    console.error("GET /api/teams/[id]/members error:", error);
    return apiError(error, "Failed to fetch team members");
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teamId } = await params;
    const { userId: clerkId } = await serverAuth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [dbUser] = await db.select().from(users).where(eq(users.clerkId, clerkId));
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const memberUserId = searchParams.get("userId");
    if (!memberUserId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    // Verify caller is team lead
    const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
    if (!team || team.leadId !== dbUser.id) {
      return NextResponse.json({ error: "Only team lead can remove members" }, { status: 403 });
    }

    // Cannot remove the lead
    if (memberUserId === dbUser.id) {
      return NextResponse.json({ error: "Cannot remove team lead" }, { status: 400 });
    }

    await db.delete(teamMembers).where(
      and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, memberUserId))
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/teams/[id]/members error:", error);
    return apiError(error, "Failed to remove team member");
  }
}
