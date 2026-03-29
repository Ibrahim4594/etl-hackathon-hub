import { serverAuth } from "@/lib/auth/server-auth";
import { db } from "@/lib/db";
import {
  users,
  competitions,
  submissions,
  teams,
  teamMembers,
} from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { triggerEvent } from "@/lib/services/pusher";
import { channels, EVENTS } from "@/lib/services/pusher-channels";
import { createNotification } from "@/lib/services/notification";

/**
 * POST /api/competitions/[id]/announce
 * Announce winners, mark finalists, and complete the competition.
 *
 * @auth Required (Clerk session, role: admin or sponsor owner)
 * @body { winnerIds?: string[] } (optional — defaults to top 3 by score)
 * @returns { success: true, winners: [{ rank, submissionId, title, teamName }] }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId: clerkId } = await serverAuth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkId));

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only admin or competition owner
    const [competition] = await db
      .select()
      .from(competitions)
      .where(eq(competitions.id, id));

    if (!competition) {
      return NextResponse.json(
        { error: "Competition not found" },
        { status: 404 }
      );
    }

    const isAdmin = dbUser.role === "admin";
    const isOwner =
      dbUser.role === "sponsor" && competition.createdBy === dbUser.id;

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (
      competition.status !== "judging" &&
      competition.status !== "active"
    ) {
      return NextResponse.json(
        { error: "Competition must be in judging or active status to announce winners" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { winnerIds } = body as { winnerIds?: string[] };

    // Get ranked submissions
    const rankedSubs = await db
      .select({
        id: submissions.id,
        title: submissions.title,
        teamId: submissions.teamId,
        teamName: teams.name,
        finalScore: submissions.finalScore,
        rank: submissions.rank,
      })
      .from(submissions)
      .innerJoin(teams, eq(submissions.teamId, teams.id))
      .where(eq(submissions.competitionId, id))
      .orderBy(desc(submissions.finalScore));

    // Mark winners (top 3 or specified)
    const winners = winnerIds
      ? rankedSubs.filter((s) => winnerIds.includes(s.id))
      : rankedSubs.slice(0, 3);

    // Update winner submission statuses
    for (let i = 0; i < winners.length; i++) {
      const status = i === 0 ? "winner" : "finalist";
      await db
        .update(submissions)
        .set({ status, rank: i + 1, updatedAt: new Date() })
        .where(eq(submissions.id, winners[i].id));
    }

    // Mark remaining top entries as finalists
    const finalistCount = competition.finalistCount ?? 10;
    const finalists = rankedSubs.slice(
      winners.length,
      finalistCount
    );
    for (const f of finalists) {
      if (!winners.find((w) => w.id === f.id)) {
        await db
          .update(submissions)
          .set({ status: "finalist", updatedAt: new Date() })
          .where(eq(submissions.id, f.id));
      }
    }

    // Update competition status to completed
    await db
      .update(competitions)
      .set({ status: "completed", updatedAt: new Date() })
      .where(eq(competitions.id, id));

    // Notify all participants
    const allMembers = await db
      .select({ userId: teamMembers.userId })
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(eq(teams.competitionId, id));

    const uniqueUserIds = [...new Set(allMembers.map((m) => m.userId))];

    for (const uid of uniqueUserIds) {
      await createNotification({
        userId: uid,
        type: "winner_announced",
        title: "Winners Announced!",
        message: `Results for "${competition.title}" are now available.`,
        link: `/competitions/${competition.slug}`,
      });
    }

    // Notify all admin users so they can review results
    const adminUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, "admin"));

    for (const admin of adminUsers) {
      // Skip if the announcer is already an admin (they already know)
      if (admin.id === dbUser.id) continue;

      await createNotification({
        userId: admin.id,
        type: "winner_announced",
        title: "Results Ready for Review",
        message: `Winners announced for "${competition.title}" — review results.`,
        link: `/admin/competitions/${competition.slug}`,
      });
    }

    // Broadcast completion
    triggerEvent(channels.global(), EVENTS.COMPETITION_COMPLETED, {
      competitionId: id,
      title: competition.title,
    });

    return NextResponse.json({
      success: true,
      winners: winners.map((w, i) => ({
        rank: i + 1,
        submissionId: w.id,
        title: w.title,
        teamName: w.teamName,
      })),
    });
  } catch (error) {
    console.error("Announce winners error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to announce winners" },
      { status: 500 }
    );
  }
}
