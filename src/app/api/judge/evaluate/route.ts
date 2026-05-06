import { serverAuth } from "@/lib/auth/server-auth";
import { db } from "@/lib/db";
import {
  users,
  submissions,
  judgeAssignments,
  judgeEvaluations,
  teams,
  competitions,
  organizations,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { triggerEvent } from "@/lib/services/pusher";
import { channels, EVENTS } from "@/lib/services/pusher-channels";
import { apiError } from "@/lib/api-error";

/**
 * POST /api/judge/evaluate
 * Submit or update a judge's evaluation for a submission.
 * Supports custom criteria — scores is a generic Record<string, number> (1-100 per criterion).
 *
 * @auth Required (Clerk session, role: judge, must be assigned to competition)
 * @body { submissionId, scores: Record<string, number>, comments?, overrideAi? }
 * @returns { success: true, evaluation: {...} } or { error: string }
 */
export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await serverAuth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkId));
    if (!dbUser || dbUser.role !== "judge") {
      return NextResponse.json(
        { error: "Only judges can evaluate submissions" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { submissionId, scores, comments, overrideAi } = body;

    // Validate request body
    if (!submissionId || !scores) {
      return NextResponse.json(
        { error: "submissionId and scores are required" },
        { status: 400 }
      );
    }

    // Validate scores generically — competitions can have custom criteria
    if (typeof scores !== "object" || scores === null || Array.isArray(scores)) {
      return NextResponse.json(
        { error: "scores must be an object" },
        { status: 400 }
      );
    }

    const scoreEntries = Object.entries(scores) as [string, unknown][];
    if (scoreEntries.length === 0) {
      return NextResponse.json(
        { error: "scores must contain at least one criterion" },
        { status: 400 }
      );
    }

    for (const [key, value] of scoreEntries) {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        return NextResponse.json(
          { error: `Score for "${key}" must be a number` },
          { status: 400 }
        );
      }
      if (value < 1 || value > 100) {
        return NextResponse.json(
          { error: `Score for "${key}" must be between 1 and 100` },
          { status: 400 }
        );
      }
    }

    // Note: per-criterion maxScore is validated below, after criteria are fetched.

    // Fetch submission to get competition ID
    const [submission] = await db
      .select({
        id: submissions.id,
        competitionId: submissions.competitionId,
        status: submissions.status,
      })
      .from(submissions)
      .where(eq(submissions.id, submissionId));

    if (!submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    // Fetch competition for judging criteria and status check
    const [comp] = await db
      .select({
        status: competitions.status,
        judgingCriteria: competitions.judgingCriteria,
      })
      .from(competitions)
      .where(eq(competitions.id, submission.competitionId));

    // Only allow judging when competition is in judging or completed phase
    if (comp && !["judging", "completed"].includes(comp.status)) {
      return NextResponse.json(
        { error: "Judging has not started for this competition yet" },
        { status: 400 }
      );
    }

    // Verify judge is assigned to this competition
    const [assignment] = await db
      .select({ id: judgeAssignments.id })
      .from(judgeAssignments)
      .where(
        and(
          eq(judgeAssignments.judgeId, dbUser.id),
          eq(judgeAssignments.competitionId, submission.competitionId)
        )
      );

    if (!assignment) {
      return NextResponse.json(
        { error: "You are not assigned to this competition" },
        { status: 403 }
      );
    }

    // Verify judge is assigned to this specific submission
    const [submissionAssignment] = await db
      .select({ id: judgeEvaluations.id })
      .from(judgeEvaluations)
      .where(
        and(
          eq(judgeEvaluations.judgeId, dbUser.id),
          eq(judgeEvaluations.submissionId, submissionId)
        )
      );

    if (!submissionAssignment) {
      return NextResponse.json(
        { error: "You are not assigned to evaluate this submission" },
        { status: 403 }
      );
    }

    // Validate each score against its criterion's configured maxScore.
    // This enforces per-criterion bounds (e.g. maxScore: 50 means score must be ≤ 50).
    const criteria = comp?.judgingCriteria ?? [];
    if (criteria.length > 0) {
      for (const c of criteria) {
        const key = c.name.toLowerCase().replace(/\s+/g, "_");
        const raw = (scores as Record<string, number>)[key];
        if (raw !== undefined && raw > c.maxScore) {
          return NextResponse.json(
            { error: `Score for "${c.name}" cannot exceed its maximum of ${c.maxScore}` },
            { status: 400 }
          );
        }
      }
    }

    // Compute composite score: weighted normalized to 0-100.
    // Each criterion score is divided by its maxScore (normalizing to 0-1),
    // then multiplied by its weight, then scaled to 0-100.
    let compositeScore: number;

    if (criteria.length > 0) {
      const totalWeight = criteria.reduce((s, c) => s + c.weight, 0);
      if (totalWeight > 0) {
        let weighted = 0;
        for (const c of criteria) {
          const key = c.name.toLowerCase().replace(/\s+/g, "_");
          const raw = (scores as Record<string, number>)[key] ?? 0;
          weighted += (raw / c.maxScore) * c.weight;
        }
        compositeScore = (weighted / totalWeight) * 100;
      } else {
        // Zero total weight — fall back to simple average
        const scoreValues = Object.values(scores) as number[];
        compositeScore =
          scoreValues.reduce((sum, v) => sum + v, 0) / scoreValues.length;
      }
    } else {
      // No custom criteria — scores are already 1-100, use simple average
      const scoreValues = Object.values(scores) as number[];
      compositeScore =
        scoreValues.reduce((sum, v) => sum + v, 0) / scoreValues.length;
    }

    // Upsert judge evaluation
    const [existingEvaluation] = await db
      .select({ id: judgeEvaluations.id })
      .from(judgeEvaluations)
      .where(
        and(
          eq(judgeEvaluations.judgeId, dbUser.id),
          eq(judgeEvaluations.submissionId, submissionId)
        )
      );

    let evaluation;

    if (existingEvaluation) {
      // Update existing
      [evaluation] = await db
        .update(judgeEvaluations)
        .set({
          scores,
          compositeScore,
          comments: comments ?? null,
          overrideAi: overrideAi ?? false,
          updatedAt: new Date(),
        })
        .where(eq(judgeEvaluations.id, existingEvaluation.id))
        .returning();
    } else {
      // Insert new
      [evaluation] = await db
        .insert(judgeEvaluations)
        .values({
          judgeId: dbUser.id,
          submissionId,
          scores,
          compositeScore,
          comments: comments ?? null,
          overrideAi: overrideAi ?? false,
        })
        .returning();
    }

    // Update submission: set humanScore and finalScore (100% human judging).
    // finalScore drives the leaderboard — set it immediately so rankings
    // appear as soon as any judge scores, not only after "Announce Winners".
    const laterStatuses = ["finalist", "winner"];
    if (!laterStatuses.includes(submission.status)) {
      await db
        .update(submissions)
        .set({
          status: "judged",
          humanScore: compositeScore,
          finalScore: compositeScore,
          updatedAt: new Date(),
        })
        .where(eq(submissions.id, submissionId));
    } else {
      // For finalists/winners, keep the status but still update scores
      await db
        .update(submissions)
        .set({
          humanScore: compositeScore,
          finalScore: compositeScore,
          updatedAt: new Date(),
        })
        .where(eq(submissions.id, submissionId));
    }

    // Trigger real-time events
    try {
      const judgeName = [dbUser.firstName, dbUser.lastName].filter(Boolean).join(" ") || "A judge";

      // Get team name for the submission
      const [teamRow] = await db
        .select({ name: teams.name })
        .from(teams)
        .innerJoin(submissions, eq(submissions.teamId, teams.id))
        .where(eq(submissions.id, submissionId));

      const teamName = teamRow?.name ?? "Unknown Team";

      // Notify competition channel
      triggerEvent(channels.competition(submission.competitionId), EVENTS.JUDGE_EVALUATION_COMPLETE, {
        competitionId: submission.competitionId,
        submissionId,
        judgeName,
        teamName,
      });

      // Notify organizer channel
      const [org] = await db
        .select({ id: organizations.id })
        .from(organizations)
        .innerJoin(competitions, eq(competitions.organizationId, organizations.id))
        .where(eq(competitions.id, submission.competitionId));
      if (org) {
        triggerEvent(channels.organizer(org.id), EVENTS.ORG_JUDGE_SCORED, {
          competitionId: submission.competitionId,
          submissionId,
          judgeName,
          teamName,
        });
      }

      // Notify the participant who submitted
      const [submitter] = await db
        .select({ submittedBy: submissions.submittedBy })
        .from(submissions)
        .where(eq(submissions.id, submissionId));
      if (submitter) {
        triggerEvent(channels.participant(submitter.submittedBy!), EVENTS.PARTICIPANT_SUBMISSION_STATUS, {
          competitionId: submission.competitionId,
          submissionId,
          status: "judged",
          title: teamName,
        });
      }
    } catch (pusherErr) {
      console.error("Judge evaluate: Pusher notification failed:", pusherErr);
    }

    return NextResponse.json({ success: true, evaluation });
  } catch (error) {
    console.error("POST /api/judge/evaluate error:", error);
    return apiError(error, "Failed to evaluate submission");
  }
}
