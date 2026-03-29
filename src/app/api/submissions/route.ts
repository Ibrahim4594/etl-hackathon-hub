import { serverAuth } from "@/lib/auth/server-auth";
import { db } from "@/lib/db";
import { users, teams, competitions, submissions, organizations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { submissionCreateSchema } from "@/lib/validators/submission";
import { triggerEvent } from "@/lib/services/pusher";
import { channels, EVENTS } from "@/lib/services/pusher-channels";
import type { SubmissionReceivedPayload } from "@/lib/services/pusher-channels";

/**
 * POST /api/submissions
 * Create a submission for a competition. Only the team lead can submit; one per team.
 *
 * @auth Required (Clerk session, role: student, must be team lead)
 * @body { competitionId, teamId, title, description, techStack, githubUrl?, videoUrl?, deployedUrl?, pitchDeckUrl?, screenshots?, customFieldResponses? }
 * @returns { success: true, submission: {...} } (201) or { error: string }
 */
export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await serverAuth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [dbUser] = await db.select().from(users).where(eq(users.clerkId, clerkId));
    if (!dbUser || dbUser.role !== "student") {
      return NextResponse.json({ error: "Only participants can submit" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = submissionCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { competitionId, teamId, title, description, techStack, githubUrl, videoUrl, deployedUrl, pitchDeckUrl, screenshots, customFieldResponses } = parsed.data;

    // Verify user is the team lead
    const [team] = await db
      .select()
      .from(teams)
      .where(and(eq(teams.id, teamId), eq(teams.competitionId, competitionId)));

    if (!team) {
      return NextResponse.json({ error: "Team not found for this competition" }, { status: 404 });
    }

    if (team.leadId !== dbUser.id) {
      return NextResponse.json({ error: "Only the team lead can submit" }, { status: 403 });
    }

    // Verify competition is active
    const [competition] = await db
      .select()
      .from(competitions)
      .where(eq(competitions.id, competitionId));

    if (!competition || competition.status !== "active") {
      return NextResponse.json({ error: "Competition is not active" }, { status: 400 });
    }

    // Check submission deadline hasn't passed
    if (competition.submissionEnd && new Date() > new Date(competition.submissionEnd)) {
      return NextResponse.json({ error: "Submission deadline has passed" }, { status: 400 });
    }

    // Validate required custom field responses
    const customFields = (competition.customSubmissionFields as { id: string; label: string; required: boolean }[] | null) ?? [];
    if (customFields.length > 0) {
      const responses = customFieldResponses ?? {};
      for (const field of customFields) {
        if (field.required && (responses[field.id] === undefined || responses[field.id] === "")) {
          return NextResponse.json(
            { error: `Custom field "${field.label}" is required` },
            { status: 400 }
          );
        }
      }
    }

    // Check team doesn't already have a submission
    const [existingSubmission] = await db
      .select({ id: submissions.id })
      .from(submissions)
      .where(and(eq(submissions.teamId, teamId), eq(submissions.competitionId, competitionId)));

    if (existingSubmission) {
      return NextResponse.json({ error: "Team already has a submission for this competition" }, { status: 409 });
    }

    // Create submission
    const [submission] = await db
      .insert(submissions)
      .values({
        competitionId,
        teamId,
        submittedBy: dbUser.id,
        title,
        description,
        techStack,
        githubUrl: githubUrl || null,
        videoUrl: videoUrl || null,
        deployedUrl: deployedUrl || null,
        pitchDeckUrl: pitchDeckUrl || null,
        screenshots: screenshots ?? [],
        customFieldResponses: customFieldResponses ?? null,
        status: "submitted",
      })
      .returning();

    // Trigger real-time events
    try {
      const submissionPayload: SubmissionReceivedPayload = {
        competitionId,
        submissionId: submission.id,
        teamName: team.name,
        title,
        timestamp: new Date().toISOString(),
      };

      // Notify the competition channel
      triggerEvent(channels.competition(competitionId), EVENTS.SUBMISSION_RECEIVED, submissionPayload);

      // Notify the organizer channel
      const [org] = await db
        .select({ id: organizations.id })
        .from(organizations)
        .innerJoin(competitions, eq(competitions.organizationId, organizations.id))
        .where(eq(competitions.id, competitionId));
      if (org) {
        triggerEvent(channels.organizer(org.id), EVENTS.ORG_SUBMISSION_RECEIVED, submissionPayload);
      }
    } catch (pusherErr) {
      console.error("Submission: Pusher notification failed:", pusherErr);
    }

    return NextResponse.json({ success: true, submission }, { status: 201 });
  } catch (error) {
    console.error("POST /api/submissions error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create submission" },
      { status: 500 }
    );
  }
}
