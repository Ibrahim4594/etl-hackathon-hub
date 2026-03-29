import { serverAuth } from "@/lib/auth/server-auth";
import { db } from "@/lib/db";
import {
  teams,
  teamMembers,
  competitions,
  submissions,
  submissionValidations,
  aiEvaluations,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import { resolveOnboardingUser } from "@/lib/auth/resolve-onboarding-user";
import { PageHeader } from "@/components/shared/page-header";
import { StatusTracker } from "@/components/submissions/status-tracker";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Github,
  Video,
  Globe,
  FileText,
  ExternalLink,
  Trophy,
  Users,
  Calendar,
  Star,
  ImageIcon,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Zap,
  Brain,
} from "lucide-react";
import Link from "next/link";

type SubmissionStatus =
  | "submitted"
  | "validating"
  | "valid"
  | "invalid"
  | "flagged"
  | "ai_evaluated"
  | "judged"
  | "finalist"
  | "winner";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-PK", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(date));
}

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId: clerkId } = await serverAuth();
  if (!clerkId) redirect("/sign-in");

  const dbUser = await resolveOnboardingUser(clerkId);
  if (!dbUser || !dbUser.onboardingComplete) redirect("/onboarding");

  // Get submission with related data
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
      competitionId: competitions.id,
      competitionTitle: competitions.title,
      competitionSlug: competitions.slug,
    })
    .from(submissions)
    .innerJoin(teams, eq(submissions.teamId, teams.id))
    .innerJoin(competitions, eq(submissions.competitionId, competitions.id))
    .where(eq(submissions.id, id));

  if (!submission) notFound();

  // Verify access: team member, competition owner, judge, or admin
  const isAdmin = dbUser.role === "admin";
  const isJudge = dbUser.role === "judge";
  const isOwner =
    dbUser.role === "sponsor" &&
    (await db
      .select({ id: competitions.id })
      .from(competitions)
      .where(
        and(
          eq(competitions.id, submission.competitionId),
          eq(competitions.createdBy, dbUser.id)
        )
      )
      .then((r) => r.length > 0));

  if (!isAdmin && !isJudge && !isOwner) {
    const [membership] = await db
      .select({ id: teamMembers.id })
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, submission.teamId),
          eq(teamMembers.userId, dbUser.id)
        )
      );
    if (!membership) notFound();
  }

  // Fetch validation results and AI evaluation
  const validations = await db
    .select()
    .from(submissionValidations)
    .where(eq(submissionValidations.submissionId, id));

  const [aiEval] = await db
    .select()
    .from(aiEvaluations)
    .where(eq(aiEvaluations.submissionId, id));

  const techStack = (submission.techStack as string[] | null) ?? [];
  const screenshots = (submission.screenshots as string[] | null) ?? [];
  const hasScores =
    submission.aiScore !== null ||
    submission.humanScore !== null ||
    submission.finalScore !== null;

  return (
    <div className="space-y-8">
      <PageHeader title={submission.title}>
        <Link href="/student/submissions"><Button variant="outline" size="sm">Back to Submissions</Button></Link>
      </PageHeader>

      {/* Status Tracker */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Submission Status</CardTitle>
          <CardDescription>
            Track your submission through the evaluation pipeline
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StatusTracker status={submission.status as SubmissionStatus} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Project Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Project Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">
                  Description
                </h4>
                <p className="text-sm whitespace-pre-wrap">
                  {submission.description}
                </p>
              </div>

              {techStack.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">
                    Tech Stack
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {techStack.map((tech) => (
                      <Badge key={tech} variant="secondary">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Links */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Project Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {submission.githubUrl && (
                <a
                  href={submission.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-muted"
                >
                  <Github className="h-5 w-5 shrink-0" />
                  <span className="min-w-0 truncate flex-1">
                    {submission.githubUrl}
                  </span>
                  <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                </a>
              )}
              {submission.videoUrl && (
                <a
                  href={submission.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-muted"
                >
                  <Video className="h-5 w-5 shrink-0" />
                  <span className="min-w-0 truncate flex-1">
                    {submission.videoUrl}
                  </span>
                  <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                </a>
              )}
              {submission.deployedUrl && (
                <a
                  href={submission.deployedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-muted"
                >
                  <Globe className="h-5 w-5 shrink-0" />
                  <span className="min-w-0 truncate flex-1">
                    {submission.deployedUrl}
                  </span>
                  <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                </a>
              )}
              {submission.pitchDeckUrl && (
                <a
                  href={submission.pitchDeckUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-muted"
                >
                  <FileText className="h-5 w-5 shrink-0" />
                  <span className="min-w-0 truncate flex-1">
                    {submission.pitchDeckUrl}
                  </span>
                  <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                </a>
              )}
              {!submission.githubUrl &&
                !submission.videoUrl &&
                !submission.deployedUrl &&
                !submission.pitchDeckUrl && (
                  <p className="text-sm text-muted-foreground py-2">
                    No links added yet.
                  </p>
                )}
            </CardContent>
          </Card>

          {/* Screenshots */}
          {screenshots.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Screenshots
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  {screenshots.map((url, index) => (
                    <a
                      key={index}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative block overflow-hidden rounded-lg border"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`Screenshot ${index + 1}`}
                        className="aspect-video w-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                        <ExternalLink className="h-5 w-5 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Competition & Team */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Trophy className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Competition</p>
                  <Link
                    href={`/competitions/${submission.competitionSlug}`}
                    className="text-sm font-medium hover:text-primary truncate block"
                  >
                    {submission.competitionTitle}
                  </Link>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Team</p>
                  <p className="text-sm font-medium">{submission.teamName}</p>
                </div>
              </div>

              <Separator />

              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Submitted</p>
                  <p className="text-sm">{formatDate(submission.createdAt)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Last Updated</p>
                  <p className="text-sm">{formatDate(submission.updatedAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Validation Results */}
          {validations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Validation Checks
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {validations.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-start gap-2.5 rounded-lg border border-border p-2.5"
                  >
                    {v.result === "pass" ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-green-500" />
                    ) : v.result === "fail" ? (
                      <XCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-yellow-500" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium capitalize">
                        {v.check.replace(/_/g, " ")}
                      </p>
                      {v.message && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {v.message}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* AI Evaluation */}
          {aiEval && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  AI Evaluation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {aiEval.summary && (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {aiEval.summary}
                  </p>
                )}

                {aiEval.scores && (
                  <div className="space-y-2.5">
                    {(
                      [
                        { key: "innovation", label: "Innovation", color: "bg-purple-500" },
                        { key: "technical", label: "Technical", color: "bg-blue-500" },
                        { key: "impact", label: "Impact", color: "bg-green-500" },
                        { key: "design", label: "Design", color: "bg-pink-500" },
                      ] as const
                    ).map(({ key, label, color }) => {
                      const score = aiEval.scores![key];
                      return (
                        <div key={key}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium">{label}</span>
                            <span className="text-xs font-semibold">{score.toFixed(1)}/10</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-muted">
                            <div
                              className={`h-full rounded-full ${color} transition-all`}
                              style={{ width: `${(score / 10) * 100}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {aiEval.compositeScore !== null && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium flex items-center gap-1.5">
                        <Zap className="h-3.5 w-3.5 text-primary" />
                        Composite
                      </span>
                      <span className="text-lg font-bold text-primary">
                        {aiEval.compositeScore.toFixed(1)}
                      </span>
                    </div>
                  </>
                )}

                {aiEval.flags && aiEval.flags.length > 0 && (
                  <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-2.5">
                    <p className="text-xs font-medium text-yellow-500 mb-1">Flags</p>
                    <ul className="space-y-0.5">
                      {aiEval.flags.map((flag, i) => (
                        <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1">
                          <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5 text-yellow-500" />
                          {flag}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Scores */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Star className="h-5 w-5" />
                Scores
              </CardTitle>
            </CardHeader>
            <CardContent>
              {hasScores ? (
                <div className="space-y-3">
                  {submission.aiScore !== null && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        AI Score
                      </span>
                      <span className="text-sm font-semibold">
                        {submission.aiScore.toFixed(1)}
                      </span>
                    </div>
                  )}
                  {submission.humanScore !== null && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Human Score
                      </span>
                      <span className="text-sm font-semibold">
                        {submission.humanScore.toFixed(1)}
                      </span>
                    </div>
                  )}
                  {(submission.aiScore !== null || submission.humanScore !== null) &&
                    submission.finalScore !== null && <Separator />}
                  {submission.finalScore !== null && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Final Score</span>
                      <span className="text-lg font-bold text-primary">
                        {submission.finalScore.toFixed(1)}
                      </span>
                    </div>
                  )}
                  {submission.rank !== null && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-sm text-muted-foreground">
                        Rank
                      </span>
                      <Badge variant="default">#{submission.rank}</Badge>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-2">
                  Scores will appear here once your submission has been
                  evaluated.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
