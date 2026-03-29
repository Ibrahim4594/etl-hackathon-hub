import { db } from "@/lib/db";
import { competitions, organizations } from "@/lib/db/schema";
import { eq, and, or, ilike, desc, asc, sql } from "drizzle-orm";
import { CompetitionCard } from "@/components/competitions/competition-card";
import { CompetitionFilters } from "@/components/competitions/competition-filters";
import { Trophy, Building2, Sparkles } from "lucide-react";

export const revalidate = 60; // Revalidate every 60 seconds

interface Props {
  searchParams: Promise<{
    search?: string;
    category?: string;
    sort?: string;
    status?: string;
    page?: string;
  }>;
}

export default async function CompetitionsMarketplace({
  searchParams,
}: Props) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1"));
  const limit = 12;
  const offset = (page - 1) * limit;

  // Build conditions — default to public-visible statuses
  type HackathonStatus = "draft" | "pending_review" | "approved" | "active" | "judging" | "completed" | "cancelled";
  const validStatuses: HackathonStatus[] = ["active", "judging", "completed"];
  const statusFilter =
    params.status && params.status !== "all" && validStatuses.includes(params.status as HackathonStatus)
      ? eq(competitions.status, params.status as HackathonStatus)
      : or(
          eq(competitions.status, "active"),
          eq(competitions.status, "judging"),
          eq(competitions.status, "completed")
        );

  const conditions = [statusFilter!];

  if (params.search) {
    conditions.push(
      or(
        ilike(competitions.title, `%${params.search}%`),
        ilike(competitions.tagline, `%${params.search}%`)
      )!
    );
  }
  if (params.category) {
    conditions.push(eq(competitions.category, params.category));
  }

  const orderBy =
    params.sort === "deadline"
      ? asc(competitions.submissionEnd)
      : params.sort === "prize"
        ? desc(competitions.totalPrizePool)
        : desc(competitions.createdAt);

  const results = await db
    .select({
      id: competitions.id,
      title: competitions.title,
      slug: competitions.slug,
      tagline: competitions.tagline,
      category: competitions.category,
      tags: competitions.tags,
      coverImageUrl: competitions.coverImageUrl,
      totalPrizePool: competitions.totalPrizePool,
      maxParticipants: competitions.maxParticipants,
      maxTeamSize: competitions.maxTeamSize,
      minTeamSize: competitions.minTeamSize,
      submissionEnd: competitions.submissionEnd,
      status: competitions.status,
      organizationName: organizations.name,
      organizationLogoUrl: organizations.logoUrl,
    })
    .from(competitions)
    .leftJoin(organizations, eq(competitions.organizationId, organizations.id))
    .where(and(...conditions))
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(competitions)
    .where(and(...conditions));

  const totalPages = Math.ceil(Number(count) / limit);

  // Aggregate stats for the hero banner
  const [stats] = await db
    .select({
      total: sql<number>`count(*)`,
      totalPrize: sql<number>`coalesce(sum(${competitions.totalPrizePool}), 0)`,
    })
    .from(competitions)
    .where(
      or(
        eq(competitions.status, "active"),
        eq(competitions.status, "judging"),
        eq(competitions.status, "completed")
      )
    );

  const [orgStats] = await db
    .select({ count: sql<number>`count(distinct ${competitions.organizationId})` })
    .from(competitions)
    .where(
      or(
        eq(competitions.status, "active"),
        eq(competitions.status, "judging"),
        eq(competitions.status, "completed")
      )
    );

  const totalComps = Number(stats?.total ?? 0);
  const totalPrize = Number(stats?.totalPrize ?? 0);
  const totalOrgs = Number(orgStats?.count ?? 0);

  return (
    <div className="min-h-screen pt-10">
      {/* ── Hero Banner ── */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/5 via-background to-accent/5">
        {/* Decorative orbs */}
        <div className="absolute -left-32 -top-32 h-72 w-72 rounded-full bg-primary/20 dark:bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute -right-20 -bottom-20 h-96 w-96 rounded-full bg-accent/20 dark:bg-accent/10 blur-3xl pointer-events-none" />

        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Discover{" "}
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Competitions
            </span>
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
            Browse hackathons and coding challenges from Pakistan&apos;s top
            organizations
          </p>

          {/* Inline stats */}
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" />
              <strong className="text-foreground">
                {totalComps > 0 ? `${totalComps}+` : "50+"}
              </strong>{" "}
              Active Competitions
            </span>
            <span className="hidden h-1 w-1 rounded-full bg-muted-foreground/40 sm:block" />
            <span className="flex items-center gap-1.5">
              <Trophy className="h-4 w-4 text-primary" />
              <strong className="text-foreground">
                PKR{" "}
                {totalPrize >= 1000000
                  ? `${(totalPrize / 1000000).toFixed(1)}M`
                  : totalPrize > 0
                    ? `${Math.round(totalPrize / 1000)}K`
                    : "5M"}
                +
              </strong>{" "}
              in Prizes
            </span>
            <span className="hidden h-1 w-1 rounded-full bg-muted-foreground/40 sm:block" />
            <span className="flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-primary" />
              <strong className="text-foreground">
                {totalOrgs > 0 ? `${totalOrgs}+` : "100+"}
              </strong>{" "}
              Organizations
            </span>
          </div>
        </div>
      </section>

      {/* ── Main Content ── */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <CompetitionFilters />

        {results.length === 0 ? (
          /* ── Empty State ── */
          <div className="relative mt-16 flex flex-col items-center px-4 py-16 text-center">

            <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 shadow-sm">
              <Trophy className="h-12 w-12 text-primary" />
            </div>
            <h2 className="mt-6 text-2xl font-bold">No competitions found</h2>
            <p className="mt-2 max-w-md text-muted-foreground">
              Try adjusting your search or filters, or check back later for new
              competitions from Pakistan&apos;s top organizations.
            </p>
            <div className="mt-6 flex gap-3">
              <a
                href="/competitions"
                className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Browse All
              </a>
            </div>
          </div>
        ) : (
          <>
            {/* Result count */}
            <p className="mt-6 text-sm text-muted-foreground">
              Showing{" "}
              <strong className="text-foreground">{results.length}</strong> of{" "}
              <strong className="text-foreground">{Number(count)}</strong>{" "}
              competitions
            </p>

            {/* ── Card Grid ── */}
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((comp) => (
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

            {/* ── Pagination ── */}
            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-2">
                {page > 1 && (
                  <a
                    href={`/competitions?${new URLSearchParams({ ...params, page: String(page - 1) }).toString()}`}
                    className="inline-flex h-9 items-center rounded-lg border border-border bg-card px-3 text-sm font-medium transition-colors hover:bg-muted"
                  >
                    Previous
                  </a>
                )}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (p) => (
                    <a
                      key={p}
                      href={`/competitions?${new URLSearchParams({ ...params, page: String(p) }).toString()}`}
                      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                        p === page
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "border border-border bg-card hover:bg-muted"
                      }`}
                    >
                      {p}
                    </a>
                  )
                )}
                {page < totalPages && (
                  <a
                    href={`/competitions?${new URLSearchParams({ ...params, page: String(page + 1) }).toString()}`}
                    className="inline-flex h-9 items-center rounded-lg border border-border bg-card px-3 text-sm font-medium transition-colors hover:bg-muted"
                  >
                    Next
                  </a>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
