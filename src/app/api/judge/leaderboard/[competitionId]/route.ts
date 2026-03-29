import { serverAuth } from "@/lib/auth/server-auth";
import { db } from "@/lib/db";
import {
  users,
  finalRankings,
  submissions,
  teams,
  competitions,
  judgeAssignments,
} from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ competitionId: string }> }
) {
  const { competitionId } = await params;
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

  // Permission check: must be admin, competition organizer, or assigned judge
  let hasAccess = false;

  if (dbUser.role === "admin") {
    hasAccess = true;
  }

  if (!hasAccess) {
    // Check if user is the competition organizer
    const [competition] = await db
      .select({ createdBy: competitions.createdBy })
      .from(competitions)
      .where(eq(competitions.id, competitionId));

    if (competition && competition.createdBy === dbUser.id) {
      hasAccess = true;
    }
  }

  if (!hasAccess) {
    // Check if user is an assigned judge for this competition
    const [assignment] = await db
      .select({ id: judgeAssignments.id })
      .from(judgeAssignments)
      .where(
        and(
          eq(judgeAssignments.judgeId, dbUser.id),
          eq(judgeAssignments.competitionId, competitionId)
        )
      );

    if (assignment) {
      hasAccess = true;
    }
  }

  if (!hasAccess) {
    return NextResponse.json(
      { error: "You do not have permission to view this leaderboard" },
      { status: 403 }
    );
  }

  const rankings = await db
    .select({
      id: finalRankings.id,
      rank: finalRankings.rank,
      aiScore: finalRankings.aiScore,
      humanScoreNormalized: finalRankings.humanScoreNormalized,
      finalScore: finalRankings.finalScore,
      isFinalist: finalRankings.isFinalist,
      isWinner: finalRankings.isWinner,
      submissionId: submissions.id,
      submissionTitle: submissions.title,
      teamId: teams.id,
      teamName: teams.name,
    })
    .from(finalRankings)
    .innerJoin(submissions, eq(finalRankings.submissionId, submissions.id))
    .innerJoin(teams, eq(finalRankings.teamId, teams.id))
    .where(eq(finalRankings.competitionId, competitionId))
    .orderBy(asc(finalRankings.rank));

  return NextResponse.json({ rankings });
}
