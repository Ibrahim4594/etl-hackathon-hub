import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  users,
  judgeAssignments,
  judgeEvaluations,
  competitions,
  submissions,
  teams,
} from "@/lib/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { resolveOnboardingUser } from "@/lib/auth/resolve-onboarding-user";
import { serverAuth } from "@/lib/auth/server-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import {
  ClipboardList,
  CheckCircle,
  Clock,
  Gavel,
  ArrowRight,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { COMPETITION_STATUS_COLORS, formatStatus } from "@/lib/constants/status-colors";

export default async function JudgeDashboardPage() {
  const { userId } = await serverAuth();
  if (!userId) redirect("/sign-in");
  const dbUser = await resolveOnboardingUser(userId);
  if (!dbUser) redirect("/onboarding");
  if (dbUser.role !== "judge" && dbUser.role !== "admin") redirect("/");

  // Assigned competitions
  const assignedComps = await db
    .select({
      competitionId: judgeAssignments.competitionId,
      competitionTitle: competitions.title,
      competitionSlug: competitions.slug,
      competitionStatus: competitions.status,
    })
    .from(judgeAssignments)
    .innerJoin(
      competitions,
      eq(judgeAssignments.competitionId, competitions.id)
    )
    .where(eq(judgeAssignments.judgeId, dbUser.id))
    .orderBy(desc(competitions.createdAt));

  const compIds = assignedComps.map((c) => c.competitionId);

  // Count total submissions across assigned competitions
  let totalAssigned = 0;
  let totalScored = 0;

  if (compIds.length > 0) {
    const [{ count: subCount }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(submissions)
      .where(
        sql`${submissions.competitionId} IN (${sql.join(
          compIds.map((id) => sql`${id}`),
          sql`, `
        )})`
      );
    totalAssigned = Number(subCount);

    const [{ count: evalCount }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(judgeEvaluations)
      .where(eq(judgeEvaluations.judgeId, dbUser.id));
    totalScored = Number(evalCount);
  }

  const pendingCount = totalAssigned - totalScored;

  // Recent evaluations
  const recentEvals = compIds.length > 0
    ? await db
        .select({
          submissionId: judgeEvaluations.submissionId,
          submissionTitle: submissions.title,
          teamName: teams.name,
          competitionTitle: competitions.title,
          compositeScore: judgeEvaluations.compositeScore,
          scoredAt: judgeEvaluations.createdAt,
        })
        .from(judgeEvaluations)
        .innerJoin(submissions, eq(judgeEvaluations.submissionId, submissions.id))
        .innerJoin(teams, eq(submissions.teamId, teams.id))
        .innerJoin(competitions, eq(submissions.competitionId, competitions.id))
        .where(eq(judgeEvaluations.judgeId, dbUser.id))
        .orderBy(desc(judgeEvaluations.createdAt))
        .limit(5)
    : [];

  const name = [dbUser.firstName, dbUser.lastName].filter(Boolean).join(" ") || "Judge";

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {dbUser.firstName || "Judge"}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {pendingCount > 0
              ? `You have ${pendingCount} submission${pendingCount !== 1 ? "s" : ""} waiting for review.`
              : "All caught up — no pending reviews."}
          </p>
        </div>
        {pendingCount > 0 && (
          <Link href="/judge/evaluate">
            <Button className="gap-1.5 rounded-full btn-interact">
              Start Reviewing
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            title: "Assigned Competitions",
            value: assignedComps.length,
            icon: ClipboardList,
            gradient: "from-blue-500/20 to-blue-500/5",
            iconColor: "text-blue-500",
          },
          {
            title: "Pending Reviews",
            value: pendingCount,
            icon: Clock,
            gradient: "from-amber-500/20 to-amber-500/5",
            iconColor: "text-amber-500",
          },
          {
            title: "Completed Reviews",
            value: totalScored,
            icon: CheckCircle,
            gradient: "from-emerald-500/20 to-emerald-500/5",
            iconColor: "text-emerald-500",
          },
          {
            title: "Total Submissions",
            value: totalAssigned,
            icon: Gavel,
            gradient: "from-primary/20 to-primary/5",
            iconColor: "text-primary",
          },
        ].map(({ title, value, icon: Icon, gradient, iconColor }) => (
          <Card key={title} className="rounded-2xl border border-border/50 card-lift">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {title}
                  </p>
                  <p className="mt-1 text-3xl font-black">{value}</p>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} border border-border/10`}>
                  <Icon className={`h-6 w-6 ${iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress bar */}
      {totalAssigned > 0 && (
        <Card className="rounded-xl border border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm font-bold text-primary">
                {totalScored} / {totalAssigned} ({totalAssigned > 0 ? Math.round((totalScored / totalAssigned) * 100) : 0}%)
              </span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              {(() => {
                const progress = totalAssigned > 0 ? (totalScored / totalAssigned) * 100 : 0;
                return (
                  <div
                    className={`h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all ${progress > 0 && progress < 100 ? "shimmer" : ""}`}
                    style={{ width: `${progress}%` }}
                  />
                );
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Assigned Competitions */}
        <div className="lg:col-span-2">
          <Card className="rounded-xl border border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold">
                My Competitions
              </CardTitle>
              <Link href="/judge/assignments">
                <Button variant="ghost" size="sm" className="gap-1 text-xs text-primary">
                  View all <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {assignedComps.length === 0 ? (
                <EmptyState
                  icon={ClipboardList}
                  title="No assignments yet"
                  description="You'll be notified when assigned to judge a competition."
                />
              ) : (
                <div className="space-y-3">
                  {assignedComps.map((comp) => (
                    <Link
                      key={comp.competitionId}
                      href="/judge/evaluate"
                      className="group block rounded-xl border border-border/50 p-4 hover:border-primary/20 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold truncate group-hover:text-primary transition-colors">
                            {comp.competitionTitle}
                          </p>
                        </div>
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${COMPETITION_STATUS_COLORS[comp.competitionStatus] ?? "bg-muted text-muted-foreground border-border"}`}>
                          {formatStatus(comp.competitionStatus)}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Evaluations */}
        <div>
          <Card className="rounded-xl border border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold">
                Recent Scores
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentEvals.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No evaluations yet
                </p>
              ) : (
                <div className="space-y-3">
                  {recentEvals.map((ev) => (
                    <Link
                      key={ev.submissionId}
                      href={`/judge/evaluate/${ev.submissionId}`}
                      className="block rounded-lg border border-border/30 p-3 hover:bg-muted/30 transition-colors"
                    >
                      <p className="text-sm font-medium truncate">{ev.submissionTitle}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{ev.teamName}</p>
                      {ev.compositeScore !== null && (
                        <p className="flex items-center gap-1.5 text-xs font-bold text-primary mt-1">
                          <span className={`inline-block h-2 w-2 rounded-full ${ev.compositeScore >= 7 ? "bg-emerald-500" : ev.compositeScore >= 5 ? "bg-amber-500" : "bg-red-500"}`} />
                          Score: {ev.compositeScore.toFixed(1)}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Link
          href="/judge/evaluate"
          className="group flex items-center gap-3 rounded-xl border border-border/50 bg-card p-4 transition-all hover:border-primary/20 hover:shadow-md"
        >
          <Gavel className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          <span className="text-sm font-medium group-hover:text-primary transition-colors">
            Evaluate Submissions
          </span>
          <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
        </Link>
        <Link
          href="/judge/assignments"
          className="group flex items-center gap-3 rounded-xl border border-border/50 bg-card p-4 transition-all hover:border-primary/20 hover:shadow-md"
        >
          <ClipboardList className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          <span className="text-sm font-medium group-hover:text-primary transition-colors">
            My Assignments
          </span>
          <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
        </Link>
        <Link
          href="/competitions"
          className="group flex items-center gap-3 rounded-xl border border-border/50 bg-card p-4 transition-all hover:border-primary/20 hover:shadow-md"
        >
          <Trophy className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          <span className="text-sm font-medium group-hover:text-primary transition-colors">
            Browse Competitions
          </span>
          <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
        </Link>
      </div>
    </div>
  );
}
