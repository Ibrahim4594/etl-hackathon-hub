import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  teamMembers,
  teams,
  competitions,
  submissions,
  organizations,
  competitionSponsors,
} from "@/lib/db/schema";
import { eq, desc, sql, and, inArray, asc, or, notInArray } from "drizzle-orm";
import { resolveOnboardingUser } from "@/lib/auth/resolve-onboarding-user";
import { serverAuth } from "@/lib/auth/server-auth";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Trophy,
  Users,
  FileText,
  Medal,
  ArrowRight,
  Clock,
  Target,
  Plus,
  Zap,
  Star,
  Award,
  User,
} from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { DeadlineCountdown } from "@/components/student/deadline-countdown";
import { ParticipantRealtimeOverlay } from "@/components/realtime/participant-realtime-overlay";
import { CompetitionCard } from "@/components/competitions/competition-card";
import { COMPETITION_STATUS_COLORS, SUBMISSION_STATUS_COLORS, formatStatus } from "@/lib/constants/status-colors";

const ACHIEVEMENT_LABELS: Record<string, { name: string; icon: string }> = {
  first_submission: { name: "First Submission", icon: "🚀" },
  first_win: { name: "First Win", icon: "🏆" },
  team_lead: { name: "Team Leader", icon: "⭐" },
  five_competitions: { name: "Veteran Competitor", icon: "🔥" },
  finalist: { name: "Finalist", icon: "🎯" },
};

function formatDate(date: Date | string | null): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-PK", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

function daysUntil(date: Date | string | null): number {
  if (!date) return -1;
  return Math.ceil(
    (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
}

export default async function StudentDashboardPage() {
  const { userId } = await serverAuth();
  if (!userId) redirect("/sign-in");
  const dbUser = await resolveOnboardingUser(userId);

  if (!dbUser || !dbUser.onboardingComplete) {
    redirect("/onboarding");
  }

  if (dbUser.role !== "student" && dbUser.role !== "admin") {
    redirect(dbUser.role ? `/${dbUser.role}/dashboard` : "/onboarding");
  }

  // Teams + competitions with org name
  const memberships = await db
    .select({
      teamId: teamMembers.teamId,
      teamName: teams.name,
      teamRole: teamMembers.role,
      inviteCode: teams.inviteCode,
      competitionId: competitions.id,
      competitionTitle: competitions.title,
      competitionSlug: competitions.slug,
      competitionStatus: competitions.status,
      submissionEnd: competitions.submissionEnd,
      registrationEnd: competitions.registrationEnd,
      resultsDate: competitions.resultsDate,
      totalPrizePool: competitions.totalPrizePool,
      tagline: competitions.tagline,
      orgName: organizations.name,
    })
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .innerJoin(competitions, eq(teams.competitionId, competitions.id))
    .innerJoin(
      organizations,
      eq(competitions.organizationId, organizations.id)
    )
    .where(eq(teamMembers.userId, dbUser.id))
    .orderBy(desc(competitions.createdAt));

  // Recent submissions (5)
  const recentSubmissions = await db
    .select({
      id: submissions.id,
      title: submissions.title,
      status: submissions.status,
      aiScore: submissions.aiScore,
      finalScore: submissions.finalScore,
      rank: submissions.rank,
      createdAt: submissions.createdAt,
      competitionTitle: competitions.title,
    })
    .from(submissions)
    .innerJoin(competitions, eq(submissions.competitionId, competitions.id))
    .where(eq(submissions.submittedBy, dbUser.id))
    .orderBy(desc(submissions.createdAt))
    .limit(5);

  // Total submission count
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)` })
    .from(submissions)
    .where(eq(submissions.submittedBy, dbUser.id));
  const totalSubmissionsCount = Number(total);

  // Wins count
  const [{ wins }] = await db
    .select({ wins: sql<number>`count(*)` })
    .from(submissions)
    .where(
      and(
        eq(submissions.submittedBy, dbUser.id),
        eq(submissions.status, "winner")
      )
    );
  const winsCount = Number(wins);

  // Check submission status per competition
  const submissionsByComp = await db
    .select({
      competitionId: submissions.competitionId,
      status: submissions.status,
    })
    .from(submissions)
    .innerJoin(teams, eq(submissions.teamId, teams.id))
    .innerJoin(teamMembers, eq(teamMembers.teamId, teams.id))
    .where(eq(teamMembers.userId, dbUser.id));

  const submissionStatusMap = new Map(
    submissionsByComp.map((s) => [s.competitionId, s.status])
  );

  // Fetch sponsor names per competition
  const memberCompIds = [...new Set(memberships.map((m) => m.competitionId))];
  const sponsorNamesByComp = new Map<string, string[]>();
  if (memberCompIds.length > 0) {
    const compSponsors = await db
      .select({
        competitionId: competitionSponsors.competitionId,
        companyName: competitionSponsors.companyName,
        isOrganizer: competitionSponsors.isOrganizer,
      })
      .from(competitionSponsors)
      .where(inArray(competitionSponsors.competitionId, memberCompIds))
      .orderBy(asc(competitionSponsors.displayOrder));

    for (const s of compSponsors) {
      if (s.isOrganizer) continue;
      const existing = sponsorNamesByComp.get(s.competitionId) ?? [];
      existing.push(s.companyName);
      sponsorNamesByComp.set(s.competitionId, existing);
    }
  }

  // Discover: active competitions this student hasn't joined
  const joinedCompIds = [...new Set(memberships.map((m) => m.competitionId))];
  const discoverConditions = [
    or(
      eq(competitions.status, "active"),
      eq(competitions.status, "judging")
    )!,
  ];
  if (joinedCompIds.length > 0) {
    discoverConditions.push(
      sql`${competitions.id} NOT IN (${sql.join(joinedCompIds.map(id => sql`${id}`), sql`, `)})`
    );
  }
  const discoverCompetitions = await db
    .select({
      id: competitions.id,
      title: competitions.title,
      slug: competitions.slug,
      tagline: competitions.tagline,
      category: competitions.category,
      tags: competitions.tags,
      coverImageUrl: competitions.coverImageUrl,
      totalPrizePool: competitions.totalPrizePool,
      maxTeamSize: competitions.maxTeamSize,
      minTeamSize: competitions.minTeamSize,
      submissionEnd: competitions.submissionEnd,
      status: competitions.status,
      organizationName: organizations.name,
      organizationLogoUrl: organizations.logoUrl,
    })
    .from(competitions)
    .leftJoin(organizations, eq(competitions.organizationId, organizations.id))
    .where(and(...discoverConditions))
    .orderBy(desc(competitions.featured), desc(competitions.createdAt))
    .limit(3);

  // Computed values
  const activeCompetitions = memberships.filter(
    (m) =>
      m.competitionStatus === "active" ||
      m.competitionStatus === "approved" ||
      m.competitionStatus === "judging"
  );
  const uniqueTeams = [
    ...new Map(memberships.map((m) => [m.teamId, m])).values(),
  ];
  const achievements: string[] = dbUser.achievements ?? [];

  // Upcoming deadlines from all competitions
  const upcomingDeadlines: {
    competition: string;
    type: string;
    date: Date;
    slug: string;
  }[] = [];

  for (const m of memberships) {
    if (m.submissionEnd && new Date(m.submissionEnd) > new Date()) {
      upcomingDeadlines.push({
        competition: m.competitionTitle,
        type: "Submission",
        date: new Date(m.submissionEnd),
        slug: m.competitionSlug,
      });
    }
    if (m.resultsDate && new Date(m.resultsDate) > new Date()) {
      upcomingDeadlines.push({
        competition: m.competitionTitle,
        type: "Results",
        date: new Date(m.resultsDate),
        slug: m.competitionSlug,
      });
    }
  }

  upcomingDeadlines.sort((a, b) => a.date.getTime() - b.date.getTime());
  const topDeadlines = upcomingDeadlines.slice(0, 4);

  const name =
    [dbUser.firstName, dbUser.lastName].filter(Boolean).join(" ") || "Participant";
  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? "Good morning"
      : hour < 17
        ? "Good afternoon"
        : "Good evening";

  const activeCount = activeCompetitions.length;

  return (
    <div className="space-y-6">
      {/* ── WELCOME ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {dbUser.firstName || "Participant"}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {activeCount > 0
              ? `You have ${activeCount} active competition${activeCount > 1 ? "s" : ""} right now.`
              : "Browse competitions to start your journey."}
          </p>
        </div>
        <div className="hidden shrink-0 sm:block">
          {dbUser.imageUrl ? (
            <Image
              src={dbUser.imageUrl}
              alt={name}
              width={40}
              height={40}
              className="rounded-full ring-2 ring-border"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-sm font-bold text-primary-foreground">
              {name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* ── REAL-TIME OVERLAY ── */}
      <ParticipantRealtimeOverlay userId={dbUser.id} />

      {/* ── STATS ROW ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {(
          [
            {
              title: "Competitions Joined",
              value: memberships.length,
              icon: Trophy,
              gradient: "from-yellow-500/20 to-yellow-500/5",
              iconColor: "text-yellow-500",
            },
            {
              title: "Submissions Made",
              value: totalSubmissionsCount,
              icon: FileText,
              gradient: "from-primary/20 to-primary/5",
              iconColor: "text-primary",
            },
            {
              title: "Wins",
              value: winsCount,
              icon: Medal,
              gradient: "from-amber-500/20 to-amber-500/5",
              iconColor: "text-amber-500",
            },
            {
              title: "Badges Earned",
              value: achievements.length,
              icon: Award,
              gradient: "from-purple-500/20 to-purple-500/5",
              iconColor: "text-purple-500",
            },
          ] as const
        ).map(({ title, value, icon: Icon, gradient, iconColor }) => (
          <Card
            key={title}
            className="rounded-2xl border border-border/50 card-lift"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {title}
                  </p>
                  <p className="mt-1 text-3xl font-black tracking-tight">
                    {value}
                  </p>
                </div>
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} border border-border/10 shadow-inner shadow-black/5`}
                >
                  <Icon className={`h-6 w-6 ${iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── DISCOVER COMPETITIONS ── */}
      {discoverCompetitions.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <h2 className="text-base font-semibold">Discover Competitions</h2>
            </div>
            <Link href="/competitions">
              <Button variant="ghost" size="sm" className="gap-1 text-xs text-primary">
                Browse all <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {discoverCompetitions.map((comp) => (
              <CompetitionCard
                key={comp.id}
                id={comp.id}
                title={comp.title}
                slug={comp.slug}
                tagline={comp.tagline}
                category={comp.category}
                tags={comp.tags as string[] | undefined}
                coverImageUrl={comp.coverImageUrl}
                organizationName={comp.organizationName ?? "Unknown"}
                organizationLogoUrl={comp.organizationLogoUrl}
                totalPrizePool={comp.totalPrizePool ?? undefined}
                maxTeamSize={comp.maxTeamSize}
                minTeamSize={comp.minTeamSize}
                submissionEnd={comp.submissionEnd}
                status={comp.status}
              />
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {/* ── LEFT COLUMN (2/3) ── */}
        <div className="space-y-6 lg:col-span-2">
          {/* Active Competitions */}
          <Card className="rounded-xl border border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold">
                My Competitions
              </CardTitle>
              <Link href="/competitions">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-xs text-primary"
                >
                  Browse all <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {activeCompetitions.length === 0 ? (
                <EmptyState
                  icon={Trophy}
                  title="No active competitions"
                  description="Browse the marketplace to find hackathons that match your skills."
                >
                  <Link href="/competitions">
                    <Button size="sm">Browse Competitions</Button>
                  </Link>
                </EmptyState>
              ) : (
                <div className="space-y-3">
                  {activeCompetitions.slice(0, 4).map((m) => {
                    const days = m.submissionEnd
                      ? daysUntil(m.submissionEnd)
                      : null;
                    const subStatus = submissionStatusMap.get(m.competitionId);

                    return (
                      <div
                        key={m.teamId}
                        className="group rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/competitions/${m.competitionSlug}`}
                              className="text-sm font-semibold transition-colors group-hover:text-primary"
                            >
                              {m.competitionTitle}
                            </Link>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              by {m.orgName}
                              {(sponsorNamesByComp.get(m.competitionId)?.length ?? 0) > 0 && (
                                <span className="text-muted-foreground/70">
                                  {" "}+ {sponsorNamesByComp.get(m.competitionId)!.slice(0, 2).join(", ")}
                                  {(sponsorNamesByComp.get(m.competitionId)!.length > 2) && ` +${sponsorNamesByComp.get(m.competitionId)!.length - 2} more`}
                                </span>
                              )}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${COMPETITION_STATUS_COLORS[m.competitionStatus] ?? "border-border bg-muted text-muted-foreground"}`}
                              >
                                {formatStatus(m.competitionStatus)}
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                Team:{" "}
                                <strong className="text-foreground">
                                  {m.teamName}
                                </strong>
                              </span>
                              {subStatus ? (
                                <span
                                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${SUBMISSION_STATUS_COLORS[subStatus] ?? "border-border bg-muted text-muted-foreground"}`}
                                >
                                  {formatStatus(subStatus)}
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[11px] font-medium text-red-500">
                                  Not Submitted
                                </span>
                              )}
                            </div>
                          </div>
                          {days !== null && days >= 0 && (
                            <div
                              className={`shrink-0 rounded-lg px-3 py-2 text-center ${days <= 2 ? "bg-red-500/10 text-red-500" : days <= 7 ? "bg-yellow-500/10 text-yellow-500" : "bg-primary/10 text-primary"}`}
                            >
                              <p className="text-lg font-bold leading-none">
                                {days}
                              </p>
                              <p className="mt-0.5 text-[10px]">days left</p>
                            </div>
                          )}
                        </div>
                        <div className="mt-3 flex gap-2">
                          {subStatus ? (
                            <Link
                              href="/student/submissions"
                              className="text-xs font-medium text-primary hover:underline"
                            >
                              View Submission
                            </Link>
                          ) : (
                            <Link
                              href={`/student/submissions/new/${m.competitionId}`}
                              className="text-xs font-medium text-primary hover:underline"
                            >
                              Submit Project
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Submissions */}
          <Card className="rounded-xl border border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold">
                Recent Submissions
              </CardTitle>
              <Link href="/student/submissions">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-xs text-primary"
                >
                  View all <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {recentSubmissions.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No submissions yet"
                  description="Submit your first project when you're ready."
                />
              ) : (
                <div className="overflow-hidden rounded-lg border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
                        <th className="px-4 py-2.5 text-left font-medium">
                          Project
                        </th>
                        <th className="hidden px-4 py-2.5 text-left font-medium sm:table-cell">
                          Competition
                        </th>
                        <th className="px-4 py-2.5 text-left font-medium">
                          Status
                        </th>
                        <th className="px-4 py-2.5 text-right font-medium">
                          AI Score
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentSubmissions.map((sub) => (
                        <tr
                          key={sub.id}
                          className="border-b last:border-0 transition-colors hover:bg-muted/30"
                        >
                          <td className="px-4 py-3">
                            <Link
                              href={`/student/submissions/${sub.id}`}
                              className="font-medium text-foreground hover:text-primary"
                            >
                              {sub.title}
                            </Link>
                            <p className="mt-0.5 text-[11px] text-muted-foreground sm:hidden">
                              {sub.competitionTitle}
                            </p>
                          </td>
                          <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                            {sub.competitionTitle}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${SUBMISSION_STATUS_COLORS[sub.status] ?? "border-border bg-muted text-muted-foreground"}`}
                            >
                              {formatStatus(sub.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {sub.aiScore !== null ? (
                              <span className="font-semibold text-primary">
                                {sub.aiScore.toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="space-y-6">
          {/* Upcoming Deadlines */}
          <Card className="rounded-xl border border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold">
                Upcoming Deadlines
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topDeadlines.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No upcoming deadlines
                </p>
              ) : (
                <div className="space-y-3">
                  {topDeadlines.map((d, i) => {
                    const days = daysUntil(d.date);
                    return (
                      <Link
                        key={`${d.slug}-${d.type}-${i}`}
                        href={`/competitions/${d.slug}`}
                        className="flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50"
                      >
                        <div
                          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${days <= 1 ? "bg-red-500/15 text-red-500" : days <= 3 ? "bg-yellow-500/15 text-yellow-500" : "bg-green-500/15 text-green-500"}`}
                        >
                          {days}d
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {d.competition}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {d.type} &middot; {formatDate(d.date)}
                          </p>
                          <DeadlineCountdown deadline={d.date.toISOString()} />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* My Teams */}
          <Card className="rounded-xl border border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold">
                My Teams
              </CardTitle>
              <Link href="/student/teams">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-xs text-primary"
                >
                  All <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {uniqueTeams.length === 0 ? (
                <div className="py-4 text-center">
                  <p className="text-sm text-muted-foreground">No teams yet</p>
                  <Link
                    href="/competitions"
                    className="mt-2 inline-block text-xs font-medium text-primary hover:underline"
                  >
                    Join a Competition
                  </Link>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {uniqueTeams.slice(0, 3).map((m) => (
                    <Link
                      key={m.teamId}
                      href="/student/teams"
                      className="block rounded-lg border border-border bg-card p-3 transition-all hover:border-primary/30 hover:shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium">
                          {m.teamName}
                        </p>
                        <Badge
                          variant={
                            m.teamRole === "lead" ? "default" : "secondary"
                          }
                          className="shrink-0 text-[10px]"
                        >
                          {m.teamRole === "lead" ? "Leader" : "Member"}
                        </Badge>
                      </div>
                      <p className="mt-1 truncate text-[11px] text-muted-foreground">
                        {m.competitionTitle}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Achievements */}
          <Card className="rounded-xl border border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold">
                Achievements
              </CardTitle>
            </CardHeader>
            <CardContent>
              {achievements.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Participate in competitions to earn badges!
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {achievements.map((id) => {
                    const a = ACHIEVEMENT_LABELS[id];
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                        title={a?.name}
                      >
                        {a?.icon} {a?.name ?? id}
                      </span>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── QUICK ACTIONS ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { href: "/competitions", label: "Browse Competitions", icon: Trophy },
          { href: "/student/submissions", label: "My Submissions", icon: FileText },
          { href: "/student/teams", label: "My Teams", icon: Users },
          { href: "/student/profile", label: "Edit Profile", icon: User },
        ].map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-center gap-3 rounded-xl border border-border/50 bg-card p-4 transition-all hover:border-primary/20 hover:shadow-md"
          >
            <Icon className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
            <span className="text-sm font-medium transition-colors group-hover:text-primary">
              {label}
            </span>
            <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground/50 transition-colors group-hover:text-primary" />
          </Link>
        ))}
      </div>
    </div>
  );
}
