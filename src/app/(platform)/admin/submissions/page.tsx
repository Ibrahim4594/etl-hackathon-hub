import { serverAuth } from "@/lib/auth/server-auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { submissions, teams, competitions } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { resolveOnboardingUser } from "@/lib/auth/resolve-onboarding-user";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { SubmissionStatusFilter } from "./submission-status-filter";
import Link from "next/link";

function formatDate(date: Date | null): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  submitted: "outline",
  validating: "secondary",
  valid: "default",
  invalid: "destructive",
  flagged: "destructive",
  ai_evaluated: "secondary",
  judged: "default",
  finalist: "default",
  winner: "default",
};

const statusLabel: Record<string, string> = {
  submitted: "Submitted",
  validating: "Validating",
  valid: "Valid",
  invalid: "Invalid",
  flagged: "Flagged",
  ai_evaluated: "AI Evaluated",
  judged: "Judged",
  finalist: "Finalist",
  winner: "Winner",
};

const PAGE_SIZE = 50;

interface PageProps {
  searchParams: Promise<{ status?: string; page?: string }>;
}

export default async function AdminSubmissionsPage({ searchParams }: PageProps) {
  const { userId } = await serverAuth();
  if (!userId) redirect("/sign-in");

  const dbUser = await resolveOnboardingUser(userId);
  if (!dbUser || !dbUser.onboardingComplete) redirect("/onboarding");
  if (dbUser.role !== "admin") {
    redirect(dbUser.role ? `/${dbUser.role}/dashboard` : "/onboarding");
  }

  const { status: filterStatus, page: pageParam } = await searchParams;
  const activeFilter = filterStatus || "all";
  const currentPage = Math.max(1, parseInt(pageParam || "1", 10));

  // Fetch all submissions joined with team and competition
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
      teamId: teams.id,
      competitionTitle: competitions.title,
      competitionId: competitions.id,
      competitionSlug: competitions.slug,
    })
    .from(submissions)
    .innerJoin(teams, eq(submissions.teamId, teams.id))
    .innerJoin(competitions, eq(submissions.competitionId, competitions.id))
    .orderBy(desc(submissions.createdAt));

  // Compute counts per status for the filter tabs
  const counts: Record<string, number> = {};
  for (const sub of allSubmissions) {
    counts[sub.status] = (counts[sub.status] ?? 0) + 1;
  }

  // Compute stat card values
  const totalCount = allSubmissions.length;
  const validCount = allSubmissions.filter((s) => s.status === "valid").length;
  const flaggedCount = allSubmissions.filter((s) => s.status === "flagged").length;
  const invalidCount = allSubmissions.filter((s) => s.status === "invalid").length;

  // Apply status filter
  const filteredSubmissions = activeFilter === "all"
    ? allSubmissions
    : allSubmissions.filter((s) => s.status === activeFilter);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredSubmissions.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedSubmissions = filteredSubmissions.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  function formatScore(score: number | null): string {
    if (score === null || score === undefined) return "-";
    return score.toFixed(1);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Submission Monitoring"
        description="View and monitor all submissions across competitions"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Submissions" value={totalCount} icon={FileText} />
        <StatCard title="Valid" value={validCount} icon={CheckCircle} />
        <StatCard title="Flagged" value={flaggedCount} icon={AlertTriangle} />
        <StatCard title="Invalid" value={invalidCount} icon={XCircle} />
      </div>

      <SubmissionStatusFilter currentStatus={activeFilter} counts={counts} />

      {filteredSubmissions.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No submissions"
          description={
            activeFilter === "all"
              ? "No submissions have been made yet."
              : `No submissions with status "${statusLabel[activeFilter] ?? activeFilter}".`
          }
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project Title</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Competition</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>AI Score</TableHead>
                <TableHead>Final Score</TableHead>
                <TableHead>Submitted At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedSubmissions.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/competitions/${sub.competitionSlug}`}
                      className="hover:text-primary transition-colors hover:underline"
                    >
                      {sub.title}
                    </Link>
                  </TableCell>
                  <TableCell>{sub.teamName}</TableCell>
                  <TableCell>
                    <Link
                      href={`/competitions/${sub.competitionSlug}`}
                      className="hover:text-primary transition-colors hover:underline"
                    >
                      {sub.competitionTitle}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[sub.status] ?? "outline"}>
                      {statusLabel[sub.status] ?? sub.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatScore(sub.aiScore)}</TableCell>
                  <TableCell>{formatScore(sub.finalScore)}</TableCell>
                  <TableCell>{formatDate(sub.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {filteredSubmissions.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredSubmissions.length)} of{" "}
            {filteredSubmissions.length} submission{filteredSubmissions.length !== 1 ? "s" : ""}
            {activeFilter !== "all" && ` with status "${statusLabel[activeFilter] ?? activeFilter}"`}
          </p>

          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              {safePage > 1 && (
                <Link
                  href={`?${new URLSearchParams({
                    ...(activeFilter !== "all" ? { status: activeFilter } : {}),
                    page: String(safePage - 1),
                  }).toString()}`}
                  className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
                >
                  Previous
                </Link>
              )}
              <span className="text-sm text-muted-foreground">
                Page {safePage} of {totalPages}
              </span>
              {safePage < totalPages && (
                <Link
                  href={`?${new URLSearchParams({
                    ...(activeFilter !== "all" ? { status: activeFilter } : {}),
                    page: String(safePage + 1),
                  }).toString()}`}
                  className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
                >
                  Next
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
