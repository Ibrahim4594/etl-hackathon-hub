import { serverAuth } from "@/lib/auth/server-auth";
import { db } from "@/lib/db";
import { submissions, competitions, users, teams, organizations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { validateSubmission } from "@/lib/services/validation-engine";
import { triggerEvent } from "@/lib/services/pusher";
import { channels, EVENTS } from "@/lib/services/pusher-channels";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: submissionId } = await params;

    const { userId } = await serverAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Look up DB user by clerkId
    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, userId));

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch the submission
    const [submission] = await db
      .select()
      .from(submissions)
      .where(eq(submissions.id, submissionId));

    if (!submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    // Fetch the competition to check ownership
    const [competition] = await db
      .select()
      .from(competitions)
      .where(eq(competitions.id, submission.competitionId));

    if (!competition) {
      return NextResponse.json(
        { error: "Competition not found" },
        { status: 404 }
      );
    }

    // Auth: must be admin or the sponsor who created the competition
    const isAdmin = dbUser.role === "admin";
    const isCompetitionOwner =
      dbUser.role === "sponsor" && competition.createdBy === dbUser.id;

    if (!isAdmin && !isCompetitionOwner) {
      return NextResponse.json(
        { error: "Only admins or competition owners can trigger validation" },
        { status: 403 }
      );
    }

    const result = await validateSubmission(submissionId);

    // Fetch submission details for real-time events
    const [updatedSub] = await db
      .select({
        status: submissions.status,
        competitionId: submissions.competitionId,
        submittedBy: submissions.submittedBy,
        title: submissions.title,
        teamName: teams.name,
      })
      .from(submissions)
      .innerJoin(teams, eq(submissions.teamId, teams.id))
      .where(eq(submissions.id, submissionId));

    if (updatedSub) {
      const validationPayload = {
        competitionId: updatedSub.competitionId,
        submissionId,
        teamName: updatedSub.teamName,
        status: updatedSub.status as "valid" | "invalid" | "flagged",
        title: updatedSub.title ?? "Untitled",
      };

      // Notify competition channel
      triggerEvent(
        channels.competition(updatedSub.competitionId),
        EVENTS.SUBMISSION_VALIDATED,
        validationPayload
      );

      // Notify participant
      triggerEvent(
        channels.participant(updatedSub.submittedBy),
        EVENTS.PARTICIPANT_SUBMISSION_STATUS,
        {
          competitionId: updatedSub.competitionId,
          submissionId,
          status: updatedSub.status,
          title: updatedSub.title ?? "Untitled",
        }
      );

      // Notify organizer
      const [org] = await db
        .select({ id: organizations.id })
        .from(organizations)
        .innerJoin(competitions, eq(competitions.organizationId, organizations.id))
        .where(eq(competitions.id, updatedSub.competitionId));
      if (org) {
        triggerEvent(channels.organizer(org.id), EVENTS.ORG_SUBMISSION_RECEIVED, {
          competitionId: updatedSub.competitionId,
          submissionId,
          teamName: updatedSub.teamName,
          title: updatedSub.title ?? "Untitled",
          timestamp: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({ submissionId, validationResult: result });
  } catch (error) {
    console.error("Validation endpoint error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to validate submission" },
      { status: 500 }
    );
  }
}
