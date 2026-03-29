import { serverAuth } from "@/lib/auth/server-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import {
  competitions,
  organizations,
  submissions,
  teams,
  teamMembers,
} from "@/lib/db/schema";
import { eq, desc, count, sql, inArray } from "drizzle-orm";
import { resolveOnboardingUser } from "@/lib/auth/resolve-onboarding-user";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Trophy,
  Plus,
  Users,
  FileText,
  ArrowUpRight,
  Calendar,
  Sparkles,
} from "lucide-react";
import { format, isPast, formatDistanceToNow } from "date-fns";

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; label: string; dot?: boolean }> = {
  draft: { color: "text-zinc-400", bg: "bg-zinc-500/10", border: "border-zinc-500/20", label: "Draft" },
  pending_review: { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", label: "In Review" },
  approved: { color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", label: "Approved" },
  active: { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", label: "Live", dot: true },
  judging: { color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20", label: "Judging", dot: true },
  completed: { color: "text-zinc-400", bg: "bg-zinc-500/10", border: "border-zinc-500/20", label: "Completed" },
  cancelled: { color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", label: "Cancelled" },
};

function fmtPrize(v: number | null) {
  if (!v) return "PKR 0";
  if (v >= 1_000_000) return `PKR ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `PKR ${(v / 1_000).toFixed(0)}K`;
  return `PKR ${v.toLocaleString()}`;
}

export default async function SponsorCompetitionsPage() {
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

  // Fetch competitions
  const sponsorCompetitions = await db
    .select()
    .from(competitions)
    .where(eq(competitions.organizationId, org.id))
    .orderBy(desc(competitions.createdAt));

  // Get per-competition stats
  const competitionIds = sponsorCompetitions.map((c) => c.id);
  let subCounts: Record<string, number> = {};
  let teamCounts: Record<string, number> = {};

  if (competitionIds.length > 0) {
    const subRows = await db
      .select({
        competitionId: submissions.competitionId,
        count: count(),
      })
      .from(submissions)
      .where(inArray(submissions.competitionId, competitionIds))
      .groupBy(submissions.competitionId);

    for (const r of subRows) subCounts[r.competitionId] = r.count;

    const teamRows = await db
      .select({
        competitionId: teams.competitionId,
        count: count(),
      })
      .from(teams)
      .where(inArray(teams.competitionId, competitionIds))
      .groupBy(teams.competitionId);

    for (const r of teamRows) teamCounts[r.competitionId] = r.count;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Competitions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {sponsorCompetitions.length} competition{sponsorCompetitions.length !== 1 ? "s" : ""} · {org.name}
          </p>
        </div>
        <Link href="/sponsor/competitions/new">
          <Button className="shadow-sm">
            <Plus className="mr-1.5 h-4 w-4" />
            New Competition
          </Button>
        </Link>
      </div>

      {sponsorCompetitions.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No competitions yet"
          description="Launch your first competition to discover top talent from across Pakistan."
        >
          <Link href="/sponsor/competitions/new">
            <Button>
              <Plus className="mr-1.5 h-4 w-4" />
              Create Competition
            </Button>
          </Link>
        </EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sponsorCompetitions.map((comp) => {
            const cfg = STATUS_CONFIG[comp.status] ?? STATUS_CONFIG.draft;
            const subs = subCounts[comp.id] ?? 0;
            const tms = teamCounts[comp.id] ?? 0;
            const deadlineDate = comp.submissionEnd;
            const deadlinePast = deadlineDate ? isPast(new Date(deadlineDate)) : false;

            return (
              <Link key={comp.id} href={`/sponsor/competitions/${comp.id}`}>
                <Card className="group relative overflow-hidden border-border/50 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
                  {/* Status gradient strip */}
                  <div className={`absolute inset-x-0 top-0 h-1 ${cfg.bg.replace("/10", "")}`} />

                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cfg.bg} ${cfg.color} ${cfg.border}`}
                          >
                            {cfg.dot && (
                              <span className="relative flex h-1.5 w-1.5">
                                <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${cfg.bg.replace("/10", "")} opacity-75`} />
                                <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${cfg.bg.replace("/10", "")}`} />
                              </span>
                            )}
                            {cfg.label}
                          </span>
                          {comp.category && (
                            <span className="text-[11px] text-muted-foreground">{comp.category}</span>
                          )}
                        </div>
                        <h3 className="mt-2 truncate text-base font-semibold group-hover:text-primary transition-colors">
                          {comp.title}
                        </h3>
                        {comp.tagline && (
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {comp.tagline}
                          </p>
                        )}
                      </div>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>

                    {/* Stats row */}
                    <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Trophy className="h-3 w-3 text-primary" />
                        {fmtPrize(comp.totalPrizePool)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {tms} team{tms !== 1 ? "s" : ""}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {subs} submission{subs !== 1 ? "s" : ""}
                      </span>
                      {deadlineDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {deadlinePast
                            ? "Closed"
                            : formatDistanceToNow(new Date(deadlineDate), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}

          {/* Create New card */}
          <Link href="/sponsor/competitions/new">
            <Card className="group flex h-full min-h-[140px] cursor-pointer items-center justify-center border-2 border-dashed border-border/50 bg-transparent shadow-none transition-all hover:border-primary/40 hover:bg-primary/[0.02]">
              <CardContent className="flex flex-col items-center gap-2 p-5 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 transition-transform group-hover:scale-110">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                  Launch a New Competition
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      )}
    </div>
  );
}
