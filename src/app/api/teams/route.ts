import { serverAuth } from "@/lib/auth/server-auth";
import { db } from "@/lib/db";
import { users, teams, teamMembers, competitions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod/v4";
import crypto from "crypto";
import { triggerEvent } from "@/lib/services/pusher";
import { channels, EVENTS } from "@/lib/services/pusher-channels";

/**
 * GET /api/teams?competitionId=xxx
 * Returns the current user's team info for a given competition.
 */
export async function GET(req: Request) {
  try {
    const { userId: clerkId } = await serverAuth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [dbUser] = await db.select().from(users).where(eq(users.clerkId, clerkId));
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const competitionId = searchParams.get("competitionId");

    if (!competitionId) {
      return NextResponse.json({ error: "competitionId is required" }, { status: 400 });
    }

    // Find user's team for this competition
    const [membership] = await db
      .select({
        teamId: teams.id,
        teamName: teams.name,
        role: teamMembers.role,
        inviteCode: teams.inviteCode,
        competitionTitle: competitions.title,
      })
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .innerJoin(competitions, eq(teams.competitionId, competitions.id))
      .where(
        and(
          eq(teamMembers.userId, dbUser.id),
          eq(teams.competitionId, competitionId)
        )
      );

    if (!membership) {
      return NextResponse.json({ team: null });
    }

    return NextResponse.json({ team: membership });
  } catch (error) {
    console.error("GET /api/teams error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch team" },
      { status: 500 }
    );
  }
}

const createTeamSchema = z.object({
  competitionId: z.string().uuid(),
  name: z.string().min(2).max(50),
});

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await serverAuth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [dbUser] = await db.select().from(users).where(eq(users.clerkId, clerkId));
    if (!dbUser || dbUser.role !== "student") {
      return NextResponse.json({ error: "Only participants can create teams" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createTeamSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const { competitionId, name } = parsed.data;

    // Verify competition exists and is active
    const [competition] = await db.select().from(competitions).where(eq(competitions.id, competitionId));
    if (!competition || competition.status !== "active") {
      return NextResponse.json({ error: "Competition not available" }, { status: 400 });
    }

    // Check not already in a team for this competition
    const existing = await db
      .select({ id: teamMembers.id })
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(and(eq(teams.competitionId, competitionId), eq(teamMembers.userId, dbUser.id)));

    if (existing.length > 0) {
      return NextResponse.json({ error: "Already in a team for this competition" }, { status: 409 });
    }

    const inviteCode = crypto.randomBytes(4).toString("hex").toUpperCase();

    const [team] = await db.insert(teams).values({
      competitionId,
      name,
      inviteCode,
      leadId: dbUser.id,
    }).returning();

    await db.insert(teamMembers).values({
      teamId: team.id,
      userId: dbUser.id,
      role: "lead",
    });

    // Real-time: notify competition channel
    try {
      triggerEvent(channels.competition(competitionId), EVENTS.TEAM_REGISTERED, {
        competitionId,
        teamId: team.id,
        teamName: name,
        memberCount: 1,
      });
    } catch (pusherErr) {
      console.error("Teams POST: Pusher notification failed:", pusherErr);
    }

    return NextResponse.json({ success: true, team });
  } catch (error) {
    console.error("POST /api/teams error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create team" },
      { status: 500 }
    );
  }
}
