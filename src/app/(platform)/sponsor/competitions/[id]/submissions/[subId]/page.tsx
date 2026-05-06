import { serverAuth } from "@/lib/auth/server-auth";
import { db } from "@/lib/db";
import {
  submissions,
  teams,
  teamMembers,
  competitions,
  users,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import { resolveOnboardingUser } from "@/lib/auth/resolve-onboarding-user";
import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Github,
  Video,
  Globe,
  FileText,
  ExternalLink,
  Users as UsersIcon,
  Calendar,
  Star,
  Trophy,
  Zap,
} from "lucide-react";
import Link from "next/link";
import {
  SUBMISSION_STATUS_COLORS,
  getSubmissionStatusLabel,
} from "@/lib/constants/status-colors";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-PK", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(date));
}

export default async function SponsorSubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string; subId: string }>;
}) {
  const { id: competitionId, subId } = await params;
  const { userId: clerkId } = await serverAuth();
  if (!clerkId) redirect("/sign-in");

  const dbUser = await resolveOnboardingUser(clerkId);
  if (!dbUser || !dbUser.onboardingComplete) redirect("/onboarding");
  if (dbUser.role !== "sponsor" && dbUser.role !== "admin") {
    redirect(dbUser.role ? `/${dbUser.role}/dashboard` : "/onboarding");
  }

  // Verify competition ownership
  const [competition] = await db
    .select({
      id: competitions.id,
      title: competitions.title,
      createdBy: competitions.createdBy,
    })
    .from(competitions)
    .where(eq(competitions.id, competitionId));

  if (!competition) notFound();
  if (dbUser.role === "sponsor" && competition.createdBy !== dbUser.id) {
    redirect("/organizer/competitions");
  }

  // Fetch submission with team info
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
      status: submissions.status,
      aiScore: submissions.aiScore,
      humanScore: submissions.humanScore,
      finalScore: submissions.finalScore,
      rank: submissions.rank,
      createdAt: submissions.createdAt,
      teamId: teams.id,
      teamName: teams.name,
    })
    .from(submissions)
    .innerJoin(teams, eq(submissions.teamId, teams.id))
    .where(
      and(
        eq(submissions.id, subId),
        eq(submissions.competitionId, competitionId),
      ),
    );

  if (!submission) notFound();

  // Fetch team members
  const members = await db
    .select({
      userId: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      role: teamMembers.role,
    })
    .from(teamMembers)
    .innerJoin(users, eq(teamMembers.userId, users.id))
    .where(eq(teamMembers.teamId, submission.teamId));

  const techStack = (submission.techStack as string[] | null) ?? [];
  const hasScores =
    submission.aiScore !== null ||
    submission.humanScore !== null ||
    submission.finalScore !== null;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Link href={`/organizer/competitions/${competitionId}/submissions`}>
          <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Go back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <PageHeader
          title={submission.title}
          description={competition.title}
        />
      </div>

      {/* Status badge */}
      <div>
        <Badge
          variant="outline"
          className={`text-sm font-semibold ${SUBMISSION_STATUS_COLORS[submission.status] ?? ""}`}
        >
          {getSubmissionStatusLabel(submission.status)}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
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

          {/* Project Links */}
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
                  <span className="min-w-0 truncate flex-1">{submission.githubUrl}</span>
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
                  <span className="min-w-0 truncate flex-1">{submission.videoUrl}</span>
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
                  <span className="min-w-0 truncate flex-1">{submission.deployedUrl}</span>
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
                  <span className="min-w-0 truncate flex-1">{submission.pitchDeckUrl}</span>
                  <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                </a>
              )}
              {!submission.githubUrl &&
                !submission.videoUrl &&
                !submission.deployedUrl &&
                !submission.pitchDeckUrl && (
                  <p className="text-sm text-muted-foreground py-2">No links provided.</p>
                )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Team & submission info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Trophy className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Competition</p>
                  <p className="text-sm font-medium">{competition.title}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <UsersIcon className="h-4 w-4 text-muted-foreground shrink-0" />
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
            </CardContent>
          </Card>

          {/* Team Members */}
          {members.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <UsersIcon className="h-5 w-5" />
                  Team Members
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {members.map((m) => (
                  <div key={m.userId} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {[m.firstName, m.lastName].filter(Boolean).join(" ") || "—"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                    </div>
                    {m.role === "lead" && (
                      <Badge variant="outline" className="shrink-0 text-[10px]">Lead</Badge>
                    )}
                  </div>
                ))}
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
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Zap className="h-3.5 w-3.5" />
                        AI Score
                      </span>
                      <span className="text-sm font-semibold">
                        {Number(submission.aiScore).toFixed(1)}
                      </span>
                    </div>
                  )}
                  {submission.humanScore !== null && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Human Score</span>
                      <span className="text-sm font-semibold">
                        {Number(submission.humanScore).toFixed(1)}
                      </span>
                    </div>
                  )}
                  {(submission.aiScore !== null || submission.humanScore !== null) &&
                    submission.finalScore !== null && <Separator />}
                  {submission.finalScore !== null && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Final Score</span>
                      <span className="text-lg font-bold text-primary">
                        {Number(submission.finalScore).toFixed(1)}
                      </span>
                    </div>
                  )}
                  {submission.rank !== null && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-sm text-muted-foreground">Rank</span>
                      <Badge variant="default">#{submission.rank}</Badge>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-2">
                  Scores will appear once this submission has been evaluated.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
