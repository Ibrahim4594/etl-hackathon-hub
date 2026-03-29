import { serverAuth } from "@/lib/auth/server-auth";
import { db } from "@/lib/db";
import {
  users,
  submissions,
  teams,
  competitions,
  aiEvaluations,
  judgeAssignments,
  judgeEvaluations,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SubmissionDetailPanel } from "@/components/judge/submission-detail-panel";
import { AiSummaryCard } from "@/components/judge/ai-summary-card";
import { ScoringPanel } from "@/components/judge/scoring-panel";
import { ArrowLeft } from "lucide-react";

export default async function EvaluateSubmissionPage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  const { submissionId } = await params;
  const { userId: clerkId } = await serverAuth();
  if (!clerkId) redirect("/sign-in");

  const [dbUser] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId));
  if (!dbUser || dbUser.role !== "judge") redirect("/onboarding");

  // Fetch submission with team and competition data
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
      createdAt: submissions.createdAt,
      teamId: teams.id,
      teamName: teams.name,
      competitionId: competitions.id,
      competitionTitle: competitions.title,
      competitionSlug: competitions.slug,
    })
    .from(submissions)
    .innerJoin(teams, eq(submissions.teamId, teams.id))
    .innerJoin(competitions, eq(submissions.competitionId, competitions.id))
    .where(eq(submissions.id, submissionId));

  if (!submission) notFound();

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

  if (!assignment) notFound();

  // Fetch competition judging criteria
  const [compData] = await db
    .select({ judgingCriteria: competitions.judgingCriteria })
    .from(competitions)
    .where(eq(competitions.id, submission.competitionId));

  const judgingCriteria = (compData?.judgingCriteria as { name: string; description: string; weight: number; maxScore: number }[] | null) ?? [];

  // Fetch AI evaluation data
  const [aiEvaluation] = await db
    .select()
    .from(aiEvaluations)
    .where(eq(aiEvaluations.submissionId, submissionId));

  // Fetch existing judge evaluation (if editing)
  const [existingEvaluation] = await db
    .select()
    .from(judgeEvaluations)
    .where(
      and(
        eq(judgeEvaluations.judgeId, dbUser.id),
        eq(judgeEvaluations.submissionId, submissionId)
      )
    );

  const techStack = (submission.techStack as string[] | null) ?? [];
  const screenshots = (submission.screenshots as string[] | null) ?? [];

  const statusColors: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
    submitted: "outline",
    validating: "secondary",
    valid: "secondary",
    invalid: "destructive",
    flagged: "destructive",
    ai_evaluated: "secondary",
    judged: "default",
    finalist: "default",
    winner: "default",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Evaluate Submission"
        description={submission.competitionTitle}
      >
        <div className="flex items-center gap-2">
          <Badge variant={statusColors[submission.status] ?? "outline"}>
            {submission.status.replace(/_/g, " ")}
          </Badge>
          <Link href="/judge/assignments">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
          </Link>
        </div>
      </PageHeader>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left column: Submission Details */}
        <div className="lg:col-span-3">
          <SubmissionDetailPanel
            title={submission.title}
            description={submission.description}
            techStack={techStack}
            githubUrl={submission.githubUrl}
            videoUrl={submission.videoUrl}
            deployedUrl={submission.deployedUrl}
            pitchDeckUrl={submission.pitchDeckUrl}
            screenshots={screenshots}
            teamName={submission.teamName}
            submittedAt={submission.createdAt}
          />
        </div>

        {/* Right column: AI Summary + Human Scoring */}
        <div className="space-y-6 lg:col-span-2">
          {/* AI Summary Card */}
          <AiSummaryCard
            summary={aiEvaluation?.summary ?? null}
            scores={
              (aiEvaluation?.scores as {
                innovation: number;
                technical: number;
                impact: number;
                design: number;
              } | null) ?? null
            }
            compositeScore={aiEvaluation?.compositeScore ?? null}
            flags={(aiEvaluation?.flags as string[] | null) ?? null}
            modelUsed={aiEvaluation?.modelUsed ?? null}
          />

          {/* Human Scoring Panel */}
          <ScoringPanel
            submissionId={submissionId}
            criteria={judgingCriteria.length > 0 ? judgingCriteria : undefined}
            existingScores={
              (existingEvaluation?.scores as Record<string, number> | null) ?? null
            }
            existingComments={existingEvaluation?.comments ?? null}
            existingOverrideAi={existingEvaluation?.overrideAi ?? false}
          />
        </div>
      </div>
    </div>
  );
}
