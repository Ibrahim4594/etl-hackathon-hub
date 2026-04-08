import { NextRequest, NextResponse } from "next/server";
import { serverAuth } from "@/lib/auth/server-auth";
import { db } from "@/lib/db";
import {
  users,
  submissions,
  competitions,
  organizations,
  judgeAssignments,
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
