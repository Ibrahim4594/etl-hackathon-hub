import { serverAuth } from "@/lib/auth/server-auth";
import { db } from "@/lib/db";
import { users, competitions, teams, teamMembers, organizations } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { triggerEvent } from "@/lib/services/pusher";
import { channels, EVENTS } from "@/lib/services/pusher-channels";
import type { TeamRegisteredPayload } from "@/lib/services/pusher-channels";

/**
 * POST /api/competitions/[id]/register
 * Register a student for a competition by creating a solo team.
 *
 * @auth Required (Clerk session, role: student)
 * @body { accessCode?: string } (required for private competitions)
 * @returns { success: true, team: { id, name, inviteCode } } or { error: string }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: competitionId } = await params;
    const { userId: clerkId } = await serverAuth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get DB user
    const [dbUser] = await db.select().from(users).where(eq(users.clerkId, clerkId));
    if (!dbUser || dbUser.role !== "student") {
      return NextResponse.json({ error: "Only participants can register" }, { status: 403 });
    }

    // Get competition
    const [competition] = await db.select().from(competitions).where(eq(competitions.id, competitionId));
    if (!competition) {
      return NextResponse.json({ error: "Competition not found" }, { status: 404 });
    }

    if (competition.status !== "active") {
      return NextResponse.json({ error: "Competition is not accepting registrations" }, { status: 400 });
    }

    // Access code validation for private competitions
    if (competition.visibility === "private" && competition.accessCode) {
      const body = await req.json().catch(() => ({}));
      if (!body.accessCode || body.accessCode !== competition.accessCode) {
        return NextResponse.json({ error: "Invalid access code" }, { status: 403 });
      }
    }

    // Check registration deadline
    if (competition.registrationEnd && new Date(competition.registrationEnd) < new Date()) {
      return NextResponse.json({ error: "Registration deadline has passed" }, { status: 400 });
    }

    // Check if already registered (has a team in this competition)
    const existingMembership = await db
      .select({ id: teamMembers.id })
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(
        and(
          eq(teams.competitionId, competitionId),
          eq(teamMembers.userId, dbUser.id)
        )
      );

    if (existingMembership.length > 0) {
      return NextResponse.json({ error: "Already registered for this competition" }, { status: 409 });
    }

    // Check capacity
    if (competition.maxParticipants) {
      const [{ count }] = await db
        .select({ count: sql<number>`count(distinct ${teamMembers.userId})` })
        .from(teamMembers)
        .innerJoin(teams, eq(teamMembers.teamId, teams.id))
        .where(eq(teams.competitionId, competitionId));

      if (Number(count) >= competition.maxParticipants) {
        return NextResponse.json({ error: "Competition is full" }, { status: 400 });
      }
    }

    // Create a solo team for the student
    const inviteCode = crypto.randomBytes(4).toString("hex").toUpperCase();
    const teamName = `${dbUser.firstName || "Team"}'s Team`;

    const [team] = await db.insert(teams).values({
      competitionId,
      name: teamName,
      inviteCode,
      leadId: dbUser.id,
    }).returning();

    // Add student as team lead
    await db.insert(teamMembers).values({
      teamId: team.id,
      userId: dbUser.id,
      role: "lead",
    });

    // Trigger real-time events
    try {
      const regPayload: TeamRegisteredPayload = {
        competitionId,
        teamId: team.id,
        teamName: team.name,
        memberCount: 1,
      };

      triggerEvent(channels.competition(competitionId), EVENTS.TEAM_REGISTERED, regPayload);

      // Notify organizer channel
      const [org] = await db
        .select({ id: organizations.id })
        .from(organizations)
        .innerJoin(competitions, eq(competitions.organizationId, organizations.id))
        .where(eq(competitions.id, competitionId));
      if (org) {
        triggerEvent(channels.organizer(org.id), EVENTS.ORG_TEAM_REGISTERED, regPayload);
      }
    } catch (pusherErr) {
      console.error("Register: Pusher notification failed:", pusherErr);
    }

    return NextResponse.json({
      success: true,
      team: { id: team.id, name: team.name, inviteCode: team.inviteCode },
    });
  } catch (error) {
    console.error("POST /api/competitions/[id]/register error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to register for competition" },
      { status: 500 }
    );
  }
}
