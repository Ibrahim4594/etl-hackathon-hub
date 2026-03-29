import { serverAuth } from "@/lib/auth/server-auth";
import { db } from "@/lib/db";
import { teams, teamMembers, competitions, submissions, users } from "@/lib/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { resolveOnboardingUser } from "@/lib/auth/resolve-onboarding-user";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Trophy, Crown, UserCheck, FileText, ArrowRight } from "lucide-react";
import Link from "next/link";
import { JoinTeamForm } from "@/components/teams/join-team-form";
import { CopyInviteCode } from "@/components/teams/copy-invite-code";

const COMPETITION_STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/10 text-green-400 border-green-500/20",
  judging: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  completed: "bg-muted text-muted-foreground border-border",
  approved: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  pending_review: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
};

const SUB_STATUS_COLORS: Record<string, string> = {
  submitted: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  valid: "bg-green-500/10 text-green-400 border-green-500/20",
  invalid: "bg-red-500/10 text-red-400 border-red-500/20",
  flagged: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  ai_evaluated: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  judged: "bg-primary/10 text-primary border-primary/20",
  finalist: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  winner: "bg-green-500/10 text-green-400 border-green-500/20",
};

function formatStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function StudentTeamsPage() {
  const { userId: clerkId } = await serverAuth();
  if (!clerkId) redirect("/sign-in");

  const dbUser = await resolveOnboardingUser(clerkId);
  if (!dbUser || !dbUser.onboardingComplete) redirect("/onboarding");

  const myTeams = await db
    .select({
      teamId: teams.id,
      teamName: teams.name,
      inviteCode: teams.inviteCode,
      role: teamMembers.role,
      competitionId: competitions.id,
      competitionTitle: competitions.title,
      competitionSlug: competitions.slug,
      competitionStatus: competitions.status,
      totalPrizePool: competitions.totalPrizePool,
      maxTeamSize: competitions.maxTeamSize,
    })
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .innerJoin(competitions, eq(teams.competitionId, competitions.id))
    .where(eq(teamMembers.userId, dbUser.id));

  // Get member counts and submission status per team
  const teamIds = myTeams.map((t) => t.teamId);
  const memberCountMap = new Map<string, number>();
  const memberNamesMap = new Map<string, { name: string; role: string }[]>();
  const submissionMap = new Map<string, { id: string; status: string; title: string }>();

  if (teamIds.length > 0) {
    // Member counts
    const memberCounts = await db
      .select({
        teamId: teamMembers.teamId,
        count: sql<number>`count(*)`,
      })
      .from(teamMembers)
      .where(inArray(teamMembers.teamId, teamIds))
      .groupBy(teamMembers.teamId);

    for (const row of memberCounts) {
      memberCountMap.set(row.teamId, Number(row.count));
    }

    // Member names
    const allMembers = await db
      .select({
        teamId: teamMembers.teamId,
        firstName: users.firstName,
        lastName: users.lastName,
        role: teamMembers.role,
      })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(inArray(teamMembers.teamId, teamIds));

    for (const m of allMembers) {
      const name = [m.firstName, m.lastName].filter(Boolean).join(" ") || "Member";
      const existing = memberNamesMap.get(m.teamId) ?? [];
      existing.push({ name, role: m.role });
      memberNamesMap.set(m.teamId, existing);
    }

    // Submissions
    const teamSubs = await db
      .select({
        teamId: submissions.teamId,
        id: submissions.id,
        status: submissions.status,
        title: submissions.title,
      })
      .from(submissions)
      .where(inArray(submissions.teamId, teamIds));

    for (const s of teamSubs) {
      submissionMap.set(s.teamId, s);
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5">
            <Users className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">My Teams</h1>
            <p className="text-sm text-muted-foreground">
              Manage your teams across competitions
            </p>
          </div>
        </div>
        <Link href="/competitions">
          <Button size="sm">Find Competitions</Button>
        </Link>
      </div>

      {/* Join Team Section */}
      <JoinTeamForm />

      {myTeams.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No teams yet"
          description="Register for a competition to create or join a team, or enter an invite code above."
        >
          <Link href="/competitions">
            <Button>Browse Competitions</Button>
          </Link>
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {myTeams.map((t) => {
            const memberCount = memberCountMap.get(t.teamId) ?? 1;
            const members = memberNamesMap.get(t.teamId) ?? [];
            const sub = submissionMap.get(t.teamId);
            const isFull = memberCount >= t.maxTeamSize;

            return (
              <div
                key={t.teamId}
                className="rounded-xl border border-border bg-card shadow-md transition-all hover:border-primary/30 hover:shadow-lg"
              >
                {/* Card header */}
                <div className="flex items-start justify-between gap-3 p-5 pb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-500/5">
                        <Users className="h-4 w-4 text-blue-400" />
                      </div>
                      <h3 className="truncate font-semibold">{t.teamName}</h3>
                    </div>
                    <Link
                      href={`/competitions/${t.competitionSlug}`}
                      className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary"
                    >
                      <Trophy className="h-3 w-3 shrink-0" />
                      <span className="truncate">{t.competitionTitle}</span>
                    </Link>
                  </div>
                  <Badge
                    variant={t.role === "lead" ? "default" : "secondary"}
                    className="shrink-0 gap-1"
                  >
                    {t.role === "lead" ? (
                      <Crown className="h-3 w-3" />
                    ) : (
                      <UserCheck className="h-3 w-3" />
                    )}
                    {t.role === "lead" ? "Lead" : "Member"}
                  </Badge>
                </div>

                {/* Members */}
                <div className="px-5 pb-3">
                  <p className="text-xs text-muted-foreground mb-1.5">
                    {memberCount}/{t.maxTeamSize} members {isFull && <span className="text-amber-400">(Full)</span>}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {members.map((m, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[11px]"
                      >
                        {m.role === "lead" && <Crown className="h-2.5 w-2.5 text-primary" />}
                        {m.name}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Submission status */}
                <div className="px-5 pb-3">
                  {sub ? (
                    <Link
                      href={`/student/submissions/${sub.id}`}
                      className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-2 text-xs transition-colors hover:bg-muted/50"
                    >
                      <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="truncate flex-1 font-medium">{sub.title}</span>
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                          SUB_STATUS_COLORS[sub.status] ?? "border-border bg-muted text-muted-foreground"
                        }`}
                      >
                        {formatStatus(sub.status)}
                      </span>
                    </Link>
                  ) : (
                    t.competitionStatus === "active" && t.role === "lead" && (
                      <Link
                        href={`/student/submissions/new/${t.competitionId}`}
                        className="flex items-center gap-2 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-2 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                      >
                        <FileText className="h-3.5 w-3.5 shrink-0" />
                        Submit Project
                        <ArrowRight className="h-3 w-3 ml-auto" />
                      </Link>
                    )
                  )}
                </div>

                {/* Card footer */}
                <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3">
                  <CopyInviteCode code={t.inviteCode} />
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                      COMPETITION_STATUS_COLORS[t.competitionStatus] ??
                      "border-border bg-muted text-muted-foreground"
                    }`}
                  >
                    {formatStatus(t.competitionStatus)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
