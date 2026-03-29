import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  users,
  competitions,
  submissions,
  organizations,
  teams,
  teamMembers,
  judgeAssignments,
  judgeEvaluations,
} from "@/lib/db/schema";
import { eq, or, sql, desc, and } from "drizzle-orm";
import { resolveOnboardingUser } from "@/lib/auth/resolve-onboarding-user";
import { serverAuth } from "@/lib/auth/server-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Users,
  Trophy,
  Building2,
  FileText,
  Clock,
  Zap,
  Shield,
  ArrowRight,
  Gavel,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  BarChart3,
  Eye,
} from "lucide-react";
import { COMPETITION_STATUS_COLORS, SUBMISSION_STATUS_COLORS, formatStatus } from "@/lib/constants/status-colors";

export default async function AdminDashboardPage() {
  const { userId } = await serverAuth();
  if (!userId) redirect("/sign-in");
  const dbUser = await resolveOnboardingUser(userId);
  if (!dbUser || dbUser.role !== "admin") redirect("/");

  // Fetch all stats in parallel
  const [
    [{ totalUsers }],
    [{ totalStudents }],
    [{ totalSponsors }],
    [{ totalJudges }],
    [{ totalComps }],
    [{ activeComps }],
    [{ pendingReview }],
    [{ approvedComps }],
    [{ totalSubs }],
    [{ validSubs }],
    [{ flaggedSubs }],
    [{ invalidSubs }],
    [{ totalOrgs }],
    [{ verifiedOrgs }],
    [{ pendingOrgs }],
    [{ totalTeams }],
    [{ totalEvals }],
  ] = await Promise.all([
    db.select({ totalUsers: sql<number>`count(*)` }).from(users),
    db.select({ totalStudents: sql<number>`count(*)` }).from(users).where(eq(users.role, "student")),
    db.select({ totalSponsors: sql<number>`count(*)` }).from(users).where(eq(users.role, "sponsor")),
    db.select({ totalJudges: sql<number>`count(*)` }).from(users).where(eq(users.role, "judge")),
    db.select({ totalComps: sql<number>`count(*)` }).from(competitions),
    db.select({ activeComps: sql<number>`count(*)` }).from(competitions).where(or(eq(competitions.status, "active"), eq(competitions.status, "judging"))),
    db.select({ pendingReview: sql<number>`count(*)` }).from(competitions).where(eq(competitions.status, "pending_review")),
    db.select({ approvedComps: sql<number>`count(*)` }).from(competitions).where(eq(competitions.status, "approved")),
    db.select({ totalSubs: sql<number>`count(*)` }).from(submissions),
    db.select({ validSubs: sql<number>`count(*)` }).from(submissions).where(eq(submissions.status, "valid")),
    db.select({ flaggedSubs: sql<number>`count(*)` }).from(submissions).where(eq(submissions.status, "flagged")),
    db.select({ invalidSubs: sql<number>`count(*)` }).from(submissions).where(eq(submissions.status, "invalid")),
    db.select({ totalOrgs: sql<number>`count(*)` }).from(organizations),
    db.select({ verifiedOrgs: sql<number>`count(*)` }).from(organizations).where(eq(organizations.verification, "verified")),
    db.select({ pendingOrgs: sql<number>`count(*)` }).from(organizations).where(eq(organizations.verification, "pending")),
    db.select({ totalTeams: sql<number>`count(*)` }).from(teams),
    db.select({ totalEvals: sql<number>`count(*)` }).from(judgeEvaluations),
  ]);

  // Recent competitions (latest 5)
  const recentCompetitions = await db
    .select({
      id: competitions.id,
      title: competitions.title,
      status: competitions.status,
      createdAt: competitions.createdAt,
      orgName: organizations.name,
      totalPrizePool: competitions.totalPrizePool,
    })
    .from(competitions)
    .innerJoin(organizations, eq(competitions.organizationId, organizations.id))
    .orderBy(desc(competitions.createdAt))
    .limit(5);

  // Recent submissions (latest 5)
  const recentSubmissions = await db
    .select({
      id: submissions.id,
      title: submissions.title,
      status: submissions.status,
      createdAt: submissions.createdAt,
      compTitle: competitions.title,
      teamName: teams.name,
    })
    .from(submissions)
    .innerJoin(competitions, eq(submissions.competitionId, competitions.id))
    .innerJoin(teams, eq(submissions.teamId, teams.id))
    .orderBy(desc(submissions.createdAt))
    .limit(5);

  // Pending org verifications
  const pendingOrgsList = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      contactEmail: organizations.contactEmail,
      createdAt: organizations.createdAt,
    })
    .from(organizations)
    .where(eq(organizations.verification, "pending"))
    .orderBy(desc(organizations.createdAt))
    .limit(5);

  const pReview = Number(pendingReview);
  const pOrgs = Number(pendingOrgs);
  const fSubs = Number(flaggedSubs);
  const alertCount = pReview + pOrgs + fSubs;

  return (
    <div className="space-y-8">
      {/* ══════════ WELCOME BANNER ══════════ */}
      <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-b from-muted/40 to-muted/20 p-6 md:p-8">
        <div className="absolute -left-20 -top-20 h-48 w-48 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
        <div className="absolute -right-16 -bottom-16 h-64 w-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/60 shadow-lg">
              <Shield className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold md:text-3xl">
                Admin{" "}
                <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Command Center
                </span>
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {alertCount > 0
                  ? `${alertCount} item${alertCount !== 1 ? "s" : ""} need your attention`
                  : "All systems running smoothly"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/competitions?status=pending_review">
              <Button variant="outline" className="gap-1.5 text-sm">
                <Clock className="h-4 w-4" />
                Review Queue ({pReview})
              </Button>
            </Link>
            <Link href="/admin/analytics">
              <Button className="gap-1.5 text-sm">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ══════════ ALERT BANNER (if items pending) ══════════ */}
      {alertCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-400">
            {pReview > 0 && <span className="font-medium">{pReview} competition{pReview !== 1 ? "s" : ""} pending review</span>}
            {pReview > 0 && (pOrgs > 0 || fSubs > 0) && " · "}
            {pOrgs > 0 && <span className="font-medium">{pOrgs} org{pOrgs !== 1 ? "s" : ""} awaiting verification</span>}
            {pOrgs > 0 && fSubs > 0 && " · "}
            {fSubs > 0 && <span className="font-medium">{fSubs} flagged submission{fSubs !== 1 ? "s" : ""}</span>}
          </p>
        </div>
      )}

      {/* ══════════ PRIMARY STATS ══════════ */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Total Users", value: Number(totalUsers), icon: Users, sub: `${Number(totalStudents)} students · ${Number(totalSponsors)} organizers · ${Number(totalJudges)} judges`, gradient: "from-primary/20 to-primary/5", iconColor: "text-primary" },
          { title: "Competitions", value: Number(totalComps), icon: Trophy, sub: `${Number(activeComps)} active · ${pReview} pending`, gradient: "from-primary/20 to-primary/5", iconColor: "text-primary" },
          { title: "Submissions", value: Number(totalSubs), icon: FileText, sub: `${Number(validSubs)} valid · ${fSubs} flagged · ${Number(invalidSubs)} invalid`, gradient: "from-primary/20 to-primary/5", iconColor: "text-primary" },
          { title: "Organizations", value: Number(totalOrgs), icon: Building2, sub: `${Number(verifiedOrgs)} verified · ${pOrgs} pending`, gradient: "from-primary/20 to-primary/5", iconColor: "text-primary" },
        ].map(({ title, value, icon: Icon, sub, gradient, iconColor }) => (
          <Card key={title} className="card-lift">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
                  <p className="mt-1 text-3xl font-black tracking-tight">{value}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{sub}</p>
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} border border-border/10`}>
                  <Icon className={`h-5 w-5 ${iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ══════════ SECONDARY STATS ROW ══════════ */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Active Competitions", value: Number(activeComps), icon: Zap },
          { title: "Approved (Waiting Go-Live)", value: Number(approvedComps), icon: CheckCircle },
          { title: "Total Teams", value: Number(totalTeams), icon: Users },
          { title: "Judge Evaluations", value: Number(totalEvals), icon: Gavel },
        ].map(({ title, value, icon: Icon }) => (
          <Card key={title} className="card-lift">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-[11px] text-muted-foreground">{title}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ══════════ MAIN CONTENT GRID ══════════ */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* LEFT: Recent Competitions + Submissions */}
        <div className="space-y-6 lg:col-span-2">
          {/* Recent Competitions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
                  <Trophy className="h-4 w-4 text-primary" />
                </div>
                Recent Competitions
              </CardTitle>
              <Link href="/admin/competitions">
                <Button variant="ghost" size="sm" className="gap-1 text-xs">
                  View All <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentCompetitions.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No competitions yet</p>
              ) : (
                recentCompetitions.map((comp) => (
                  <Link
                    key={comp.id}
                    href={`/admin/competitions`}
                    className="flex items-center justify-between gap-3 rounded-lg p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{comp.title}</p>
                      <p className="text-[11px] text-muted-foreground">{comp.orgName}</p>
                    </div>
                    {comp.totalPrizePool ? (
                      <span className="text-xs font-semibold text-foreground shrink-0">
                        PKR {comp.totalPrizePool >= 1000 ? `${Math.round(comp.totalPrizePool / 1000)}K` : comp.totalPrizePool}
                      </span>
                    ) : null}
                    <Badge variant="outline" className={`shrink-0 text-[10px] ${COMPETITION_STATUS_COLORS[comp.status] ?? ""}`}>
                      {formatStatus(comp.status)}
                    </Badge>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          {/* Recent Submissions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                Recent Submissions
              </CardTitle>
              <Link href="/admin/submissions">
                <Button variant="ghost" size="sm" className="gap-1 text-xs">
                  View All <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentSubmissions.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No submissions yet</p>
              ) : (
                recentSubmissions.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between gap-3 rounded-lg p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{sub.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {sub.teamName} · {sub.compTitle}
                      </p>
                    </div>
                    <Badge variant="outline" className={`shrink-0 text-[10px] ${SUBMISSION_STATUS_COLORS[sub.status] ?? "bg-muted text-muted-foreground border-border"}`}>
                      {formatStatus(sub.status)}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT SIDEBAR */}
        <div className="space-y-6">
          {/* Pending Orgs */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                Pending Verifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {pendingOrgsList.length === 0 ? (
                <div className="flex flex-col items-center py-6">
                  <CheckCircle className="h-8 w-8 text-emerald-500/50" />
                  <p className="mt-2 text-sm text-muted-foreground">All clear</p>
                </div>
              ) : (
                <>
                  {pendingOrgsList.map((org) => (
                    <div
                      key={org.id}
                      className="rounded-lg border border-border/50 p-3"
                    >
                      <p className="text-sm font-medium">{org.name}</p>
                      <p className="text-[11px] text-muted-foreground">{org.contactEmail}</p>
                    </div>
                  ))}
                  <Link href="/admin/organizations">
                    <Button variant="outline" size="sm" className="w-full gap-1 text-xs mt-2">
                      <Eye className="h-3 w-3" />
                      Review All
                    </Button>
                  </Link>
                </>
              )}
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { href: "/admin/competitions?status=pending_review", label: "Review Competitions", icon: Clock, count: pReview },
                { href: "/admin/organizations", label: "Verify Organizations", icon: Building2, count: pOrgs },
                { href: "/admin/submissions?status=flagged", label: "Flagged Submissions", icon: AlertTriangle, count: fSubs },
                { href: "/admin/judges", label: "Manage Judges", icon: Gavel },
                { href: "/admin/users", label: "Manage Users", icon: Users },
              ].map(({ href, label, icon: Icon, count }) => (
                <Link
                  key={href}
                  href={href}
                  className={`group flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-muted/50 ${count !== undefined && count > 0 ? "border-l-2 border-amber-500 bg-amber-500/5" : ""}`}
                >
                  <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="flex-1 text-sm">{label}</span>
                  {count !== undefined && count > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500/10 px-1.5 text-[10px] font-bold text-amber-500 animate-pulse">
                      {count}
                    </span>
                  )}
                  <ArrowRight className="h-3 w-3 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                </Link>
              ))}
            </CardContent>
          </Card>

          {/* Platform Health */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-500/5">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                </div>
                Platform Health
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Submission Validation Rate", value: Number(totalSubs) > 0 ? Math.round((Number(validSubs) / Number(totalSubs)) * 100) : 0 },
                { label: "Org Verification Rate", value: Number(totalOrgs) > 0 ? Math.round((Number(verifiedOrgs) / Number(totalOrgs)) * 100) : 0 },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] text-muted-foreground">{label}</span>
                    <span className="text-xs font-bold">{value}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${value >= 80 ? "bg-emerald-500" : value >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                      style={{ width: `${value}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
