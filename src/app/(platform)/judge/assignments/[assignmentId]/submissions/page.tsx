import { serverAuth } from "@/lib/auth/server-auth";
import { db } from "@/lib/db";
import {
  judgeAssignments,
  competitions,
  organizations,
  submissions,
  teams,
  judgeEvaluations,
} from "@/lib/db/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import { resolveOnboardingUser } from "@/lib/auth/resolve-onboarding-user";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, FileText, CheckCircle2, Clock, ArrowRight } from "lucide-react";
import { SUBMISSION_STATUS_COLORS, getSubmissionStatusLabel } from "@/lib/constants/status-colors";

export default async function AssignmentSubmissionsPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const { assignmentId } = await params;
  const { userId: clerkId } = await serverAuth();
  if (!clerkId) redirect("/sign-in");

  const dbUser = await resolveOnboardingUser(clerkId);
  if (!dbUser || !dbUser.onboardingComplete) redirect("/onboarding");
  if (dbUser.role !== "judge" && dbUser.role !== "admin") redirect("/onboarding");

  // Fetch the assignment
  const [assignment] = await db
    .select({
      assignmentId: judgeAssignments.id,
      judgeId: judgeAssignments.judgeId,
      competitionId: competitions.id,
      competitionTitle: competitions.title,
      competitionSlug: competitions.slug,
      orgName: organizations.name,
    })
    .from(judgeAssignments)
    .innerJoin(competitions, eq(judgeAssignments.competitionId, competitions.id))
    .innerJoin(organizations, eq(competitions.organizationId, organizations.id))
    .where(eq(judgeAssignments.id, assignmentId));

  if (!assignment) notFound();
  if (assignment.judgeId !== dbUser.id && dbUser.role !== "admin") redirect("/judge/assignments");

  // Fetch all submissions for this competition
  const allSubmissions = await db
    .select({
      id: submissions.id,
      title: submissions.title,
      description: submissions.description,
      status: submissions.status,
      aiScore: submissions.aiScore,
      humanScore: submissions.humanScore,
      finalScore: submissions.finalScore,
      createdAt: submissions.createdAt,
      teamName: teams.name,
    })
    .from(submissions)
    .innerJoin(teams, eq(submissions.teamId, teams.id))
    .where(eq(submissions.competitionId, assignment.competitionId));

  // Fetch this judge's evaluations to determine which submissions are assigned to them
  const myEvaluations = await db
    .select({ submissionId: judgeEvaluations.submissionId })
    .from(judgeEvaluations)
    .where(eq(judgeEvaluations.judgeId, dbUser.id));

  const evaluatedIds = new Set(myEvaluations.map((e) => e.submissionId));

  // Fetch only scored evaluations (compositeScore IS NOT NULL) for badge display
  const scoredEvaluations = await db
    .select({ submissionId: judgeEvaluations.submissionId })
    .from(judgeEvaluations)
    .where(
      and(
        eq(judgeEvaluations.judgeId, dbUser.id),
        isNotNull(judgeEvaluations.compositeScore)
      )
    );

  const scoredIds = new Set(scoredEvaluations.map((e) => e.submissionId));

  // Only show submissions specifically assigned to this judge
  const assignedSubmissions = allSubmissions.filter((sub) => evaluatedIds.has(sub.id));

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Link href="/judge/assignments">
          <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Go back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <PageHeader
          title="Assigned Submissions"
          description={`${assignment.competitionTitle} · ${assignment.orgName}`}
        />
      </div>

      {assignedSubmissions.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No submissions assigned"
          description="No submissions have been assigned to you for this competition yet. Contact the organizer if you believe this is an error."
        />
      ) : (
        <div className="space-y-3">
          {assignedSubmissions.map((sub) => {
            const evaluated = scoredIds.has(sub.id);
            return (
              <Card key={sub.id} className="border-border/50">
                <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Link
                          href={`/judge/evaluate/${sub.id}`}
                          className="font-medium truncate hover:text-primary transition-colors"
                        >
                          {sub.title}
                        </Link>
                      <Badge
                        variant="outline"
                        className={`shrink-0 text-[10px] font-semibold ${SUBMISSION_STATUS_COLORS[sub.status] ?? ""}`}
                      >
                        {getSubmissionStatusLabel(sub.status)}
                      </Badge>
                      {evaluated ? (
                        <Badge className="shrink-0 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Evaluated
                        </Badge>
                      ) : (
                        <Badge className="shrink-0 bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">
                          <Clock className="mr-1 h-3 w-3" />
                          Pending
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Team: <span className="font-medium text-foreground">{sub.teamName}</span>
                      {sub.humanScore !== null && (
                        <span className="ml-3">Score: <span className="font-medium text-foreground">{Number(sub.humanScore).toFixed(1)}</span></span>
                      )}
                    </p>
                  </div>
                  <Link href={`/judge/evaluate/${sub.id}`}>
                    <Button size="sm" variant={evaluated ? "outline" : "default"}>
                      {evaluated ? "Re-evaluate" : "Evaluate"}
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
