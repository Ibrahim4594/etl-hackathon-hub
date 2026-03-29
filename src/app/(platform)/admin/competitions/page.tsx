import { serverAuth } from "@/lib/auth/server-auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { competitions, organizations, competitionSponsors } from "@/lib/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { resolveOnboardingUser } from "@/lib/auth/resolve-onboarding-user";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trophy, ShieldCheck, ShieldX, Globe, Lock } from "lucide-react";
import { AdminCompetitionActions } from "./actions";
import { GoLiveButton } from "@/components/competitions/go-live-button";
import { CompetitionStatusFilter } from "./competition-status-filter";

function formatDate(date: Date | null): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "outline",
  pending_review: "secondary",
  approved: "default",
  active: "default",
  judging: "secondary",
  completed: "outline",
  cancelled: "destructive",
};

const statusLabel: Record<string, string> = {
  draft: "Draft",
  pending_review: "Pending Review",
  approved: "Approved",
  active: "Active",
  judging: "Judging",
  completed: "Completed",
  cancelled: "Cancelled",
};

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function AdminCompetitionsPage({ searchParams }: PageProps) {
  const { userId } = await serverAuth();
  if (!userId) redirect("/sign-in");

  const dbUser = await resolveOnboardingUser(userId);
  if (!dbUser || !dbUser.onboardingComplete) redirect("/onboarding");
  if (dbUser.role !== "admin") {
    redirect(dbUser.role ? `/${dbUser.role}/dashboard` : "/onboarding");
  }

  const { status: filterStatus } = await searchParams;
  const activeFilter = filterStatus || "all";

  // Fetch ALL competitions (no status filter in the query)
  const allCompetitions = await db
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
    .orderBy(desc(competitions.createdAt));

  // Compute counts per status for the filter tabs
  const counts: Record<string, number> = {};
  for (const comp of allCompetitions) {
    counts[comp.status] = (counts[comp.status] ?? 0) + 1;
  }

  // Apply client-side status filter
  const filteredCompetitions = activeFilter === "all"
    ? allCompetitions
    : allCompetitions.filter((c) => c.status === activeFilter);

  // Fetch sponsor info for filtered competitions
  const compIds = filteredCompetitions.map((c) => c.id);
  let sponsorsByComp = new Map<string, { count: number; totalAmount: number; noContact: number }>();
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
      <PageHeader
        title="Competition Management"
        description="View and manage all competitions across all statuses"
      />

      <CompetitionStatusFilter currentStatus={activeFilter} counts={counts} />

      {filteredCompetitions.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No competitions"
          description={
            activeFilter === "all"
              ? "No competitions have been created yet."
              : `No competitions with status "${statusLabel[activeFilter] ?? activeFilter}".`
          }
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Competition</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Prize Pool</TableHead>
                <TableHead>Visibility</TableHead>
                <TableHead>Prize Status</TableHead>
                <TableHead>Sponsors</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCompetitions.map((comp) => (
                <TableRow key={comp.id}>
                  <TableCell className="font-medium">{comp.title}</TableCell>
                  <TableCell>{comp.organizationName}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[comp.status] ?? "outline"}>
                      {statusLabel[comp.status] ?? comp.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{comp.category || "-"}</TableCell>
                  <TableCell>
                    PKR {(comp.totalPrizePool ?? 0).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {comp.visibility === "private" ? (
                      <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20 hover:bg-orange-500/20">
                        <Lock className="size-3 mr-1" />
                        Private
                      </Badge>
                    ) : (
                      <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20">
                        <Globe className="size-3 mr-1" />
                        Public
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {comp.prizeConfirmed ? (
                      <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20">
                        <ShieldCheck className="size-3 mr-1" />
                        Confirmed
                      </Badge>
                    ) : (
                      <Badge className="bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20">
                        <ShieldX className="size-3 mr-1" />
                        Not Confirmed
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const info = sponsorsByComp.get(comp.id);
                      if (!info || info.count === 0) return <span className="text-muted-foreground">-</span>;
                      return (
                        <div className="space-y-1">
                          <div className="text-sm">{info.count} sponsor{info.count !== 1 ? "s" : ""}</div>
                          {info.totalAmount > 0 && (
                            <div className="text-xs text-muted-foreground">
                              PKR {info.totalAmount.toLocaleString()}
                            </div>
                          )}
                          {info.noContact > 0 && (
                            <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20 text-xs">
                              Missing contact
                            </Badge>
                          )}
                        </div>
                      );
                    })()}
                  </TableCell>
                  <TableCell>{formatDate(comp.submissionEnd)}</TableCell>
                  <TableCell>{formatDate(comp.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    {comp.status === "pending_review" ? (
                      <AdminCompetitionActions competitionId={comp.id} />
                    ) : comp.status === "approved" ? (
                      <GoLiveButton competitionId={comp.id} size="sm" />
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {filteredCompetitions.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Showing {filteredCompetitions.length} competition{filteredCompetitions.length !== 1 ? "s" : ""}
          {activeFilter !== "all" && ` with status "${statusLabel[activeFilter] ?? activeFilter}"`}
        </p>
      )}
    </div>
  );
}
