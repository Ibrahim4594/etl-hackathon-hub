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

/**
 * POST /api/judge/evaluate
 * Submit or update a judge's evaluation for a submission (scores 1-10 per criterion).
 *
 * @auth Required (Clerk session, role: judge, must be assigned to competition)
 * @body { submissionId, scores: { innovation, technical, impact, design }, comments?, overrideAi? }
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

    const { innovation, technical, impact, design } = scores;
    if (
      typeof innovation !== "number" ||
      typeof technical !== "number" ||
      typeof impact !== "number" ||
      typeof design !== "number"
    ) {
      return NextResponse.json(
        { error: "All scores must be numbers" },
        { status: 400 }
      );
    }

    if (
      [innovation, technical, impact, design].some(
        (s) => s < 1 || s > 10
      )
    ) {
      return NextResponse.json(
        { error: "All scores must be between 1 and 10" },
        { status: 400 }
      );
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

    // Compute composite score (average of 4 scores)
    const compositeScore =
      (innovation + technical + impact + design) / 4;

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
          scores: { innovation, technical, impact, design },
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
          scores: { innovation, technical, impact, design },
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
        triggerEvent(channels.participant(submitter.submittedBy), EVENTS.PARTICIPANT_SUBMISSION_STATUS, {
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to evaluate submission" },
      { status: 500 }
    );
  }
}
