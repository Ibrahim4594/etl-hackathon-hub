import { NextRequest, NextResponse } from "next/server";
import { serverAuth } from "@/lib/auth/server-auth";
import { db } from "@/lib/db";
import {
  users,
  submissions,
  competitions,
  organizations,
  judgeAssignments,
  judgeEvaluations,
  teams,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { createNotification } from "@/lib/services/notification";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId: clerkId } = await serverAuth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: submissionId } = await params;
    const { judgeId } = await req.json();

    if (!judgeId) {
      return NextResponse.json(
        { error: "judgeId is required" },
        { status: 400 },
      );
    }

    // Resolve the requesting user
    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkId));
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch the submission with competition + org info
    const [submission] = await db
      .select({
        id: submissions.id,
        title: submissions.title,
        competitionId: submissions.competitionId,
        competitionTitle: competitions.title,
        organizationId: competitions.organizationId,
        createdBy: competitions.createdBy,
        teamName: teams.name,
      })
      .from(submissions)
      .innerJoin(competitions, eq(submissions.competitionId, competitions.id))
      .innerJoin(teams, eq(submissions.teamId, teams.id))
      .where(eq(submissions.id, submissionId));

    if (!submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 },
      );
    }

    // Verify the requester is the competition organizer or admin
    if (submission.createdBy !== dbUser.id && dbUser.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify the judge is assigned to this competition
    const [assignment] = await db
      .select()
      .from(judgeAssignments)
      .where(
        and(
          eq(judgeAssignments.judgeId, judgeId),
          eq(judgeAssignments.competitionId, submission.competitionId),
        ),
      );

    if (!assignment) {
      return NextResponse.json(
        { error: "Judge is not assigned to this competition" },
        { status: 400 },
      );
    }

    // Create evaluation record so the judge can see this submission
    await db.insert(judgeEvaluations)
      .values({ judgeId, submissionId })
      .onConflictDoNothing();

    // Notify the judge
    await createNotification({
      userId: judgeId,
      type: "judge_assigned",
      title: "Submission assigned to you",
      message: `You have been assigned to review "${submission.title}" by ${submission.teamName} in ${submission.competitionTitle}.`,
      link: `/judge/evaluate/${submissionId}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Assign submission error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/submissions/[id]/assign
 * Unassign a judge from a submission (only if not yet scored).
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId: clerkId } = await serverAuth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: submissionId } = await params;
    const url = new URL(req.url);
    const judgeId = url.searchParams.get("judgeId");

    if (!judgeId) {
      return NextResponse.json({ error: "judgeId query param is required" }, { status: 400 });
    }

    const [dbUser] = await db.select().from(users).where(eq(users.clerkId, clerkId));
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Fetch submission to verify ownership
    const [submission] = await db
      .select({ competitionId: submissions.competitionId, createdBy: competitions.createdBy })
      .from(submissions)
      .innerJoin(competitions, eq(submissions.competitionId, competitions.id))
      .where(eq(submissions.id, submissionId));

    if (!submission) return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    if (submission.createdBy !== dbUser.id && dbUser.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only unassign if not yet scored
    const [evaluation] = await db
      .select({ id: judgeEvaluations.id, compositeScore: judgeEvaluations.compositeScore })
      .from(judgeEvaluations)
      .where(and(eq(judgeEvaluations.judgeId, judgeId), eq(judgeEvaluations.submissionId, submissionId)));

    if (!evaluation) {
      return NextResponse.json({ error: "Judge is not assigned to this submission" }, { status: 404 });
    }
    if (evaluation.compositeScore !== null) {
      return NextResponse.json({ error: "Cannot unassign — judge has already scored this submission" }, { status: 400 });
    }

    await db.delete(judgeEvaluations).where(
      and(eq(judgeEvaluations.judgeId, judgeId), eq(judgeEvaluations.submissionId, submissionId))
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unassign submission error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
