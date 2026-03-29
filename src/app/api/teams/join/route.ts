import { serverAuth } from "@/lib/auth/server-auth";
import { db } from "@/lib/db";
import { users, teams, teamMembers, competitions } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { triggerEvent } from "@/lib/services/pusher";
import { channels, EVENTS } from "@/lib/services/pusher-channels";

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await serverAuth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [dbUser] = await db.select().from(users).where(eq(users.clerkId, clerkId));
    if (!dbUser || dbUser.role !== "student") {
      return NextResponse.json({ error: "Only participants can join teams" }, { status: 403 });
    }

    const body = await req.json();
    const inviteCode = (body.inviteCode as string)?.trim().toUpperCase();
    if (!inviteCode) {
      return NextResponse.json({ error: "Invite code is required" }, { status: 400 });
    }

    // Find team by invite code
    const [team] = await db
      .select()
      .from(teams)
      .where(eq(teams.inviteCode, inviteCode));

    if (!team) {
      return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
    }

    // Check competition is active
    const [competition] = await db
      .select()
      .from(competitions)
      .where(eq(competitions.id, team.competitionId));

    if (!competition || competition.status !== "active") {
      return NextResponse.json({ error: "Competition is not accepting registrations" }, { status: 400 });
    }

    // Check if already in a team for this competition
    const existing = await db
      .select({ id: teamMembers.id })
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(
        and(
          eq(teams.competitionId, team.competitionId),
          eq(teamMembers.userId, dbUser.id)
        )
      );

    if (existing.length > 0) {
      return NextResponse.json({ error: "Already in a team for this competition" }, { status: 409 });
    }

    // Check team capacity
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(teamMembers)
      .where(eq(teamMembers.teamId, team.id));

    if (Number(count) >= competition.maxTeamSize) {
      return NextResponse.json({ error: "Team is full" }, { status: 400 });
    }

    // Add member
    await db.insert(teamMembers).values({
      teamId: team.id,
      userId: dbUser.id,
      role: "member",
    });

    // Real-time: notify team lead about new member
    try {
      triggerEvent(channels.participant(team.leadId), EVENTS.PARTICIPANT_TEAM_UPDATE, {
        teamId: team.id,
        teamName: team.name,
        competitionId: team.competitionId,
        action: "member_joined",
        memberName: [dbUser.firstName, dbUser.lastName].filter(Boolean).join(" ") || "New Member",
      });
    } catch (pusherErr) {
      console.error("Teams join: Pusher notification failed:", pusherErr);
    }

    return NextResponse.json({
      success: true,
      team: { id: team.id, name: team.name },
    });
  } catch (error) {
    console.error("POST /api/teams/join error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to join team" },
      { status: 500 }
    );
  }
}
