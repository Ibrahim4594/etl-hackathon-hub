import { serverAuth } from "@/lib/auth/server-auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  organizations,
  competitions,
  submissions,
  teams,
  teamMembers,
  judgeAssignments,
  judgeEvaluations,
} from "@/lib/db/schema";
import { eq, sql, count, avg, inArray, desc } from "drizzle-orm";
import { resolveOnboardingUser } from "@/lib/auth/resolve-onboarding-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  FileText,
  BarChart3,
  Trophy,
  Gavel,
  TrendingUp,
  Target,
  Star,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from "lucide-react";

export default async function SponsorAnalyticsPage() {
  const { userId } = await serverAuth();
  if (!userId) redirect("/sign-in");

  const dbUser = await resolveOnboardingUser(userId);
  if (!dbUser || !dbUser.onboardingComplete) redirect("/onboarding");
  if (dbUser.role !== "sponsor" && dbUser.role !== "admin") {
    redirect(dbUser.role ? `/${dbUser.role}/dashboard` : "/onboarding");
  }

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.ownerId, dbUser.id));

  if (!org) redirect("/onboarding/sponsor");

  // Fetch all sponsor competitions
  const sponsorCompetitions = await db
    .select()
    .from(competitions)
    .where(eq(competitions.organizationId, org.id))
    .orderBy(desc(competitions.createdAt));

  const competitionIds = sponsorCompetitions.map((c) => c.id);

  let totalParticipants = 0;
  let totalSubmissions = 0;
  let totalJudges = 0;
  let avgAiScore = 0;
  let avgHumanScore = 0;
  let avgFinalScore = 0;
  let totalPrizePool = 0;
  let statusBreakdown: Record<string, number> = {};
  let subStatusBreakdown: Record<string, number> = {};

  // Per-competition stats
  const perCompStats: {
    id: string;
    title: string;
    status: string;
    subs: number;
    participants: number;
    avgFinal: number;
    prize: number;
  }[] = [];

  totalPrizePool = sponsorCompetitions.reduce(
    (sum, c) => sum + (c.totalPrizePool ?? 0),
    0
  );

  // Competition status breakdown
  for (const c of sponsorCompetitions) {
    statusBreakdown[c.status] = (statusBreakdown[c.status] ?? 0) + 1;
  }

  if (competitionIds.length > 0) {
    // Total unique participants
    const [participantsResult] = await db
      .select({ count: sql<number>`count(distinct ${teamMembers.userId})` })
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(inArray(teams.competitionId, competitionIds));
    totalParticipants = participantsResult?.count ?? 0;

    // Total submissions
    const [submissionsResult] = await db
      .select({ count: count() })
      .from(submissions)
      .where(inArray(submissions.competitionId, competitionIds));
    totalSubmissions = submissionsResult?.count ?? 0;

    // Total judges
    const [judgesResult] = await db
      .select({ count: sql<number>`count(distinct ${judgeAssignments.judgeId})` })
      .from(judgeAssignments)
      .where(inArray(judgeAssignments.competitionId, competitionIds));
    totalJudges = judgesResult?.count ?? 0;

    // Average scores
    const [scoresResult] = await db
      .select({
        avgAi: avg(submissions.aiScore),
        avgHuman: avg(submissions.humanScore),
        avgFinal: avg(submissions.finalScore),
      })
      .from(submissions)
      .where(inArray(submissions.competitionId, competitionIds));
    avgAiScore = Number(scoresResult?.avgAi ?? 0);
    avgHumanScore = Number(scoresResult?.avgHuman ?? 0);
    avgFinalScore = Number(scoresResult?.avgFinal ?? 0);

    // Submission status breakdown
    const subStatusRows = await db
      .select({
        status: submissions.status,
        count: count(),
      })
      .from(submissions)
      .where(inArray(submissions.competitionId, competitionIds))
      .groupBy(submissions.status);
    for (const r of subStatusRows) {
      subStatusBreakdown[r.status] = r.count;
    }

    // Per-competition data
    const subsByComp = await db
      .select({
        competitionId: submissions.competitionId,
        count: count(),
        avgFinal: avg(submissions.finalScore),
      })
      .from(submissions)
      .where(inArray(submissions.competitionId, competitionIds))
      .groupBy(submissions.competitionId);
    const subMap: Record<string, { count: number; avgFinal: number }> = {};
    for (const r of subsByComp) {
      subMap[r.competitionId] = { count: r.count, avgFinal: Number(r.avgFinal ?? 0) };
    }

    const partsByComp = await db
      .select({
        competitionId: teams.competitionId,
        count: sql<number>`count(distinct ${teamMembers.userId})`,
      })
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(inArray(teams.competitionId, competitionIds))
      .groupBy(teams.competitionId);
    const partMap: Record<string, number> = {};
    for (const r of partsByComp) {
      partMap[r.competitionId] = r.count;
    }

    for (const c of sponsorCompetitions) {
      perCompStats.push({
        id: c.id,
        title: c.title,
        status: c.status,
        subs: subMap[c.id]?.count ?? 0,
        participants: partMap[c.id] ?? 0,
        avgFinal: subMap[c.id]?.avgFinal ?? 0,
        prize: c.totalPrizePool ?? 0,
      });
    }
  }

  const activeCount = statusBreakdown["active"] ?? 0;
  const completedCount = statusBreakdown["completed"] ?? 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="rounded-2xl border border-border/50 bg-gradient-to-b from-muted/40 to-muted/20 p-6 md:p-8">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 shadow-md">
              <BarChart3 className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
              <p className="text-sm text-muted-foreground">
                Performance metrics for {org.name}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Trophy, label: "Competitions", value: sponsorCompetitions.length, sub: `${activeCount} active` },
          { icon: Users, label: "Participants", value: totalParticipants, sub: "across all competitions" },
          { icon: FileText, label: "Submissions", value: totalSubmissions, sub: `${subStatusBreakdown["valid"] ?? 0} validated` },
          { icon: Gavel, label: "Judges", value: totalJudges, sub: "assigned" },
        ].map((kpi) => (
          <Card key={kpi.label} className="group border-border/50 shadow-sm transition-all hover:border-primary/30 hover:shadow-xl">
            <CardContent className="flex items-start gap-4 p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 shadow-sm transition-transform group-hover:scale-105">
                <kpi.icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{kpi.label}</p>
                <p className="mt-0.5 text-3xl font-bold tracking-tight">{kpi.value.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{kpi.sub}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Financial + Score Overview */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-500/5">
                <Sparkles className="h-4 w-4 text-emerald-400" />
              </div>
              Financial Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Prize Pool</p>
              <p className="text-2xl font-bold text-primary">
                PKR {totalPrizePool.toLocaleString()}
              </p>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Avg per Competition</span>
              <span className="font-semibold">
                PKR{" "}
                {sponsorCompetitions.length > 0
                  ? Math.round(totalPrizePool / sponsorCompetitions.length).toLocaleString()
                  : "0"}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Cost per Participant</span>
              <span className="font-semibold">
                PKR{" "}
                {totalParticipants > 0
                  ? Math.round(totalPrizePool / totalParticipants).toLocaleString()
                  : "—"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-500/5">
                <Star className="h-4 w-4 text-purple-400" />
              </div>
              Score Averages
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "AI Score", value: avgAiScore, color: "bg-purple-500" },
              { label: "Human Score", value: avgHumanScore, color: "bg-blue-500" },
              { label: "Final Score", value: avgFinalScore, color: "bg-primary" },
            ].map((s) => (
              <div key={s.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{s.label}</span>
                  <span className="font-semibold">{s.value > 0 ? s.value.toFixed(1) : "—"}</span>
                </div>
                <Progress value={s.value * 10} className="h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Submission Pipeline */}
      {totalSubmissions > 0 && (
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              Submission Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
              {(
                [
                  { key: "submitted", label: "Submitted", icon: Clock, color: "text-blue-400" },
                  { key: "validating", label: "Validating", icon: Clock, color: "text-amber-400" },
                  { key: "valid", label: "Valid", icon: CheckCircle2, color: "text-emerald-400" },
                  { key: "invalid", label: "Invalid", icon: AlertTriangle, color: "text-red-400" },
                  { key: "flagged", label: "Flagged", icon: AlertTriangle, color: "text-amber-500" },
                  { key: "ai_evaluated", label: "AI Scored", icon: Star, color: "text-purple-400" },
                  { key: "judged", label: "Judged", icon: Gavel, color: "text-blue-500" },
                  { key: "finalist", label: "Finalists", icon: Target, color: "text-primary" },
                  { key: "winner", label: "Winners", icon: Trophy, color: "text-amber-400" },
                ] as const
              ).map((stage) => {
                const val = subStatusBreakdown[stage.key] ?? 0;
                const Icon = stage.icon;
                return (
                  <div key={stage.key} className="flex flex-col items-center gap-1 text-center">
                    <Icon className={`h-4 w-4 ${stage.color}`} />
                    <p className="text-lg font-bold">{val}</p>
                    <p className="text-[10px] text-muted-foreground">{stage.label}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Per-Competition Breakdown */}
      {perCompStats.length > 0 && (
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-500/5">
                <Target className="h-4 w-4 text-blue-400" />
              </div>
              Competition Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {perCompStats.map((comp) => (
                <div
                  key={comp.id}
                  className="flex items-center gap-4 rounded-lg border border-border/30 bg-muted/20 p-3 transition-colors hover:bg-muted/40"
                >
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold">{comp.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {comp.status.replace(/_/g, " ")}
                    </p>
                  </div>
                  <div className="hidden items-center gap-6 text-xs sm:flex">
                    <div className="text-center">
                      <p className="font-semibold">{comp.participants}</p>
                      <p className="text-muted-foreground">Participants</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold">{comp.subs}</p>
                      <p className="text-muted-foreground">Submissions</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-primary">
                        {comp.avgFinal > 0 ? comp.avgFinal.toFixed(1) : "—"}
                      </p>
                      <p className="text-muted-foreground">Avg Score</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold">PKR {comp.prize.toLocaleString()}</p>
                      <p className="text-muted-foreground">Prize Pool</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
