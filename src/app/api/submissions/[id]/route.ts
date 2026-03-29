import { serverAuth } from "@/lib/auth/server-auth";
import { db } from "@/lib/db";
import { users, teams, teamMembers, competitions, submissions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { submissionUpdateSchema } from "@/lib/validators/submission";
import { triggerEvent } from "@/lib/services/pusher";
import { channels, EVENTS } from "@/lib/services/pusher-channels";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId: clerkId } = await serverAuth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Look up DB user
    const [dbUser] = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.clerkId, clerkId));

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const [submission] = await db
      .select({
        id: submissions.id,
        title: submissions.title,
        description: submissions.description,
        techStack: submissions.techStack,
        githubUrl: submissions.githubUrl,
        videoUrl: submissions.videoUrl,
        deployedUrl: submissions.deployedUrl,
        pitchDeckUrl: submissions.pitchDeckUrl,
        coverImageUrl: submissions.coverImageUrl,
        screenshots: submissions.screenshots,
        status: submissions.status,
        aiScore: submissions.aiScore,
        humanScore: submissions.humanScore,
        finalScore: submissions.finalScore,
        rank: submissions.rank,
        createdAt: submissions.createdAt,
        updatedAt: submissions.updatedAt,
        teamId: teams.id,
        teamName: teams.name,
        teamLeadId: teams.leadId,
        competitionId: competitions.id,
        competitionTitle: competitions.title,
        competitionSlug: competitions.slug,
        competitionStatus: competitions.status,
        submissionEnd: competitions.submissionEnd,
      })
      .from(submissions)
      .innerJoin(teams, eq(submissions.teamId, teams.id))
      .innerJoin(competitions, eq(submissions.competitionId, competitions.id))
      .where(eq(submissions.id, id));

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    // Authorization: team members, judges, admins, or competition owner
    if (dbUser.role !== "admin" && dbUser.role !== "judge") {
      // Check if sponsor owns this competition
      let isOwner = false;
      if (dbUser.role === "sponsor") {
        const [comp] = await db
          .select({ createdBy: competitions.createdBy })
          .from(competitions)
          .where(eq(competitions.id, submission.competitionId));
        isOwner = comp?.createdBy === dbUser.id;
      }

      if (!isOwner) {
        const [membership] = await db
          .select({ userId: teamMembers.userId })
          .from(teamMembers)
          .where(
            and(
              eq(teamMembers.teamId, submission.teamId),
              eq(teamMembers.userId, dbUser.id)
            )
          );

        if (!membership) {
          return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }
      }
    }

    return NextResponse.json({ submission });
  } catch (error) {
    console.error("GET /api/submissions/[id] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch submission" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId: clerkId } = await serverAuth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [dbUser] = await db.select().from(users).where(eq(users.clerkId, clerkId));
    if (!dbUser || dbUser.role !== "student") {
      return NextResponse.json({ error: "Only participants can update submissions" }, { status: 403 });
    }

    // Get submission with team and competition info
    const [existing] = await db
      .select({
        id: submissions.id,
        teamId: submissions.teamId,
        competitionId: submissions.competitionId,
        teamLeadId: teams.leadId,
        submissionEnd: competitions.submissionEnd,
      })
      .from(submissions)
      .innerJoin(teams, eq(submissions.teamId, teams.id))
      .innerJoin(competitions, eq(submissions.competitionId, competitions.id))
      .where(eq(submissions.id, id));

    if (!existing) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    // Only team lead can update
    if (existing.teamLeadId !== dbUser.id) {
      return NextResponse.json({ error: "Only the team lead can update submissions" }, { status: 403 });
    }

    // Check deadline hasn't passed
    if (existing.submissionEnd && new Date() > new Date(existing.submissionEnd)) {
      return NextResponse.json({ error: "Submission deadline has passed" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = submissionUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    const { title, description, techStack, githubUrl, videoUrl, deployedUrl, pitchDeckUrl, screenshots } = parsed.data;

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (techStack !== undefined) updateData.techStack = techStack;
    if (githubUrl !== undefined) updateData.githubUrl = githubUrl || null;
    if (videoUrl !== undefined) updateData.videoUrl = videoUrl || null;
    if (deployedUrl !== undefined) updateData.deployedUrl = deployedUrl || null;
    if (pitchDeckUrl !== undefined) updateData.pitchDeckUrl = pitchDeckUrl || null;
    if (screenshots !== undefined) updateData.screenshots = screenshots;

    const [updated] = await db
      .update(submissions)
      .set(updateData)
      .where(eq(submissions.id, id))
      .returning();

    // Real-time: notify competition channel about update
    try {
      triggerEvent(channels.competition(existing.competitionId), EVENTS.SUBMISSION_RECEIVED, {
        competitionId: existing.competitionId,
        submissionId: id,
        teamName: "",
        title: updated.title,
        timestamp: new Date().toISOString(),
      });
    } catch (pusherErr) {
      console.error("Submission PATCH: Pusher notification failed:", pusherErr);
    }

    return NextResponse.json({ success: true, submission: updated });
  } catch (error) {
    console.error("PATCH /api/submissions/[id] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update submission" },
      { status: 500 }
    );
  }
}
