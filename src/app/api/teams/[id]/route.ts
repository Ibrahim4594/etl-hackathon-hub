import { serverAuth } from "@/lib/auth/server-auth";
import { db } from "@/lib/db";
import { users, teams, teamMembers, competitions, organizations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";

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
        .where(eq(teamMembers.teamId, id));

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
