import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import {
  competitions,
  organizations,
  submissions,
  teams,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { resolveOnboardingUser } from "@/lib/auth/resolve-onboarding-user";
import { serverAuth } from "@/lib/auth/server-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  ArrowLeft,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { SUBMISSION_STATUS_COLORS, formatStatus } from "@/lib/constants/status-colors";

type FilterTab = "all" | "valid" | "flagged" | "invalid" | "finalists" | "winners";

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "valid", label: "Valid" },
  { key: "flagged", label: "Flagged" },
  { key: "invalid", label: "Invalid" },
  { key: "finalists", label: "Finalists" },
  { key: "winners", label: "Winners" },
];

function filterMatches(status: string, filter: FilterTab): boolean {
  if (filter === "all") return true;
  if (filter === "valid") return status === "valid" || status === "ai_evaluated" || status === "judged";
  if (filter === "flagged") return status === "flagged";
  if (filter === "invalid") return status === "invalid";
  if (filter === "finalists") return status === "finalist";
  if (filter === "winners") return status === "winner";
  return true;
}

export default async function SponsorSubmissionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ filter?: string }>;
}) {
  const { id } = await params;
  const { filter: rawFilter } = await searchParams;
  const activeFilter = (
    FILTER_TABS.some((t) => t.key === rawFilter) ? rawFilter : "all"
  ) as FilterTab;

  const { userId } = await serverAuth();
  if (!userId) redirect("/sign-in");

  const dbUser = await resolveOnboardingUser(userId);
  if (!dbUser || !dbUser.onboardingComplete) redirect("/onboarding");
  if (dbUser.role !== "sponsor" && dbUser.role !== "admin") {
    redirect(dbUser.role ? `/${dbUser.role}/dashboard` : "/onboarding");
  }

  // Fetch competition with org name
  const [competition] = await db
    .select({
      id: competitions.id,
      title: competitions.title,
      createdBy: competitions.createdBy,
      organizationName: organizations.name,
    })
    .from(competitions)
    .innerJoin(organizations, eq(competitions.organizationId, organizations.id))
    .where(eq(competitions.id, id));

  if (!competition) notFound();
  if (competition.createdBy !== dbUser.id) redirect("/sponsor/competitions");

  // Fetch all submissions for this competition
  const allSubmissions = await db
    .select({
      id: submissions.id,
      title: submissions.title,
      status: submissions.status,
      aiScore: submissions.aiScore,
      humanScore: submissions.humanScore,
      finalScore: submissions.finalScore,
      rank: submissions.rank,
      createdAt: submissions.createdAt,
      teamName: teams.name,
    })
    .from(submissions)
    .innerJoin(teams, eq(submissions.teamId, teams.id))
    .where(eq(submissions.competitionId, id));

  // Compute stats
  const totalCount = allSubmissions.length;
  const validCount = allSubmissions.filter(
    (s) => s.status === "valid" || s.status === "ai_evaluated" || s.status === "judged" || s.status === "finalist" || s.status === "winner"
  ).length;
  const flaggedCount = allSubmissions.filter((s) => s.status === "flagged").length;
  const aiScores = allSubmissions
    .map((s) => s.aiScore)
    .filter((score): score is number => score !== null);
  const avgAiScore =
    aiScores.length > 0
      ? (aiScores.reduce((a, b) => a + b, 0) / aiScores.length).toFixed(1)
      : "N/A";

  // Filter
  const filtered = allSubmissions.filter((s) => filterMatches(s.status, activeFilter));

  // Sort: by rank (nulls last), then by finalScore desc, then by aiScore desc
  filtered.sort((a, b) => {
    if (a.rank !== null && b.rank !== null) return a.rank - b.rank;
    if (a.rank !== null) return -1;
    if (b.rank !== null) return 1;
    if (a.finalScore !== null && b.finalScore !== null) return b.finalScore - a.finalScore;
    if (a.finalScore !== null) return -1;
    if (b.finalScore !== null) return 1;
    if (a.aiScore !== null && b.aiScore !== null) return b.aiScore - a.aiScore;
    return 0;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/sponsor/competitions/${id}`}>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Submissions</h1>
            <p className="text-sm text-muted-foreground">{competition.title}</p>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalCount}</p>
              <p className="text-xs text-muted-foreground">Total Submissions</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
              <CheckCircle2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{validCount}</p>
              <p className="text-xs text-muted-foreground">Valid</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
              <AlertTriangle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{flaggedCount}</p>
              <p className="text-xs text-muted-foreground">Flagged</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{avgAiScore}</p>
              <p className="text-xs text-muted-foreground">Avg AI Score</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {FILTER_TABS.map((tab) => (
          <Link
            key={tab.key}
            href={
              tab.key === "all"
                ? `/sponsor/competitions/${id}/submissions`
                : `/sponsor/competitions/${id}/submissions?filter=${tab.key}`
            }
          >
            <Button
              variant={activeFilter === tab.key ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs"
            >
              {tab.label}
              {tab.key === "all" && (
                <span className="ml-1.5 rounded-full bg-background/20 px-1.5 py-0.5 text-[10px] font-semibold">
                  {totalCount}
                </span>
              )}
            </Button>
          </Link>
        ))}
      </div>

      {/* Submissions Table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">No submissions found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {activeFilter === "all"
                  ? "No teams have submitted yet."
                  : `No submissions with status "${activeFilter}".`}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                    <th className="px-4 py-3">Project Title</th>
                    <th className="px-4 py-3">Team</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">AI Score</th>
                    <th className="px-4 py-3 text-right">Human Score</th>
                    <th className="px-4 py-3 text-right">Final Score</th>
                    <th className="px-4 py-3 text-right">Rank</th>
                    <th className="px-4 py-3 text-right">Submitted At</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((sub) => (
                    <tr
                      key={sub.id}
                      className="transition-colors hover:bg-muted/50"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/sponsor/competitions/${id}`}
                          className="text-sm font-medium hover:text-primary hover:underline"
                        >
                          {sub.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {sub.teamName}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold ${SUBMISSION_STATUS_COLORS[sub.status] ?? ""}`}
                        >
                          {sub.status === "winner" && (
                            <Trophy className="mr-1 h-3 w-3" />
                          )}
                          {formatStatus(sub.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right text-sm tabular-nums">
                        {sub.aiScore !== null ? (
                          <span
                            className={
                              Number(sub.aiScore) >= 7
                                ? "text-emerald-500"
                                : Number(sub.aiScore) >= 5
                                  ? "text-amber-500"
                                  : "text-red-400"
                            }
                          >
                            {Number(sub.aiScore).toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">--</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-sm tabular-nums">
                        {sub.humanScore !== null ? (
                          Number(sub.humanScore).toFixed(1)
                        ) : (
                          <span className="text-muted-foreground">--</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold tabular-nums">
                        {sub.finalScore !== null ? (
                          Number(sub.finalScore).toFixed(1)
                        ) : (
                          <span className="text-muted-foreground">--</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-sm tabular-nums">
                        {sub.rank !== null ? (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {sub.rank}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">--</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                        {sub.createdAt.toLocaleDateString("en-PK", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
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
  );
}
