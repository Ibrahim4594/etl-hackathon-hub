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
} from "lucide-react";
import { COMPETITION_STATUS_CONFIG } from "@/lib/constants/status-colors";

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

interface Props {
  competition: CompetitionData;
  submissions: SubmissionRow[];
  judges: JudgeRow[];
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
  statusCounts,
  totalTeams,
  totalParticipants,
}: Props) {
  const c = competition;
  const cfg = COMPETITION_STATUS_CONFIG[c.status] ?? COMPETITION_STATUS_CONFIG.draft;
  const isDraft = c.status === "draft";
  const isLive = c.status === "active";
  const totalSubs = submissions.length;
  const avgAi =
    submissions.filter((s) => s.aiScore !== null).reduce((a, s) => a + (s.aiScore ?? 0), 0) /
      (submissions.filter((s) => s.aiScore !== null).length || 1) || 0;
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
              {(isDraft || c.status === "pending_review") && (
                <>
                  {isDraft && (
                    <Link href={`/sponsor/competitions/new?edit=${c.id}`}>
                      <Button variant="outline" size="sm">
                        <Edit className="mr-1.5 h-3.5 w-3.5" />
                        Edit
                      </Button>
                    </Link>
                  )}
                  {isDraft && <PublishButton competitionId={c.id} />}
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
              <InviteJudgeDialog competitionId={c.id} />
              {c.slug && (
                <Link href={`/competitions/${c.slug}`} target="_blank">
                  <Button variant="ghost" size="sm">
                    <ArrowUpRight className="mr-1.5 h-3.5 w-3.5" />
                    Public Page
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
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                {(
                  [
                    { key: "submitted", label: "Submitted", color: "bg-blue-500" },
                    { key: "valid", label: "Valid", color: "bg-emerald-500" },
                    { key: "ai_evaluated", label: "AI Scored", color: "bg-purple-500" },
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
                  <span className="text-sm text-muted-foreground">AI Score</span>
                  <div className="flex items-center gap-2">
                    <Progress value={avgAi * 10} className="h-2 w-20" />
                    <span className="text-sm font-semibold">{avgAi > 0 ? avgAi.toFixed(1) : "—"}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Human Score</span>
                  <div className="flex items-center gap-2">
                    <Progress value={avgHuman * 10} className="h-2 w-20" />
                    <span className="text-sm font-semibold">{avgHuman > 0 ? avgHuman.toFixed(1) : "—"}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Judging Weights</span>
                  <span className="text-xs text-muted-foreground">
                    AI {c.aiJudgingWeight}% · Human {c.humanJudgingWeight}%
                  </span>
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
        </TabsContent>

        {/* ─── Submissions Tab ───────────────────────────────────── */}
        <TabsContent value="submissions" className="space-y-6">
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
                return (
                  <Card key={sub.id} className="border-border/50 shadow-md transition-all hover:border-primary/20 hover:shadow-sm">
                    <CardContent className="flex items-center gap-4 p-4">
                      {/* Rank */}
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/50 text-sm font-bold text-muted-foreground">
                        #{i + 1}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-semibold">{sub.title}</p>
                        <p className="text-xs text-muted-foreground">
                          by {sub.teamName} · {formatDistanceToNow(new Date(sub.createdAt), { addSuffix: true })}
                        </p>
                      </div>

                      {/* Status */}
                      <div className="flex items-center gap-1.5">
                        <StatusIcon className={`h-3.5 w-3.5 ${scfg.color}`} />
                        <span className={`text-xs font-medium ${scfg.color}`}>
                          {sub.status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
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
