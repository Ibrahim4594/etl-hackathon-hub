import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  competitions,
  competitionSponsors,
  organizations,
  submissions,
  teams,
  teamMembers,
  judgeAssignments,
  judgeEvaluations,
} from "@/lib/db/schema";
import { resolveOnboardingUser } from "@/lib/auth/resolve-onboarding-user";
import { serverAuth } from "@/lib/auth/server-auth";
import { eq, and, inArray, desc, sql, or } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  Users,
  FileText,
  Plus,
  Eye,
  ClipboardList,
  Building2,
  ArrowRight,
  Gavel,
  Sparkles,
  BarChart3,
  Clock,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { PremiumStatCard } from "@/components/sponsor/premium-stat-card";
import { ActivityFeed } from "@/components/sponsor/activity-feed";
import { MilestoneWidget } from "@/components/sponsor/milestone-widget";
import { OrganizerRealtimeOverlay } from "@/components/realtime/organizer-realtime-overlay";
import { COMPETITION_STATUS_COLORS, formatStatus } from "@/lib/constants/status-colors";

const STATUS_GRADIENT: Record<string, string> = {
  draft: "from-zinc-500/20 to-zinc-500/5",
  pending_review: "from-amber-500/20 to-amber-500/5",
  approved: "from-blue-500/20 to-blue-500/5",
  active: "from-emerald-500/20 to-emerald-500/5",
  judging: "from-purple-500/20 to-purple-500/5",
  completed: "from-zinc-400/20 to-zinc-400/5",
  cancelled: "from-red-500/20 to-red-500/5",
};

export default async function SponsorDashboardPage() {
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

  if (!org) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 shadow-lg">
            <Building2 className="h-12 w-12 text-primary" />
          </div>
          <h2 className="mt-6 text-2xl font-bold">No organization found</h2>
          <p className="mt-2 text-muted-foreground">
            Complete your organizer onboarding to get started.
          </p>
        </div>
      </div>
    );
  }

  // ── Fetch all data in parallel ──
  const myCompetitions = await db
    .select()
    .from(competitions)
    .where(eq(competitions.organizationId, org.id))
    .orderBy(desc(competitions.createdAt));

  const compIds = myCompetitions.map((c) => c.id);

  let totalSubmissions = 0;
  let totalParticipants = 0;
  let totalJudges = 0;
  let topSubs: {
    title: string | null;
    teamName: string | null;
    compTitle: string;
    aiScore: number | null;
    createdAt: Date;
  }[] = [];

  if (compIds.length > 0) {
    const [subStats] = await db
      .select({ count: sql<number>`count(*)` })
      .from(submissions)
      .where(inArray(submissions.competitionId, compIds));
    totalSubmissions = Number(subStats?.count ?? 0);

    const [partStats] = await db
      .select({ count: sql<number>`count(distinct ${teamMembers.userId})` })
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(inArray(teams.competitionId, compIds));
    totalParticipants = Number(partStats?.count ?? 0);

    const [judgeStats] = await db
      .select({ count: sql<number>`count(distinct ${judgeAssignments.judgeId})` })
      .from(judgeAssignments)
      .where(inArray(judgeAssignments.competitionId, compIds));
    totalJudges = Number(judgeStats?.count ?? 0);

    // Top submissions
    const topSubRows = await db
      .select({
        title: submissions.title,
        teamName: teams.name,
        compTitle: competitions.title,
        aiScore: submissions.aiScore,
        createdAt: submissions.createdAt,
      })
      .from(submissions)
      .innerJoin(teams, eq(submissions.teamId, teams.id))
      .innerJoin(competitions, eq(submissions.competitionId, competitions.id))
      .where(inArray(submissions.competitionId, compIds))
      .orderBy(desc(submissions.aiScore))
      .limit(5);
    topSubs = topSubRows;
  }

  // Per-competition stats
  const compStatsMap = new Map<string, { subs: number; participants: number }>();
  if (compIds.length > 0) {
    const subCounts = await db
      .select({
        compId: submissions.competitionId,
        count: sql<number>`count(*)`,
      })
      .from(submissions)
      .where(inArray(submissions.competitionId, compIds))
      .groupBy(submissions.competitionId);

    const partCounts = await db
      .select({
        compId: teams.competitionId,
        count: sql<number>`count(distinct ${teamMembers.userId})`,
      })
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(inArray(teams.competitionId, compIds))
      .groupBy(teams.competitionId);

    for (const s of subCounts)
      compStatsMap.set(s.compId, { subs: Number(s.count), participants: 0 });
    for (const p of partCounts) {
      const existing = compStatsMap.get(p.compId) ?? { subs: 0, participants: 0 };
      existing.participants = Number(p.count);
      compStatsMap.set(p.compId, existing);
    }
  }

  const sponsorCountMap = new Map<string, number>();
  if (compIds.length > 0) {
    const sponsorCounts = await db
      .select({
        compId: competitionSponsors.competitionId,
        count: sql<number>`count(*)`,
      })
      .from(competitionSponsors)
      .where(inArray(competitionSponsors.competitionId, compIds))
      .groupBy(competitionSponsors.competitionId);

    for (const sc of sponsorCounts) {
      sponsorCountMap.set(sc.compId, Number(sc.count));
    }
  }

  const activeCount = myCompetitions.filter(
    (c) => c.status === "active" || c.status === "judging"
  ).length;
  const totalPrize = myCompetitions.reduce(
    (sum, c) => sum + (c.totalPrizePool ?? 0),
    0
  );

  // Build milestones from competition dates
  const now = new Date();
  const milestones: {
    id: string;
    label: string;
    competitionTitle: string;
    date: string;
    type: "registration" | "submission" | "judging" | "results";
  }[] = [];

  for (const comp of myCompetitions) {
    if (comp.registrationEnd)
      milestones.push({ id: `${comp.id}-reg`, label: "Registration closes", competitionTitle: comp.title, date: comp.registrationEnd.toISOString(), type: "registration" });
    if (comp.submissionEnd)
      milestones.push({ id: `${comp.id}-sub`, label: "Submission deadline", competitionTitle: comp.title, date: comp.submissionEnd.toISOString(), type: "submission" });
    if (comp.judgingStart)
      milestones.push({ id: `${comp.id}-jdg`, label: "Judging starts", competitionTitle: comp.title, date: comp.judgingStart.toISOString(), type: "judging" });
    if (comp.resultsDate)
      milestones.push({ id: `${comp.id}-res`, label: "Results announced", competitionTitle: comp.title, date: comp.resultsDate.toISOString(), type: "results" });
  }
  milestones.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const upcomingMilestones = milestones
    .filter((m) => new Date(m.date).getTime() > now.getTime() - 86400000)
    .slice(0, 6);

  // Build activity feed from recent submissions
  const activityItems: {
    id: string;
    type: "submission" | "registration" | "judge" | "status";
    message: string;
    timestamp: string;
  }[] = [];

  if (compIds.length > 0) {
    const recentSubs = await db
      .select({
        id: submissions.id,
        title: submissions.title,
        teamName: teams.name,
        compTitle: competitions.title,
        createdAt: submissions.createdAt,
      })
      .from(submissions)
      .innerJoin(teams, eq(submissions.teamId, teams.id))
      .innerJoin(competitions, eq(submissions.competitionId, competitions.id))
      .where(inArray(submissions.competitionId, compIds))
      .orderBy(desc(submissions.createdAt))
      .limit(8);

    for (const s of recentSubs) {
      activityItems.push({
        id: s.id,
        type: "submission",
        message: `${s.teamName} submitted "${s.title}" to ${s.compTitle}`,
        timestamp: s.createdAt.toISOString(),
      });
    }
  }

  const orgName = org.name;
  const verificationBadge =
    org.verification === "verified"
      ? { cls: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", label: "Verified", pulse: false }
      : { cls: "bg-amber-500/10 text-amber-500 border-amber-500/20", label: "Pending", pulse: true };

  return (
    <div className="space-y-10">
      {/* ══════════════ EXECUTIVE WELCOME BANNER ══════════════ */}
      <div className="relative overflow-hidden bg-gradient-to-b from-muted/40 to-muted/20 border border-border/50 rounded-2xl p-6 md:p-8">
        {/* Decorative orbs */}
        <div className="absolute -left-20 -top-20 h-48 w-48 rounded-full bg-primary/15 dark:bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute -right-16 -bottom-16 h-64 w-64 rounded-full bg-accent/15 dark:bg-accent/8 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-5">
            <div className="relative">
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/60 shadow-xl">
                {org.logoUrl ? (
                  <Image
                    src={org.logoUrl}
                    alt={orgName}
                    width={48}
                    height={48}
                    className="h-12 w-12 rounded-xl object-cover"
                  />
                ) : (
                  <Building2 className="h-8 w-8 text-primary-foreground" />
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold md:text-3xl">
                  Welcome back,{" "}
                  <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    {orgName}
                  </span>
                </h1>
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${verificationBadge.cls}`}
                >
                  {verificationBadge.pulse && (
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                    </span>
                  )}
                  {verificationBadge.label}
                </span>
              </div>
              <p className="mt-1 text-muted-foreground">
                {totalParticipants > 0
                  ? `Your competitions have reached ${totalParticipants.toLocaleString()}+ participants`
                  : "Create your first competition to start discovering top talent"}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Link href="/sponsor/competitions/new">
              <Button className="gap-1.5 shadow-sm transition-all hover:scale-105 hover:shadow-md">
                <Sparkles className="h-4 w-4" />
                Create Competition
              </Button>
            </Link>
            <Link href="/sponsor/analytics">
              <Button variant="outline" className="gap-1.5">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ══════════════ REAL-TIME OVERLAY ══════════════ */}
      <OrganizerRealtimeOverlay orgId={org.id} userId={dbUser.id} />

      {/* ══════════════ REAL-TIME STATS ROW ══════════════ */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PremiumStatCard
          title="Active Competitions"
          value={activeCount}
          icon="trophy"
        />
        <PremiumStatCard
          title="Total Submissions"
          value={totalSubmissions}
          icon="fileText"
        />
        <PremiumStatCard
          title="Total Participants"
          value={totalParticipants}
          icon="users"
        />
        <PremiumStatCard
          title="Total Prize Pool"
          value={totalPrize}
          prefix="PKR "
          icon="dollarSign"
        />
      </div>

      {/* ══════════════ COMPETITIONS + SIDEBAR ══════════════ */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Competitions */}
        <div className="space-y-6 lg:col-span-2">
          {/* My Competitions */}
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
                  <Trophy className="h-4 w-4 text-primary" />
                </div>
                My Competitions
              </CardTitle>
              <Link href="/sponsor/competitions">
                <Button variant="ghost" size="sm" className="gap-1 text-xs">
                  View All <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Create new card */}
              <Link href="/sponsor/competitions/new">
                <div className="flex items-center gap-4 rounded-xl border-2 border-dashed border-primary/20 p-4 transition-all hover:border-primary/40 hover:bg-primary/5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <Plus className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-primary">
                      Launch a New Hackathon
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Create, configure, and publish a competition
                    </p>
                  </div>
                </div>
              </Link>

              {myCompetitions.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    No competitions yet. Create your first one above!
                  </p>
                </div>
              ) : (
                myCompetitions.slice(0, 5).map((comp) => {
                  const stats = compStatsMap.get(comp.id) ?? {
                    subs: 0,
                    participants: 0,
                  };
                  const isLive =
                    comp.status === "active" || comp.status === "judging";

                  return (
                    <div
                      key={comp.id}
                      className="group overflow-hidden rounded-xl border border-border transition-all duration-300 hover:border-primary/30 hover:shadow-md"
                    >
                      {/* Status gradient strip */}
                      <div
                        className={`h-1 bg-gradient-to-r ${STATUS_GRADIENT[comp.status] ?? "from-zinc-500/20 to-zinc-500/5"}`}
                      />

                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold leading-tight transition-colors group-hover:text-primary">
                                {comp.title}
                              </h3>
                              <span
                                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${COMPETITION_STATUS_COLORS[comp.status] ?? ""}`}
                              >
                                {isLive && (
                                  <span className="relative flex h-1.5 w-1.5">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                  </span>
                                )}
                                {formatStatus(comp.status)}
                              </span>
                            </div>
                            {comp.tagline && (
                              <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                                {comp.tagline}
                              </p>
                            )}
                          </div>

                          {comp.totalPrizePool ? (
                            <span className="shrink-0 text-sm font-bold text-primary">
                              PKR{" "}
                              {comp.totalPrizePool >= 1000
                                ? `${Math.round(comp.totalPrizePool / 1000)}K`
                                : comp.totalPrizePool}
                            </span>
                          ) : null}
                        </div>

                        {/* Mini stats */}
                        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3 text-primary/70" />
                            {stats.subs} submissions
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3 text-primary/70" />
                            {stats.participants} participants
                          </span>
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3 text-primary/70" />
                            {sponsorCountMap.get(comp.id) ?? 0} sponsors
                          </span>
                          {comp.submissionEnd && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-primary/70" />
                              {comp.submissionEnd > now
                                ? `Due ${comp.submissionEnd.toLocaleDateString("en-PK", { month: "short", day: "numeric" })}`
                                : "Closed"}
                            </span>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="mt-3 flex gap-2">
                          <Link href={`/sponsor/competitions/${comp.id}`}>
                            <Button
                              size="sm"
                              className="h-7 gap-1 text-xs"
                            >
                              <Eye className="h-3 w-3" /> Manage
                            </Button>
                          </Link>
                          <Link
                            href={`/sponsor/competitions/${comp.id}/submissions`}
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 gap-1 text-xs"
                            >
                              <ClipboardList className="h-3 w-3" /> Submissions
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Top Submissions */}
          {topSubs.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-yellow-500/20 to-yellow-500/5">
                    <Trophy className="h-4 w-4 text-yellow-500" />
                  </div>
                  Top Submissions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {topSubs.map((sub, i) => (
                    <div
                      key={sub.title ?? i}
                      className="flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-muted/50"
                    >
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                          i === 0
                            ? "bg-yellow-500/10 text-yellow-500"
                            : i === 1
                              ? "bg-zinc-400/10 text-zinc-400"
                              : i === 2
                                ? "bg-amber-600/10 text-amber-600"
                                : "bg-muted text-muted-foreground"
                        }`}
                      >
                        #{i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-snug line-clamp-1">
                          {sub.title ?? "Untitled"}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {sub.teamName} &middot; {sub.compTitle}
                        </p>
                      </div>
                      {sub.aiScore !== null && (
                        <div className="flex items-center gap-1.5">
                          <div className="h-1.5 w-12 overflow-hidden rounded-full bg-muted">
                            <div
                              className={`h-full rounded-full ${
                                Number(sub.aiScore) >= 7
                                  ? "bg-emerald-500"
                                  : Number(sub.aiScore) >= 5
                                    ? "bg-amber-500"
                                    : "bg-red-500"
                              }`}
                              style={{
                                width: `${(Number(sub.aiScore) / 10) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs font-semibold">
                            {Number(sub.aiScore).toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Activity Feed */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-500/5">
                  <FileText className="h-4 w-4 text-emerald-500" />
                </div>
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityFeed items={activityItems} />
            </CardContent>
          </Card>

          {/* Judge Performance */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-500/5">
                  <Gavel className="h-4 w-4 text-amber-500" />
                </div>
                Judges
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/5">
                  <span className="text-2xl font-bold text-amber-500">
                    {totalJudges}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium">Judges Assigned</p>
                  <p className="text-xs text-muted-foreground">
                    Across {activeCount} active competition
                    {activeCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Milestones */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-500/5">
                  <Clock className="h-4 w-4 text-blue-400" />
                </div>
                Upcoming Milestones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MilestoneWidget milestones={upcomingMilestones} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
