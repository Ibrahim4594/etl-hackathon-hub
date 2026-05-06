import { serverAuth } from "@/lib/auth/server-auth";
import { db } from "@/lib/db";
import {
  users,
  submissions,
  judgeAssignments,
  judgeEvaluations,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";
import { createNotification } from "@/lib/services/notification";

/**
 * POST /api/submissions/[id]/assign
 * Assign a judge to review a specific submission.
 *
 * @auth Required (Clerk session, role: sponsor or admin)
 * @body { judgeId: string }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: submissionId } = await params;
    const { userId: clerkId } = await serverAuth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [dbUser] = await db.select().from(users).where(eq(users.clerkId, clerkId));
    if (!dbUser || (dbUser.role !== "sponsor" && dbUser.role !== "admin")) {
      return NextResponse.json({ error: "Only organizers or admins can assign judges" }, { status: 403 });
    }

    const body = await req.json();
    const { judgeId } = body as { judgeId?: string };
    if (!judgeId) return NextResponse.json({ error: "judgeId is required" }, { status: 400 });

    // Fetch submission to get the competition
    const [submission] = await db
      .select({ id: submissions.id, competitionId: submissions.competitionId, title: submissions.title })
      .from(submissions)
      .where(eq(submissions.id, submissionId));

    if (!submission) return NextResponse.json({ error: "Submission not found" }, { status: 404 });

    // Verify the judge is actually assigned to this competition
    const [judgeAssignment] = await db
      .select({ id: judgeAssignments.id })
      .from(judgeAssignments)
      .where(
        and(
          eq(judgeAssignments.judgeId, judgeId),
          eq(judgeAssignments.competitionId, submission.competitionId)
        )
      );

    if (!judgeAssignment) {
      return NextResponse.json(
        { error: "This judge is not assigned to the competition. Invite them first." },
        { status: 400 }
      );
    }

    // Insert evaluation row — the row existing means the judge is assigned to this submission.
    // onConflictDoNothing prevents duplicate errors on repeat clicks.
    await db
      .insert(judgeEvaluations)
      .values({ judgeId, submissionId })
      .onConflictDoNothing();

    // Notify the judge
    try {
      await createNotification({
        userId: judgeId,
        type: "judge_assigned",
        title: "New Submission Assigned",
        message: `You have been assigned to review "${submission.title}".`,
        link: `/judge/evaluate/${submissionId}`,
      });
    } catch {
      // Non-fatal — don't block on notification failure
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, "Failed to assign submission");
  }
}

/**
 * DELETE /api/submissions/[id]/assign?judgeId=xxx
 * Remove a judge's assignment from a specific submission.
 *
 * @auth Required (Clerk session, role: sponsor or admin)
 * @query judgeId
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: submissionId } = await params;
    const { userId: clerkId } = await serverAuth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [dbUser] = await db.select().from(users).where(eq(users.clerkId, clerkId));
    if (!dbUser || (dbUser.role !== "sponsor" && dbUser.role !== "admin")) {
      return NextResponse.json({ error: "Only organizers or admins can unassign judges" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const judgeId = searchParams.get("judgeId");
    if (!judgeId) return NextResponse.json({ error: "judgeId query param is required" }, { status: 400 });

    await db
      .delete(judgeEvaluations)
      .where(
        and(
          eq(judgeEvaluations.submissionId, submissionId),
          eq(judgeEvaluations.judgeId, judgeId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, "Failed to unassign submission");
  }
}
