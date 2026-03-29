import { serverAuth } from "@/lib/auth/server-auth";
import { db } from "@/lib/db";
import { users, teams, teamMembers, competitions } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { triggerEvent } from "@/lib/services/pusher";
import { channels, EVENTS } from "@/lib/services/pusher-channels";
import type { ParticipantTeamUpdatePayload } from "@/lib/services/pusher-channels";

const joinByCodeSchema = z.object({
  inviteCode: z.string().min(1),
});

export async function POST(
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
    if (!dbUser || dbUser.role !== "student") {
      return NextResponse.json({ error: "Only participants can join teams" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = joinByCodeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    // Verify team and invite code
    const [team] = await db.select().from(teams).where(
      and(eq(teams.id, teamId), eq(teams.inviteCode, parsed.data.inviteCode))
    );
    if (!team) {
      return NextResponse.json({ error: "Invalid team or invite code" }, { status: 404 });
    }

    // Check competition is still active
    const [competition] = await db.select().from(competitions).where(eq(competitions.id, team.competitionId));
    if (!competition || competition.status !== "active") {
      return NextResponse.json({ error: "Competition is not active" }, { status: 400 });
    }

    // Check not already in a team for this competition
    const existing = await db
      .select({ id: teamMembers.id })
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(and(eq(teams.competitionId, team.competitionId), eq(teamMembers.userId, dbUser.id)));

    if (existing.length > 0) {
      return NextResponse.json({ error: "Already in a team for this competition" }, { status: 409 });
    }

    // Check team size limit
    const [{ memberCount }] = await db
      .select({ memberCount: sql<number>`count(*)` })
      .from(teamMembers)
      .where(eq(teamMembers.teamId, teamId));

    if (Number(memberCount) >= competition.maxTeamSize) {
      return NextResponse.json({ error: "Team is full" }, { status: 400 });
    }

    // Add member
    await db.insert(teamMembers).values({
      teamId,
      userId: dbUser.id,
      role: "member",
    });

    // Notify team lead about new member via Pusher
    try {
      const memberName = [dbUser.firstName, dbUser.lastName].filter(Boolean).join(" ") || "A participant";
      const teamUpdatePayload: ParticipantTeamUpdatePayload = {
        teamId,
        teamName: team.name,
        competitionId: team.competitionId,
        action: "member_joined",
        memberName,
      };

      // Notify the team lead
      triggerEvent(
        channels.participant(team.leadId),
        EVENTS.PARTICIPANT_TEAM_UPDATE,
        teamUpdatePayload
      );
    } catch (pusherErr) {
      console.error("Teams invite: Pusher notification failed:", pusherErr);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/teams/[id]/invite error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to join team" },
      { status: 500 }
    );
  }
}
