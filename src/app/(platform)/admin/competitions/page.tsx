import { serverAuth } from "@/lib/auth/server-auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { competitions, organizations, competitionSponsors } from "@/lib/db/schema";
import { eq, desc, inArray, count, and, or, sql } from "drizzle-orm";
import { resolveOnboardingUser } from "@/lib/auth/resolve-onboarding-user";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trophy, Globe, Lock, BarChart3 } from "lucide-react";
import { AdminCompetitionActions } from "./actions";
import { GoLiveButton } from "@/components/competitions/go-live-button";
import { HackathonManagementActions } from "@/components/competitions/hackathon-management-actions";
import { CompetitionStatusFilter } from "./competition-status-filter";
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
  pending_review: "secondary",
  approved: "default",
  active: "default",
  judging: "secondary",
  completed: "outline",
  cancelled: "destructive",
};

const statusLabel: Record<string, string> = {
  pending_review: "Pending Review",
  approved: "Approved",
  active: "Live",
  judging: "Judging",
  completed: "Completed",
  cancelled: "Rejected",
};

const PAGE_SIZE = 50;

interface PageProps {
  searchParams: Promise<{ status?: string; page?: string }>;
}

export default async function AdminCompetitionsPage({ searchParams }: PageProps) {
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
  const offset = (currentPage - 1) * PAGE_SIZE;

  // Live filter excludes comps whose submission deadline has already passed
  // (auto-advance fires on competition page load — list view filters by date too).
  const statusWhere =
    activeFilter === "active"
      ? and(
          eq(competitions.status, "active"),
          or(
            sql`${competitions.submissionEnd} IS NULL`,
            sql`${competitions.submissionEnd} > NOW()`
          )
        )
      : activeFilter !== "all"
        ? eq(competitions.status, activeFilter as "draft" | "pending_review" | "approved" | "active" | "judging" | "completed" | "cancelled")
        : undefined;

  const [totalRows, statusCounts, pageCompetitions] = await Promise.all([
    db.select({ total: count() }).from(competitions).where(statusWhere),
    db
      .select({ status: competitions.status, cnt: count() })
      .from(competitions)
      .groupBy(competitions.status),
    db
      .select({
        id: competitions.id,
        title: competitions.title,
        slug: competitions.slug,
        category: competitions.category,
        totalPrizePool: competitions.totalPrizePool,
        status: competitions.status,
        visibility: competitions.visibility,
        createdAt: competitions.createdAt,
        submissionEnd: competitions.submissionEnd,
        prizeConfirmed: competitions.prizeConfirmed,
        organizationName: organizations.name,
        organizationSlug: organizations.slug,
      })
      .from(competitions)
      .innerJoin(organizations, eq(competitions.organizationId, organizations.id))
      .where(statusWhere)
      .orderBy(desc(competitions.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset),
  ]);

  const filteredCount = Number(totalRows[0]?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

  const counts: Record<string, number> = {};
  for (const row of statusCounts) {
    counts[row.status] = Number(row.cnt);
  }

  const compIds = pageCompetitions.map((c) => c.id);
  const sponsorsByComp = new Map<string, { count: number; totalAmount: number; noContact: number }>();
  if (compIds.length > 0) {
    const allSponsors = await db
      .select()
      .from(competitionSponsors)
      .where(inArray(competitionSponsors.competitionId, compIds));

    for (const s of allSponsors) {
      const existing = sponsorsByComp.get(s.competitionId) ?? { count: 0, totalAmount: 0, noContact: 0 };
      existing.count++;
      if (s.contributionAmount) existing.totalAmount += s.contributionAmount;
      if (!s.contactPersonEmail && !s.contactPersonPhone && !s.isOrganizer) existing.noContact++;
      sponsorsByComp.set(s.competitionId, existing);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Hackathon Management"
          description="View and manage all hackathons across all statuses"
        />
      </div>

      <Suspense fallback={null}>
        <CompetitionStatusFilter currentStatus={activeFilter} counts={counts} />
      </Suspense>

      {filteredCount === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No hackathons"
          description={
            activeFilter === "all"
              ? "No hackathons have been created yet."
              : `No hackathons with status "${statusLabel[activeFilter] ?? activeFilter}".`
          }
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hackathon</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Prize Pool</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Sponsors</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageCompetitions.map((comp) => {
                const info = sponsorsByComp.get(comp.id);
                return (
                <TableRow key={comp.id}>
                  <TableCell>
                    <div className="min-w-0">
                      <p className="font-medium truncate max-w-[220px]">{comp.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{comp.organizationName}{comp.category ? ` · ${comp.category}` : ""}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[comp.status] ?? "outline"}>
                      {statusLabel[comp.status] ?? comp.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div>
                      <p className="text-sm font-medium">PKR {(comp.totalPrizePool ?? 0).toLocaleString()}</p>
                      {comp.prizeConfirmed ? (
                        <span className="text-[10px] text-emerald-500">Confirmed</span>
                      ) : (
                        <span className="text-[10px] text-zinc-400">Unconfirmed</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1.5">
                      {comp.visibility === "private" ? (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          <Lock className="size-2.5 mr-0.5" />
                          Private
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          <Globe className="size-2.5 mr-0.5" />
                          Public
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {!info || info.count === 0 ? (
                      <span className="text-muted-foreground text-xs">-</span>
                    ) : (
                      <span className="text-sm">{info.count} sponsor{info.count !== 1 ? "s" : ""}</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">{formatDate(comp.submissionEnd)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end gap-2">
                      {comp.status === "pending_review" && (
                        <AdminCompetitionActions competitionId={comp.id} />
                      )}
                      {comp.status === "approved" && (
                        <GoLiveButton competitionId={comp.id} size="sm" />
                      )}
                      {comp.slug && (comp.status === "active" || comp.status === "judging" || comp.status === "completed") && (
                        <Link href={`/competitions/${comp.slug}/leaderboard`} target="_blank">
                          <Button size="sm" variant="ghost" className="gap-1">
                            <BarChart3 className="h-3.5 w-3.5" />
                            Leaderboard
                          </Button>
                        </Link>
                      )}
                      <HackathonManagementActions
                        competitionId={comp.id}
                        competitionSlug={comp.slug ?? ""}
                        status={comp.status}
                      />
                    </div>
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {filteredCount > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {offset + 1}–{Math.min(safePage * PAGE_SIZE, filteredCount)} of{" "}
            {filteredCount} hackathon{filteredCount !== 1 ? "s" : ""}
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
