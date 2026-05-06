"use client";

import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { InviteJudgeDialog } from "@/components/judge/invite-judge-dialog";
import { PublishButton } from "@/components/competitions/publish-button";
import { GoLiveButton } from "@/components/competitions/go-live-button";
import { AnnounceWinnersDialog } from "@/components/competitions/announce-winners-dialog";
import { AutoAssignButton } from "@/components/competitions/auto-assign-button";
import { AssignSubmissionDialog } from "@/components/submissions/assign-submission-dialog";
import { ExtendDeadlinesDialog } from "@/components/competitions/extend-deadlines-dialog";
import {
  Edit,
  Trophy,
  Users,
  FileText,
  Gavel,
  BarChart3,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Star,
  ArrowUpRight,
  TrendingUp,
  Target,
  Award,
  Building2,
  ListChecks,
  SlidersHorizontal,
  Info,
  Pencil,
} from "lucide-react";
import { COMPETITION_STATUS_CONFIG, getSubmissionStatusLabel } from "@/lib/constants/status-colors";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface CompetitionData {
  id: string;
  title: string;
  slug: string;
  tagline: string | null;
  description: string;
  category: string | null;
  status: string;
  totalPrizePool: number | null;
  registrationStart: string | null;
  registrationEnd: string | null;
  submissionStart: string | null;
  submissionEnd: string | null;
  judgingStart: string | null;
  judgingEnd: string | null;
  resultsDate: string | null;
  createdAt: string;
  updatedAt: string;
  organizationName: string;
  maxTeamSize: number;
  minTeamSize: number;
  maxParticipants: number | null;
  aiJudgingWeight: number | null;
  humanJudgingWeight: number | null;
  tags: string[];
  prizes: { position: number; title: string; amount: number; currency: string; description?: string }[];
  submissionRequirements: {
    githubRequired: boolean;
    videoRequired: boolean;
    deployedUrlRequired: boolean;
    pitchDeckRequired: boolean;
    maxScreenshots: number;
  } | null;
  judgingCriteria: { name: string; description: string; weight: number; maxScore: number }[];
  coverImageUrl: string | null;
  logoUrl: string | null;
  organizationLogoUrl: string | null;
}

interface SubmissionRow {
  id: string;
  title: string;
  status: string;
  aiScore: number | null;
  humanScore: number | null;
  finalScore: number | null;
  createdAt: string;
  teamName: string;
}

interface JudgeRow {
  assignmentId: string;
  assignedAt: string;
  judgeId: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  evaluationCount: number;
}

interface StatusCounts {
  submitted: number;
  validating: number;
  valid: number;
  invalid: number;
  flagged: number;
  ai_evaluated: number;
  judged: number;
  finalist: number;
  winner: number;
}

interface SponsorRow {
  id: string;
  companyName: string;
  logoUrl: string | null;
  sponsorTier: string;
  contributionType: string;
  contributionTitle: string;
  isOrganizer: boolean | null;
}

interface Props {
  competition: CompetitionData;
  submissions: SubmissionRow[];
  judges: JudgeRow[];
  sponsors: SponsorRow[];
  statusCounts: StatusCounts;
  totalTeams: number;
  totalParticipants: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const SUB_STATUS_CONFIG: Record<string, { color: string; icon: typeof CheckCircle2 }> = {
  submitted: { color: "text-blue-400", icon: Clock },
  validating: { color: "text-amber-400", icon: Clock },
  valid: { color: "text-emerald-400", icon: CheckCircle2 },
  invalid: { color: "text-red-400", icon: XCircle },
  flagged: { color: "text-amber-500", icon: AlertTriangle },
  ai_evaluated: { color: "text-purple-400", icon: Star },
  judged: { color: "text-blue-500", icon: Gavel },
  finalist: { color: "text-primary", icon: Trophy },
  winner: { color: "text-amber-400", icon: Trophy },
};

const SPONSOR_TIER_COLORS: Record<string, string> = {
  title: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  gold: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  silver: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  bronze: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  partner: "bg-blue-500/10 text-blue-600 border-blue-500/20",
};

function fmtDate(d: string | null) {
  if (!d) return "Not set";
  return format(new Date(d), "MMM d, yyyy");
}

function fmtScore(v: number | null) {
  if (v === null || v === undefined) return "—";
  return v.toFixed(1);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function CompetitionDetailTabs({
  competition,
  submissions,
  judges,
  sponsors,
  statusCounts,
  totalTeams,
  totalParticipants,
}: Props) {
  const c = competition;
  const cfg = COMPETITION_STATUS_CONFIG[c.status] ?? COMPETITION_STATUS_CONFIG.pending_review;
  const isEditable = c.status === "pending_review" || c.status === "draft" || c.status === "cancelled";
  const isLive = c.status === "active";
  const totalSubs = submissions.length;

  const avgHuman =
    submissions.filter((s) => s.humanScore !== null).reduce((a, s) => a + (s.humanScore ?? 0), 0) /
      (submissions.filter((s) => s.humanScore !== null).length || 1) || 0;

  return (
    <div className="space-y-6">
      {/* ── Hero Header ─────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border/50 bg-gradient-to-b from-muted/40 to-muted/20 p-6 md:p-8">

        <div className="relative">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${cfg.bg} ${cfg.color} border-current/20`}
                >
                  {isLive && (
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                    </span>
                  )}
                  {cfg.label}
                </span>
                {c.category && (
                  <span className="text-xs text-muted-foreground">{c.category}</span>
                )}
              </div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{c.title}</h1>
              {c.tagline && (
                <p className="max-w-2xl text-sm text-muted-foreground">{c.tagline}</p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {(isEditable || c.status === "pending_review") && (
                <>
                  {isEditable && (
                    <Link href={`/organizer/competitions/new?edit=${c.id}`}>
                      <Button variant="outline" size="sm">
                        <Edit className="mr-1.5 h-3.5 w-3.5" />
                        Edit
                      </Button>
                    </Link>
                  )}
                  {isEditable && <PublishButton competitionId={c.id} />}
                </>
              )}
              {c.status === "approved" && (
                <GoLiveButton competitionId={c.id} />
              )}
              {(c.status === "judging" || c.status === "completed") && (
                <AnnounceWinnersDialog
                  competitionId={c.id}
                  submissions={submissions}
                />
              )}
              {(c.status === "approved" || c.status === "active" || c.status === "judging") && (
                <InviteJudgeDialog competitionId={c.id} />
              )}
              {(c.status === "approved" || c.status === "active" || c.status === "judging") && (
                <ExtendDeadlinesDialog
                  competitionId={c.id}
                  registrationEnd={c.registrationEnd}
                  submissionEnd={c.submissionEnd}
                  judgingEnd={c.judgingEnd}
                  resultsDate={c.resultsDate}
                />
              )}
              {c.slug && (
                <Link href={`/competitions/${c.slug}`} target="_blank">
                  <Button variant="ghost" size="sm">
                    <ArrowUpRight className="mr-1.5 h-3.5 w-3.5" />
                    Public Page
                  </Button>
                </Link>
              )}
              {c.slug && (c.status === "active" || c.status === "judging" || c.status === "completed") && (
                <Link href={`/competitions/${c.slug}/leaderboard`} target="_blank">
                  <Button variant="ghost" size="sm">
                    <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
                    Leaderboard
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Quick Stats Pills */}
          <div className="mt-5 flex flex-wrap gap-3">
            {[
              { icon: Trophy, label: `PKR ${(c.totalPrizePool ?? 0).toLocaleString()}`, sub: "Prize Pool" },
              { icon: Users, label: String(totalParticipants), sub: "Participants" },
              { icon: FileText, label: String(totalSubs), sub: "Submissions" },
              { icon: Gavel, label: String(judges.length), sub: "Judges" },
              { icon: Users, label: String(totalTeams), sub: "Teams" },
            ].map((pill) => (
              <div
                key={pill.sub}
                className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-1.5"
              >
                <pill.icon className="h-3.5 w-3.5 text-primary" />
                <span className="text-sm font-semibold">{pill.label}</span>
                <span className="text-xs text-muted-foreground">{pill.sub}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────── */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 rounded-xl bg-muted/50 p-1">
          <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="submissions" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <FileText className="mr-1.5 h-3.5 w-3.5" />
            Submissions
            {totalSubs > 0 && (
              <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                {totalSubs}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ─── Overview Tab ──────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-6">
          {/* Cover image + logos banner */}
          {(c.coverImageUrl || c.logoUrl || c.organizationLogoUrl) && (
            <Card className="overflow-hidden border-border/50 shadow-sm">
              {c.coverImageUrl && (
                <div className="relative h-40 w-full sm:h-52">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.coverImageUrl}
                    alt={`${c.title} cover`}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <CardContent className="flex flex-wrap items-center gap-4 p-4">
                {c.logoUrl && (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-card">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.logoUrl} alt="Competition logo" className="h-full w-full object-contain" />
                  </div>
                )}
                {c.organizationLogoUrl && (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-card">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.organizationLogoUrl} alt={c.organizationName} className="h-full w-full object-cover" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">Organization</p>
                  <p className="text-sm font-semibold">{c.organizationName}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Draft edit note */}
          {isEditable && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <Info className="h-4 w-4 shrink-0 text-amber-500" />
              <p className="text-xs text-amber-600">
                Competition fields can only be edited while in review.{" "}
                <Link href={`/organizer/competitions/new?edit=${c.id}`} className="font-medium underline">
                  Edit competition
                </Link>
              </p>
            </div>
          )}

          {/* Approved/Live edit note */}
          {(c.status === "approved" || c.status === "active") && (
            <div className="flex items-center gap-2 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
              <Info className="h-4 w-4 shrink-0 text-blue-500" />
              <p className="text-xs text-blue-600 dark:text-blue-400">
                {c.status === "approved"
                  ? "Approved competitions cannot be edited. To make changes, click Unpublish to send it back for review."
                  : "Live competitions cannot be fully edited. Use Extend Deadlines for date changes, or Unpublish to make broader edits."}
              </p>
            </div>
          )}

          {/* Submission Pipeline */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                Submission Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(
                  [
                    { key: "submitted", label: "Submitted", color: "bg-blue-500" },
                    { key: "valid", label: "Valid", color: "bg-emerald-500" },
                    { key: "judged", label: "Judged", color: "bg-amber-500" },
                    { key: "finalist", label: "Finalists", color: "bg-primary" },
                  ] as const
                ).map((stage) => {
                  const val = statusCounts[stage.key] ?? 0;
                  const pct = totalSubs > 0 ? (val / totalSubs) * 100 : 0;
                  return (
                    <div key={stage.key} className="space-y-1.5 text-center">
                      <p className="text-2xl font-bold">{val}</p>
                      <Progress value={pct} className="h-1.5" />
                      <p className="text-[11px] text-muted-foreground">{stage.label}</p>
                    </div>
                  );
                })}
              </div>
              {(statusCounts.invalid > 0 || statusCounts.flagged > 0) && (
                <div className="mt-4 flex gap-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                  <p className="text-xs text-amber-500">
                    {statusCounts.invalid > 0 && `${statusCounts.invalid} invalid`}
                    {statusCounts.invalid > 0 && statusCounts.flagged > 0 && " · "}
                    {statusCounts.flagged > 0 && `${statusCounts.flagged} flagged`}
                    {" — review these submissions for issues."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Score Overview + Details */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-500/5">
                    <Star className="h-4 w-4 text-purple-400" />
                  </div>
                  Score Averages
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Avg Judge Score</span>
                  <div className="flex items-center gap-2">
                    <Progress value={avgHuman * 10} className="h-2 w-20" />
                    <span className="text-sm font-semibold">{avgHuman > 0 ? avgHuman.toFixed(1) : "—"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-500/5">
                    <Target className="h-4 w-4 text-blue-400" />
                  </div>
                  Competition Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Team Size", value: `${c.minTeamSize} – ${c.maxTeamSize} members` },
                  { label: "Max Participants", value: c.maxParticipants ? String(c.maxParticipants) : "Unlimited" },
                  { label: "Created", value: fmtDate(c.createdAt) },
                  { label: "Last Updated", value: fmtDate(c.updatedAt) },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-medium">{row.value}</span>
                  </div>
                ))}
                {c.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {c.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Timeline */}
          <Card className={`border-border/50 shadow-sm${!isEditable ? " pointer-events-none" : ""}`}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-500/5">
                  <Clock className="h-4 w-4 text-blue-400" />
                </div>
                Competition Timeline
                {isEditable && <Pencil className="h-3.5 w-3.5 text-muted-foreground" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { phase: "Registration", start: c.registrationStart, end: c.registrationEnd },
                { phase: "Submission", start: c.submissionStart, end: c.submissionEnd },
                { phase: "Judging", start: c.judgingStart, end: c.judgingEnd },
                { phase: "Results", start: c.resultsDate, end: null },
              ].map(({ phase, start, end }) => (
                <div key={phase} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{phase}</span>
                  <span className="font-medium tabular-nums text-right">
                    {start ? fmtDate(start) : "—"}
                    {end ? ` → ${fmtDate(end)}` : ""}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Description */}
          {c.description && (
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">About this Competition</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {c.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Prizes */}
          <Card className={`border-border/50 shadow-sm${!isEditable ? " pointer-events-none" : ""}`}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-500/5">
                  <Award className="h-4 w-4 text-amber-500" />
                </div>
                Prize Breakdown
                {isEditable && <Pencil className="h-3.5 w-3.5 text-muted-foreground" />}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {c.prizes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No prizes configured yet.</p>
              ) : (
                <div className="space-y-3">
                  {c.prizes.map((prize) => (
                    <div key={prize.position} className="flex items-start justify-between gap-4 rounded-lg border border-border/50 p-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                            {prize.position}
                          </span>
                          <span className="text-sm font-semibold">{prize.title}</span>
                        </div>
                        {prize.description && (
                          <p className="mt-1 text-xs text-muted-foreground">{prize.description}</p>
                        )}
                      </div>
                      <span className="shrink-0 text-sm font-bold text-primary">
                        {prize.currency} {prize.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sponsors */}
          <Card className={`border-border/50 shadow-sm${!isEditable ? " pointer-events-none" : ""}`}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-500/5">
                  <Building2 className="h-4 w-4 text-blue-400" />
                </div>
                Sponsors
                {isEditable && <Pencil className="h-3.5 w-3.5 text-muted-foreground" />}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sponsors.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sponsors added yet.</p>
              ) : (
                <div className="space-y-2">
                  {sponsors.map((s) => (
                    <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/50 p-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{s.companyName}</span>
                          {s.isOrganizer && (
                            <Badge variant="outline" className="shrink-0 text-[10px]">Organizer</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{s.contributionTitle}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`shrink-0 text-[10px] font-semibold capitalize ${SPONSOR_TIER_COLORS[s.sponsorTier] ?? ""}`}
                      >
                        {s.sponsorTier}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submission Requirements */}
          <Card className={`border-border/50 shadow-sm${!isEditable ? " pointer-events-none" : ""}`}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-500/5">
                  <ListChecks className="h-4 w-4 text-emerald-500" />
                </div>
                Submission Requirements
                {isEditable && <Pencil className="h-3.5 w-3.5 text-muted-foreground" />}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!c.submissionRequirements ? (
                <p className="text-sm text-muted-foreground">No submission requirements configured.</p>
              ) : (
                <div className="space-y-2">
                  {(
                    [
                      { label: "GitHub repo required", value: c.submissionRequirements.githubRequired },
                      { label: "Video demo required", value: c.submissionRequirements.videoRequired },
                      { label: "Deployed URL required", value: c.submissionRequirements.deployedUrlRequired },
                      { label: "Pitch deck required", value: c.submissionRequirements.pitchDeckRequired },
                    ] as const
                  ).map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{label}</span>
                      <span className={value ? "font-medium text-emerald-500" : "text-muted-foreground"}>
                        {value ? "Yes" : "No"}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Max screenshots</span>
                    <span className="font-medium">{c.submissionRequirements.maxScreenshots}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Judging Configuration */}
          <Card className={`border-border/50 shadow-sm${!isEditable ? " pointer-events-none" : ""}`}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-500/5">
                  <SlidersHorizontal className="h-4 w-4 text-purple-400" />
                </div>
                Judging Configuration
                {isEditable && <Pencil className="h-3.5 w-3.5 text-muted-foreground" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">AI judging weight</span>
                <span className="font-semibold">{c.aiJudgingWeight}%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Human judging weight</span>
                <span className="font-semibold">{c.humanJudgingWeight}%</span>
              </div>
              {c.judgingCriteria.length > 0 && (
                <div className="space-y-2 pt-1">
                  <p className="text-xs font-medium text-muted-foreground">Criteria</p>
                  {c.judgingCriteria.map((criterion) => (
                    <div key={criterion.name} className="flex items-center justify-between rounded-lg border border-border/50 p-2.5 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{criterion.name}</p>
                        {criterion.description && (
                          <p className="text-xs text-muted-foreground">{criterion.description}</p>
                        )}
                      </div>
                      <span className="ml-4 shrink-0 text-xs text-muted-foreground">
                        {criterion.weight}% · max {criterion.maxScore}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {c.judgingCriteria.length === 0 && (
                <p className="text-sm text-muted-foreground">No custom judging criteria defined.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Submissions Tab ───────────────────────────────────── */}
        <TabsContent value="submissions" className="space-y-6">
          {/* Assignment toolbar: auto-assign + manual per-row */}
          {submissions.length > 0 && judges.length > 0 && (
            <Card className="border-border/50 shadow-sm">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-sm font-semibold">Judge Assignment</p>
                  <p className="text-xs text-muted-foreground">
                    Auto-assign distributes submissions evenly across {judges.length} judge{judges.length !== 1 ? "s" : ""}. Or click Assign on any submission to pick manually.
                  </p>
                </div>
                <AutoAssignButton competitionId={c.id} judgesCount={judges.length} />
              </CardContent>
            </Card>
          )}
          {submissions.length === 0 ? (
            <Card className="border-border/50 shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5">
                  <FileText className="h-7 w-7 text-primary" />
                </div>
                <p className="mt-4 text-sm font-medium">No submissions yet</p>
                <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                  Submissions will appear here as teams submit their projects.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {submissions.map((sub, i) => {
                const scfg = SUB_STATUS_CONFIG[sub.status] ?? SUB_STATUS_CONFIG.submitted;
                const StatusIcon = scfg.icon;
                const judgeOptions = judges.map((j) => ({
                  id: j.judgeId,
                  name: [j.firstName, j.lastName].filter(Boolean).join(" ") || "Unnamed Judge",
                  email: j.email,
                }));
                return (
                  <Card key={sub.id} className="border-border/50 shadow-md transition-all hover:border-primary/20 hover:shadow-sm">
                    <CardContent className="flex items-center gap-4 p-4">
                      {/* Rank */}
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/50 text-sm font-bold text-muted-foreground">
                        #{i + 1}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/organizer/competitions/${c.id}/submissions/${sub.id}`}
                          className="truncate text-sm font-semibold hover:text-primary transition-colors"
                        >
                          {sub.title}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          by {sub.teamName} · {formatDistanceToNow(new Date(sub.createdAt), { addSuffix: true })}
                        </p>
                      </div>

                      {/* Status */}
                      <div className="flex items-center gap-1.5">
                        <StatusIcon className={`h-3.5 w-3.5 ${scfg.color}`} />
                        <span className={`text-xs font-medium ${scfg.color}`}>
                          {getSubmissionStatusLabel(sub.status)}
                        </span>
                      </div>

                      {/* Scores */}
                      <div className="hidden items-center gap-4 text-xs sm:flex">
                        <div className="text-center">
                          <p className="font-semibold">{fmtScore(sub.aiScore)}</p>
                          <p className="text-muted-foreground">AI</p>
                        </div>
                        <div className="text-center">
                          <p className="font-semibold">{fmtScore(sub.humanScore)}</p>
                          <p className="text-muted-foreground">Human</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-primary">{fmtScore(sub.finalScore)}</p>
                          <p className="text-muted-foreground">Final</p>
                        </div>
                      </div>

                      {/* Assign button */}
                      {judges.length > 0 && (
                        <AssignSubmissionDialog
                          submissionId={sub.id}
                          submissionTitle={sub.title}
                          judges={judgeOptions}
                        />
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>


      </Tabs>
    </div>
  );
}
