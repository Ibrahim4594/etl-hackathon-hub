import { serverAuth } from "@/lib/auth/server-auth";
import { db } from "@/lib/db";
import { teams, teamMembers, competitions, submissions } from "@/lib/db/schema";
import { eq, desc, and, sql, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { resolveOnboardingUser } from "@/lib/auth/resolve-onboarding-user";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { FileText, Trophy, Calendar, Zap, Users, Star, ArrowRight, Rocket } from "lucide-react";
import Link from "next/link";
import { SUBMISSION_STATUS_COLORS, formatStatus } from "@/lib/constants/status-colors";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-PK", { dateStyle: "medium" }).format(
    new Date(date)
  );
}

export default async function StudentSubmissionsPage() {
  const { userId: clerkId } = await serverAuth();
  if (!clerkId) redirect("/sign-in");

  const dbUser = await resolveOnboardingUser(clerkId);
  if (!dbUser || !dbUser.onboardingComplete) redirect("/onboarding");

  const mySubmissions = await db
    .select({
      submissionId: submissions.id,
      submissionTitle: submissions.title,
      status: submissions.status,
      aiScore: submissions.aiScore,
      humanScore: submissions.humanScore,
      finalScore: submissions.finalScore,
      rank: submissions.rank,
      createdAt: submissions.createdAt,
      teamName: teams.name,
      competitionTitle: competitions.title,
      competitionSlug: competitions.slug,
    })
    .from(submissions)
    .innerJoin(teams, eq(submissions.teamId, teams.id))
    .innerJoin(competitions, eq(submissions.competitionId, competitions.id))
    .innerJoin(teamMembers, eq(teamMembers.teamId, teams.id))
    .where(eq(teamMembers.userId, dbUser.id))
    .orderBy(desc(submissions.createdAt));

  // Find competitions where user is registered but has NOT submitted
  const submittedCompIds = mySubmissions.map((s) => s.competitionSlug).length > 0
    ? await db
        .select({ competitionId: submissions.competitionId })
        .from(submissions)
        .innerJoin(teams, eq(submissions.teamId, teams.id))
        .innerJoin(teamMembers, eq(teamMembers.teamId, teams.id))
        .where(eq(teamMembers.userId, dbUser.id))
    : [];

  const submittedCompIdSet = new Set(submittedCompIds.map((r) => r.competitionId));

  const registeredComps = await db
    .select({
      teamId: teams.id,
      teamName: teams.name,
      teamRole: teamMembers.role,
      competitionId: competitions.id,
      competitionTitle: competitions.title,
      competitionSlug: competitions.slug,
      competitionStatus: competitions.status,
      submissionEnd: competitions.submissionEnd,
    })
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .innerJoin(competitions, eq(teams.competitionId, competitions.id))
    .where(eq(teamMembers.userId, dbUser.id));

  const notSubmittedComps = registeredComps.filter(
    (r) =>
      !submittedCompIdSet.has(r.competitionId) &&
      r.competitionStatus === "active"
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">My Submissions</h1>
            <p className="text-sm text-muted-foreground">
              {mySubmissions.length} submission
              {mySubmissions.length !== 1 ? "s" : ""} across all competitions
            </p>
          </div>
        </div>
        <Link href="/competitions">
          <Button size="sm">Browse Competitions</Button>
        </Link>
      </div>

      {/* Registered but not submitted */}
      {notSubmittedComps.length > 0 && (
        <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Rocket className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-primary">
              Ready to Submit ({notSubmittedComps.length})
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            You&apos;re registered for {notSubmittedComps.length} competition
            {notSubmittedComps.length !== 1 ? "s" : ""} but haven&apos;t submitted yet.
          </p>
          <div className="space-y-2">
            {notSubmittedComps.map((c) => {
              const deadlinePassed = c.submissionEnd && new Date(c.submissionEnd) < new Date();
              const daysLeft = c.submissionEnd
                ? Math.ceil((new Date(c.submissionEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : null;

              return (
                <div
                  key={c.teamId}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/competitions/${c.competitionSlug}`}
                      className="text-sm font-medium hover:text-primary"
                    >
                      {c.competitionTitle}
                    </Link>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {c.teamName}
                      </span>
                      {daysLeft !== null && daysLeft >= 0 && (
                        <span className={`font-medium ${daysLeft <= 3 ? "text-red-400" : daysLeft <= 7 ? "text-yellow-400" : "text-green-400"}`}>
                          {daysLeft} day{daysLeft !== 1 ? "s" : ""} left
                        </span>
                      )}
                      {deadlinePassed && (
                        <span className="text-red-400 font-medium">Deadline passed</span>
                      )}
                    </div>
                  </div>
                  {c.teamRole === "lead" && !deadlinePassed ? (
                    <Link href={`/student/submissions/new/${c.competitionId}`}>
                      <Button size="sm" className="gap-1.5">
                        Submit <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  ) : c.teamRole !== "lead" ? (
                    <span className="text-xs text-muted-foreground">Team lead submits</span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {mySubmissions.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No submissions yet"
          description={
            notSubmittedComps.length > 0
              ? `You're registered for ${notSubmittedComps.length} competition${notSubmittedComps.length !== 1 ? "s" : ""}. Submit your project above!`
              : "Join a team and submit your project to a competition to get started."
          }
        >
          <Link href="/competitions">
            <Button>Browse Competitions</Button>
          </Link>
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {mySubmissions.map((s) => (
            <Link
              key={s.submissionId}
              href={`/student/submissions/${s.submissionId}`}
              className="group block rounded-xl border border-border bg-card shadow-md transition-all hover:border-primary/30 hover:shadow-lg"
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <h3 className="truncate font-semibold transition-colors group-hover:text-primary">
                        {s.submissionTitle}
                      </h3>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Trophy className="h-3 w-3" />
                        {s.competitionTitle}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {s.teamName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(s.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Status + scores */}
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                        SUBMISSION_STATUS_COLORS[s.status] ??
                        "border-border bg-muted text-muted-foreground"
                      }`}
                    >
                      {formatStatus(s.status)}
                    </span>

                    {(s.aiScore !== null ||
                      s.humanScore !== null ||
                      s.finalScore !== null) && (
                      <div className="flex items-center gap-2 text-xs">
                        {s.aiScore !== null && (
                          <span className="flex items-center gap-0.5 text-muted-foreground">
                            <Zap className="h-3 w-3" />
                            {s.aiScore.toFixed(1)}
                          </span>
                        )}
                        {s.humanScore !== null && (
                          <span className="flex items-center gap-0.5 text-muted-foreground">
                            <Star className="h-3 w-3" />
                            {s.humanScore.toFixed(1)}
                          </span>
                        )}
                        {s.finalScore !== null && (
                          <span className="flex items-center gap-0.5 font-semibold text-primary">
                            <Star className="h-3 w-3" />
                            {s.finalScore.toFixed(1)}
                          </span>
                        )}
                        {s.rank !== null && (
                          <span className="rounded bg-yellow-500/10 px-1.5 py-0.5 font-bold text-yellow-400">
                            #{s.rank}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
