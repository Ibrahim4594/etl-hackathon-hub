import { db } from "@/lib/db";
import { competitions, competitionSponsors, organizations, teamMembers, teams, submissions, users } from "@/lib/db/schema";
import { eq, and, asc, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { TimelineDisplay } from "@/components/competitions/timeline-display";
import {
  Trophy,
  Users,
  Calendar,
  ExternalLink,
  Building2,
  Globe,
  Zap,
  Medal,
  Award,
  CheckCircle2,
  Video,
  Github,
  FileText,
  Link2,
  Clock,
  Brain,
  Star,
  CheckCircle,
  Lock,
  Target,
  BarChart3,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { serverAuth } from "@/lib/auth/server-auth";
import { RegistrationStatus } from "@/components/competitions/registration-status";
import { getCategoryGradient } from "@/lib/utils/placeholder-gradient";
import { InitialsAvatar } from "@/components/shared/initials-avatar";
import { CompetitionTimeline } from "@/components/competitions/competition-timeline";

interface Props {
  params: Promise<{ slug: string }>;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active: {
    label: "Open for Submissions",
    className:
      "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  },
  judging: {
    label: "Judging in Progress",
    className: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  },
  completed: {
    label: "Completed",
    className: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  },
  approved: {
    label: "Coming Soon",
    className: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
};

const PRIZE_ICONS = [Trophy, Medal, Award];
const PRIZE_COLORS = [
  "from-yellow-500/20 to-yellow-500/5 text-yellow-500",
  "from-zinc-400/20 to-zinc-400/5 text-zinc-400",
  "from-amber-600/20 to-amber-600/5 text-amber-600",
];

export default async function CompetitionDetailPage({ params }: Props) {
  const { slug } = await params;
  const { userId } = await serverAuth();

  const [result] = await db
    .select({
      competition: competitions,
      orgName: organizations.name,
      orgLogo: organizations.logoUrl,
      orgWebsite: organizations.website,
      orgDescription: organizations.description,
    })
    .from(competitions)
    .leftJoin(organizations, eq(competitions.organizationId, organizations.id))
    .where(eq(competitions.slug, slug));

  if (!result) notFound();

  const comp = result.competition;
  const prizes = (comp.prizes as { position: number; title: string; amount: number; currency: string; description?: string }[]) || [];
  const criteria = (comp.judgingCriteria as { name: string; description: string; weight: number; maxScore: number }[]) || [];
  const reqs = comp.submissionRequirements as { githubRequired?: boolean; videoRequired?: boolean; deployedUrlRequired?: boolean; pitchDeckRequired?: boolean } | null;
  const resources = (comp.resources as { title: string; url: string }[]) || [];
  const tags = (comp.tags as string[]) || [];
  const targetParticipants = (comp.targetParticipants as string[]) || [];

  const statusCfg = STATUS_CONFIG[comp.status] ?? STATUS_CONFIG.active;

  const isOpen =
    comp.status === "active" &&
    (!comp.submissionEnd || new Date(comp.submissionEnd) > new Date());

  // Get participant count
  const [participantStats] = await db
    .select({ count: sql<number>`count(distinct ${teamMembers.userId})` })
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(eq(teams.competitionId, comp.id));

  const [teamStats] = await db
    .select({ count: sql<number>`count(*)` })
    .from(teams)
    .where(eq(teams.competitionId, comp.id));

  const participantCount = Number(participantStats?.count ?? 0);
  const teamCount = Number(teamStats?.count ?? 0);

  const sponsors = await db
    .select()
    .from(competitionSponsors)
    .where(eq(competitionSponsors.competitionId, comp.id))
    .orderBy(asc(competitionSponsors.displayOrder));

  const titleSponsors = sponsors.filter((s) => s.sponsorTier === "title");
  const goldSponsors = sponsors.filter((s) => s.sponsorTier === "gold");
  const silverSponsors = sponsors.filter((s) => s.sponsorTier === "silver");
  const bronzeSponsors = sponsors.filter((s) => s.sponsorTier === "bronze");
  const partnerSponsors = sponsors.filter((s) => s.sponsorTier === "partner" && !s.isOrganizer);

  // Check registration status for the current user
  let registrationData: {
    teamId: string;
    teamName: string;
    role: string;
    inviteCode: string;
    memberCount: number;
  } | null = null;
  let submissionData: {
    id: string;
    status: string;
    aiScore: number | null;
  } | null = null;

  if (userId) {
    const [dbUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkId, userId));

    if (dbUser) {
      // Check if user is in a team for this competition
      const [membership] = await db
        .select({
          teamId: teams.id,
          teamName: teams.name,
          role: teamMembers.role,
          inviteCode: teams.inviteCode,
        })
        .from(teamMembers)
        .innerJoin(teams, eq(teamMembers.teamId, teams.id))
        .where(
          and(
            eq(teamMembers.userId, dbUser.id),
            eq(teams.competitionId, comp.id)
          )
        );

      if (membership) {
        // Count team members
        const [memberCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(teamMembers)
          .where(eq(teamMembers.teamId, membership.teamId));

        registrationData = {
          teamId: membership.teamId,
          teamName: membership.teamName,
          role: membership.role,
          inviteCode: membership.inviteCode,
          memberCount: Number(memberCount?.count ?? 1),
        };

        // Check for existing submission
        const [sub] = await db
          .select({
            id: submissions.id,
            status: submissions.status,
            aiScore: submissions.aiScore,
          })
          .from(submissions)
          .where(
            and(
              eq(submissions.competitionId, comp.id),
              eq(submissions.teamId, membership.teamId)
            )
          );

        if (sub) {
          submissionData = sub;
        }
      }
    }
  }

  const TIER_BADGE_COLORS: Record<string, string> = {
    title: "bg-primary/10 text-primary border-primary/20",
    gold: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    silver: "bg-zinc-400/10 text-zinc-400 border-zinc-400/20",
    bronze: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    partner: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  };

  const CONTRIBUTION_TYPE_COLORS: Record<string, string> = {
    monetary: "bg-emerald-500/10 text-emerald-500",
    tech_credits: "bg-blue-500/10 text-blue-400",
    mentorship: "bg-purple-500/10 text-purple-400",
    internships: "bg-orange-500/10 text-orange-400",
    cloud_services: "bg-cyan-500/10 text-cyan-500",
    api_credits: "bg-indigo-500/10 text-indigo-400",
    other: "bg-zinc-500/10 text-zinc-400",
  };

  const getInitials = (name: string) =>
    name
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const formatContributionType = (type: string) =>
    type
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  return (
    <div className="min-h-screen">
      {/* ── Hero Banner ── */}
      <section className="relative overflow-hidden border-b border-border">
        {/* Background */}
        {comp.coverImageUrl ? (
          <div className="absolute inset-0">
            <Image
              src={comp.coverImageUrl}
              alt={comp.title}
              fill
              className="object-cover opacity-20 blur-sm"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
          </div>
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${getCategoryGradient(comp.category)} opacity-10`} />
        )}

        <div className="relative mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          {/* Badge pill row */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${statusCfg.className}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {statusCfg.label}
            </span>
            {comp.category && (
              <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium">
                {comp.category}
              </span>
            )}
            {comp.visibility === "private" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 text-orange-500 border border-orange-500/20 px-3 py-1 text-xs font-semibold">
                <Lock className="h-3 w-3" />
                Private Competition
              </span>
            )}
            {comp.featured && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1 text-xs font-semibold">
                <Star className="h-3 w-3" />
                Featured
              </span>
            )}
            {registrationData && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-3 py-1 text-xs font-semibold">
                <CheckCircle className="h-3 w-3" />
                Registered
              </span>
            )}
            <span className="inline-flex items-center rounded-full bg-muted text-muted-foreground px-3 py-1 text-xs font-medium">
              {new Date().getFullYear()}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            {comp.title}
          </h1>
          {comp.tagline && (
            <p className="mt-3 max-w-3xl text-lg text-muted-foreground">
              {comp.tagline}
            </p>
          )}

          {/* Sponsor info inline */}
          <div className="mt-4 flex items-center gap-3">
            {result.orgLogo ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card shadow-sm overflow-hidden">
                <Image
                  src={result.orgLogo}
                  alt={result.orgName ?? ""}
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-full object-cover"
                />
              </div>
            ) : (
              <InitialsAvatar name={result.orgName ?? "Org"} size="lg" />
            )}
            <div>
              <p className="text-sm font-semibold">{result.orgName}</p>
              {result.orgWebsite && (
                <a
                  href={result.orgWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Globe className="h-3 w-3" />
                  Visit website
                </a>
              )}
            </div>
          </div>

          {/* Quick stats */}
          <div className="mt-6 flex flex-wrap gap-4 text-sm">
            {comp.totalPrizePool ? (
              <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/10 px-3 py-1.5">
                <Trophy className="h-4 w-4 text-primary" />
                <span className="font-semibold text-primary">
                  PKR {comp.totalPrizePool.toLocaleString()}
                </span>
              </div>
            ) : null}
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{participantCount} participants</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{teamCount} teams</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>
                {comp.minTeamSize}–{comp.maxTeamSize} per team
              </span>
            </div>
          </div>

          {/* View Results CTA */}
          {(comp.status === "judging" || comp.status === "completed") && (
            <div className="mt-5">
              <Link
                href={`/competitions/${slug}/leaderboard`}
                className="inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-500 transition-colors hover:bg-amber-500/20"
              >
                <BarChart3 className="h-4 w-4" />
                {comp.status === "completed" ? "View Results & Winners" : "View Leaderboard"}
                <Trophy className="h-4 w-4" />
              </Link>
            </div>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Register CTA (hero - hidden on lg, shown on mobile) */}
          <div className="mt-6 lg:hidden">
            <RegistrationStatus
              competitionId={comp.id}
              competitionStatus={comp.status}
              registrationEnd={comp.registrationEnd?.toISOString() ?? null}
              submissionEnd={comp.submissionEnd?.toISOString() ?? null}
              visibility={comp.visibility}
              registration={registrationData}
              submission={submissionData}
              isAuthenticated={!!userId}
            />
          </div>
        </div>
      </section>

      {/* ── Key Info Boxes ── */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 -mt-6 relative z-10">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {/* Start Date */}
          <div className="bg-card rounded-xl border border-border/50 p-4 flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
              <Calendar className="h-4 w-4 text-blue-500" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Starts</p>
              <p className="text-sm font-semibold truncate">
                {comp.registrationStart
                  ? new Intl.DateTimeFormat("en-PK", { month: "short", day: "numeric", year: "numeric" }).format(new Date(comp.registrationStart))
                  : "TBD"}
              </p>
            </div>
          </div>

          {/* Deadline */}
          <div className="bg-card rounded-xl border border-border/50 p-4 flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-500/10">
              <Clock className="h-4 w-4 text-red-500" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Submission Deadline</p>
              <p className="text-sm font-semibold truncate">
                {comp.submissionEnd
                  ? new Intl.DateTimeFormat("en-PK", { month: "short", day: "numeric", year: "numeric" }).format(new Date(comp.submissionEnd))
                  : "TBD"}
              </p>
              {comp.submissionEnd && new Date(comp.submissionEnd) > new Date() && (
                <p className={`text-[10px] font-medium mt-0.5 ${
                  Math.ceil((new Date(comp.submissionEnd).getTime() - Date.now()) / 86400000) <= 3
                    ? "text-red-400"
                    : Math.ceil((new Date(comp.submissionEnd).getTime() - Date.now()) / 86400000) <= 7
                      ? "text-amber-400"
                      : "text-primary"
                }`}>
                  {Math.ceil((new Date(comp.submissionEnd).getTime() - Date.now()) / 86400000)} days left
                </p>
              )}
            </div>
          </div>

          {/* Prize Pool */}
          <div className="bg-card rounded-xl border border-border/50 p-4 flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
              <Trophy className="h-4 w-4 text-amber-500" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Prize Pool</p>
              <p className="text-sm font-bold text-primary">
                {comp.totalPrizePool
                  ? `PKR ${comp.totalPrizePool.toLocaleString()}`
                  : "TBD"}
              </p>
            </div>
          </div>

          {/* Judging */}
          <div className="bg-card rounded-xl border border-border/50 p-4 flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-500/10">
              <Brain className="h-4 w-4 text-purple-500" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Reviewed By</p>
              <p className="text-sm font-semibold">AI + Human Judges</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Progress Timeline ── */}
      <div className="mx-auto max-w-5xl px-4 mt-6 sm:px-6 lg:px-8">
        <CompetitionTimeline
          registrationStart={comp.registrationStart}
          registrationEnd={comp.registrationEnd}
          submissionStart={comp.submissionStart}
          submissionEnd={comp.submissionEnd}
          judgingStart={comp.judgingStart}
          judgingEnd={comp.judgingEnd}
          resultsDate={comp.resultsDate}
        />
      </div>

      {/* ── Main Content ── */}
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left column */}
          <div className="space-y-8 lg:col-span-2">
            {/* About */}
            <section>
              <h2 className="flex items-center gap-2 text-xl font-semibold">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
                  <Zap className="h-4 w-4 text-primary" />
                </div>
                About
              </h2>
              <p className="mt-3 whitespace-pre-wrap leading-relaxed text-muted-foreground">
                {comp.description}
              </p>
            </section>

            {/* Challenge */}
            {comp.challengeStatement && (
              <section>
                <h2 className="flex items-center gap-2 text-xl font-semibold">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-500/5">
                    <Zap className="h-4 w-4 text-amber-500" />
                  </div>
                  Challenge
                </h2>
                <p className="mt-3 whitespace-pre-wrap leading-relaxed text-muted-foreground">
                  {comp.challengeStatement}
                </p>
              </section>
            )}

            {/* Backed By */}
            {sponsors.length > 0 && (
              <section>
                <h2 className="flex items-center gap-2 text-xl font-semibold">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  Backed By
                </h2>

                {sponsors.length <= 1 && sponsors[0]?.isOrganizer ? (
                  <div className="mt-4 rounded-xl border border-border/50 bg-card shadow-sm hover:shadow-md transition-shadow duration-300 p-5">
                    <div className="flex items-center gap-4">
                      {sponsors[0].logoUrl ? (
                        <Image
                          src={sponsors[0].logoUrl}
                          alt={sponsors[0].companyName}
                          width={48}
                          height={48}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-primary to-accent text-white font-bold text-sm">
                          {getInitials(sponsors[0].companyName)}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-lg">{sponsors[0].companyName}</p>
                        <p className="text-sm text-muted-foreground">Organized and Sponsored By</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 space-y-6">
                    {/* Title Sponsors */}
                    {titleSponsors.length > 0 && (
                      <div className="space-y-3">
                        {titleSponsors.map((sponsor) => (
                          <div
                            key={sponsor.id}
                            className="rounded-xl border border-border/50 bg-card shadow-sm hover:shadow-md transition-shadow duration-300 p-5"
                          >
                            <div className="flex items-start gap-4">
                              {sponsor.logoUrl ? (
                                <Image
                                  src={sponsor.logoUrl}
                                  alt={sponsor.companyName}
                                  width={56}
                                  height={56}
                                  className="h-14 w-14 rounded-full object-cover"
                                />
                              ) : (
                                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-primary to-accent text-white font-bold text-lg">
                                  {getInitials(sponsor.companyName)}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-bold text-lg">{sponsor.companyName}</p>
                                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${TIER_BADGE_COLORS.title}`}>
                                    Title Sponsor
                                  </span>
                                </div>
                                {sponsor.contributionTitle && (
                                  <p className="mt-1 text-sm font-medium text-muted-foreground">
                                    {sponsor.contributionTitle}
                                  </p>
                                )}
                                {sponsor.contributionDescription && (
                                  <p className="mt-2 text-sm text-muted-foreground">
                                    {sponsor.contributionDescription}
                                  </p>
                                )}
                                {sponsor.website && (
                                  <a
                                    href={sponsor.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                    Visit website
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Gold Sponsors */}
                    {goldSponsors.length > 0 && (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {goldSponsors.map((sponsor) => (
                          <div
                            key={sponsor.id}
                            className="rounded-xl border border-border/50 bg-card shadow-sm hover:shadow-md transition-shadow duration-300 p-4"
                          >
                            <div className="flex items-center gap-3">
                              {sponsor.logoUrl ? (
                                <Image
                                  src={sponsor.logoUrl}
                                  alt={sponsor.companyName}
                                  width={40}
                                  height={40}
                                  className="h-10 w-10 rounded-full object-cover"
                                />
                              ) : (
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-primary to-accent text-white font-bold text-sm">
                                  {getInitials(sponsor.companyName)}
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="font-semibold truncate">{sponsor.companyName}</p>
                                <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${TIER_BADGE_COLORS.gold}`}>
                                    Gold
                                  </span>
                                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${CONTRIBUTION_TYPE_COLORS[sponsor.contributionType] ?? CONTRIBUTION_TYPE_COLORS.other}`}>
                                    {formatContributionType(sponsor.contributionType)}
                                  </span>
                                </div>
                                {sponsor.contributionType === "monetary" && sponsor.contributionAmount && (
                                  <p className="mt-1 text-xs font-semibold text-primary">
                                    PKR {sponsor.contributionAmount.toLocaleString()}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Silver Sponsors */}
                    {silverSponsors.length > 0 && (
                      <div className="grid gap-3 sm:grid-cols-3">
                        {silverSponsors.map((sponsor) => (
                          <div
                            key={sponsor.id}
                            className="rounded-xl border border-border/50 bg-card shadow-sm hover:shadow-md transition-shadow duration-300 p-3"
                          >
                            <div className="flex items-center gap-2.5">
                              {sponsor.logoUrl ? (
                                <Image
                                  src={sponsor.logoUrl}
                                  alt={sponsor.companyName}
                                  width={32}
                                  height={32}
                                  className="h-8 w-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-primary to-accent text-white font-bold text-xs">
                                  {getInitials(sponsor.companyName)}
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-sm font-semibold truncate">{sponsor.companyName}</p>
                                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${TIER_BADGE_COLORS.silver}`}>
                                  Silver
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Bronze Sponsors */}
                    {bronzeSponsors.length > 0 && (
                      <div className="grid gap-3 sm:grid-cols-3">
                        {bronzeSponsors.map((sponsor) => (
                          <div
                            key={sponsor.id}
                            className="rounded-xl border border-border/50 bg-card shadow-sm hover:shadow-md transition-shadow duration-300 p-3"
                          >
                            <div className="flex items-center gap-2.5">
                              {sponsor.logoUrl ? (
                                <Image
                                  src={sponsor.logoUrl}
                                  alt={sponsor.companyName}
                                  width={32}
                                  height={32}
                                  className="h-8 w-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-primary to-accent text-white font-bold text-xs">
                                  {getInitials(sponsor.companyName)}
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-sm font-semibold truncate">{sponsor.companyName}</p>
                                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${TIER_BADGE_COLORS.bronze}`}>
                                  Bronze
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Partners */}
                    {partnerSponsors.length > 0 && (
                      <div>
                        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Partners
                        </p>
                        <div className="flex flex-wrap items-center gap-3">
                          {partnerSponsors.map((sponsor) => (
                            <div
                              key={sponsor.id}
                              className="flex items-center gap-2 rounded-xl border border-border/50 bg-card shadow-sm hover:shadow-md transition-shadow duration-300 px-3 py-2"
                            >
                              {sponsor.logoUrl ? (
                                <Image
                                  src={sponsor.logoUrl}
                                  alt={sponsor.companyName}
                                  width={24}
                                  height={24}
                                  className="h-6 w-6 rounded-full object-cover"
                                />
                              ) : (
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-primary to-accent text-white font-bold text-[10px]">
                                  {getInitials(sponsor.companyName)}
                                </div>
                              )}
                              <span className="text-sm font-medium">{sponsor.companyName}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}

            {/* Requirements */}
            {comp.requirements && (
              <section>
                <h2 className="flex items-center gap-2 text-xl font-semibold">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-500/5">
                    <CheckCircle2 className="h-4 w-4 text-blue-500" />
                  </div>
                  Requirements
                </h2>
                <p className="mt-3 whitespace-pre-wrap leading-relaxed text-muted-foreground">
                  {comp.requirements}
                </p>
              </section>
            )}

            {/* Resources */}
            {resources.length > 0 && (
              <section>
                <h2 className="flex items-center gap-2 text-xl font-semibold">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-500/5">
                    <ExternalLink className="h-4 w-4 text-purple-500" />
                  </div>
                  Resources
                </h2>
                <div className="mt-3 space-y-2">
                  {resources.map((r, i) => (
                    <a
                      key={i}
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm transition-colors hover:border-primary/30 hover:bg-primary/5"
                    >
                      <ExternalLink className="h-4 w-4 text-primary" />
                      <span className="font-medium">{r.title}</span>
                    </a>
                  ))}
                </div>
              </section>
            )}

            {/* Prizes */}
            {prizes.length > 0 && (
              <section>
                <h2 className="flex items-center gap-2 text-xl font-semibold">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-yellow-500/20 to-yellow-500/5">
                    <Trophy className="h-4 w-4 text-yellow-500" />
                  </div>
                  Prizes
                </h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {prizes.map((prize, i) => {
                    const PrizeIcon = PRIZE_ICONS[i] ?? Award;
                    const colorClass =
                      PRIZE_COLORS[i] ??
                      "from-primary/20 to-primary/5 text-primary";
                    return (
                      <Card
                        key={i}
                        className="overflow-hidden border-border shadow-md transition-shadow hover:shadow-lg"
                      >
                        <CardContent className="p-5">
                          <div className="flex items-start gap-3">
                            <div
                              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${colorClass}`}
                            >
                              <PrizeIcon className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-semibold">{prize.title}</p>
                              <p className="text-2xl font-bold text-primary">
                                {prize.currency}{" "}
                                {prize.amount.toLocaleString()}
                              </p>
                              {prize.description && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {prize.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Judging Criteria */}
            {criteria.length > 0 && (
              <section>
                <h2 className="flex items-center gap-2 text-xl font-semibold">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-500/5">
                    <Award className="h-4 w-4 text-purple-500" />
                  </div>
                  Judging Criteria
                </h2>
                <div className="mt-4 space-y-3">
                  {criteria.map((c, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-border p-4 transition-colors hover:border-primary/20"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{c.name}</span>
                        <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                          {c.weight}%
                        </span>
                      </div>
                      {c.description && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {c.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* ── Right sidebar ── */}
          <div className="space-y-6">
            {/* Participant Counter — dark gradient card */}
            <div className="rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8 text-center shadow-xl border border-white/5 relative overflow-hidden">
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
              <div className="absolute -left-6 -bottom-6 h-24 w-24 rounded-full bg-primary/5 blur-2xl pointer-events-none" />
              <div className="relative">
                <Users className="h-7 w-7 mx-auto mb-3 text-white/60" />
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-medium">
                  Registered Participants
                </p>
                <p className="text-6xl font-black text-white mt-2 leading-none">
                  {participantCount}
                </p>
                <p className="text-sm text-white/40 mt-2">
                  across {teamCount} team{teamCount !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            {/* Register CTA (sidebar - hidden on mobile) */}
            <div className="hidden lg:block">
              <RegistrationStatus
                competitionId={comp.id}
                competitionStatus={comp.status}
                registrationEnd={comp.registrationEnd?.toISOString() ?? null}
                submissionEnd={comp.submissionEnd?.toISOString() ?? null}
                registration={registrationData}
                submission={submissionData}
                isAuthenticated={!!userId}
              />
            </div>

            {/* Sponsor card */}
            <Card className="shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  Organized by
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-card">
                    {result.orgLogo ? (
                      <Image
                        src={result.orgLogo}
                        alt={result.orgName ?? ""}
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded-lg object-cover"
                      />
                    ) : (
                      <Building2 className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold">{result.orgName}</p>
                    {result.orgWebsite && (
                      <a
                        href={result.orgWebsite}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <Globe className="h-3 w-3" />
                        {result.orgWebsite.replace(/^https?:\/\//, "")}
                      </a>
                    )}
                  </div>
                </div>
                {result.orgDescription && (
                  <p className="mt-3 text-sm text-muted-foreground line-clamp-3">
                    {result.orgDescription}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card className="shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-500/5">
                    <Calendar className="h-4 w-4 text-blue-400" />
                  </div>
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TimelineDisplay
                  registrationStart={comp.registrationStart}
                  registrationEnd={comp.registrationEnd}
                  submissionStart={comp.submissionStart}
                  submissionEnd={comp.submissionEnd}
                  judgingStart={comp.judgingStart}
                  judgingEnd={comp.judgingEnd}
                  resultsDate={comp.resultsDate}
                />
              </CardContent>
            </Card>

            {/* Details */}
            <Card className="shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Participants</span>
                  <span className="font-semibold">{participantCount}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Teams</span>
                  <span className="font-semibold">{teamCount}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Team Size</span>
                  <span>
                    {comp.minTeamSize}–{comp.maxTeamSize} members
                  </span>
                </div>
                {comp.maxParticipants && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Max Spots</span>
                      <span>{comp.maxParticipants}</span>
                    </div>
                  </>
                )}
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Solo Allowed</span>
                  <span>{comp.allowSoloParticipation ? "Yes" : "No"}</span>
                </div>
                {comp.totalPrizePool ? (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Trophy className="h-3.5 w-3.5" /> Prize Pool
                      </span>
                      <span className="font-bold text-primary">
                        PKR {comp.totalPrizePool.toLocaleString()}
                      </span>
                    </div>
                  </>
                ) : null}
              </CardContent>
            </Card>

            {/* Submission Requirements */}
            {reqs && (
              <Card className="shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-500/5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </div>
                    Submission Requirements
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5 text-sm">
                  {reqs.githubRequired && (
                    <div className="flex items-center gap-2.5 rounded-lg border border-border p-2.5">
                      <Github className="h-4 w-4 text-primary" />
                      <span>GitHub Repository</span>
                    </div>
                  )}
                  {reqs.videoRequired && (
                    <div className="flex items-center gap-2.5 rounded-lg border border-border p-2.5">
                      <Video className="h-4 w-4 text-primary" />
                      <span>Demo Video</span>
                    </div>
                  )}
                  {reqs.deployedUrlRequired && (
                    <div className="flex items-center gap-2.5 rounded-lg border border-border p-2.5">
                      <Link2 className="h-4 w-4 text-primary" />
                      <span>Live Demo URL</span>
                    </div>
                  )}
                  {reqs.pitchDeckRequired && (
                    <div className="flex items-center gap-2.5 rounded-lg border border-border p-2.5">
                      <FileText className="h-4 w-4 text-primary" />
                      <span>Pitch Deck</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Target Participants */}
            {targetParticipants.length > 0 && !targetParticipants.includes("all") && (
              <Card className="shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-500/5">
                      <Target className="h-4 w-4 text-purple-500" />
                    </div>
                    Target Audience
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5">
                    {targetParticipants.map((tp) => (
                      <span
                        key={tp}
                        className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                      >
                        {tp.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
