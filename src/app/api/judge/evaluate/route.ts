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

    // Check judging window
    const [comp] = await db
      .select({ judgingStart: competitions.judgingStart, judgingEnd: competitions.judgingEnd })
      .from(competitions)
      .where(eq(competitions.id, submission.competitionId));

    const now = new Date();
    if (comp?.judgingStart && now < new Date(comp.judgingStart)) {
      return NextResponse.json({ error: "Judging window has not opened yet" }, { status: 400 });
    }
    if (comp?.judgingEnd && now > new Date(comp.judgingEnd)) {
      return NextResponse.json({ error: "Judging window has closed" }, { status: 400 });
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

    // Compute composite score (average of all criteria scores)
    const scoreValues = Object.values(scores) as number[];
    const compositeScore =
      scoreValues.reduce((sum, v) => sum + v, 0) / scoreValues.length;

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

    // Update submission status to "judged" if not already at a later stage
    const laterStatuses = ["finalist", "winner"];
    if (!laterStatuses.includes(submission.status)) {
      await db
        .update(submissions)
        .set({
          status: "judged",
          humanScore: compositeScore,
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
