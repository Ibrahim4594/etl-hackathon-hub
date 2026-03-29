import { serverAuth } from "@/lib/auth/server-auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  submissions,
  teams,
  competitions,
  judgeAssignments,
  judgeEvaluations,
} from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { resolveOnboardingUser } from "@/lib/auth/resolve-onboarding-user";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gavel, ArrowRight, CheckCircle } from "lucide-react";
import Link from "next/link";

const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  valid: "bg-green-500/10 text-green-400 border-green-500/20",
  ai_evaluated: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  judged: "bg-primary/10 text-primary border-primary/20",
};

function formatStatus(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function JudgeEvaluatePage() {
  const { userId: clerkId } = await serverAuth();
  if (!clerkId) redirect("/sign-in");

  const dbUser = await resolveOnboardingUser(clerkId);
  if (!dbUser) redirect("/onboarding");
  if (dbUser.role !== "judge" && dbUser.role !== "admin") redirect("/");

  // Get competitions this judge is assigned to
  const assignedComps = await db
    .select({
      competitionId: judgeAssignments.competitionId,
      competitionTitle: competitions.title,
    })
    .from(judgeAssignments)
    .innerJoin(
      competitions,
      eq(judgeAssignments.competitionId, competitions.id)
    )
    .where(eq(judgeAssignments.judgeId, dbUser.id));

  const compIds = assignedComps.map((c) => c.competitionId);

  if (compIds.length === 0) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold">Evaluate Submissions</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Review and score assigned submissions
          </p>
        </div>
        <EmptyState
          icon={Gavel}
          title="No assignments yet"
          description="You'll see submissions to evaluate here once you're assigned to a competition."
        />
      </div>
    );
  }

  // Get all submissions for assigned competitions
  const allSubmissions = await db
    .select({
      submissionId: submissions.id,
      submissionTitle: submissions.title,
      submissionStatus: submissions.status,
      teamName: teams.name,
      competitionId: competitions.id,
      competitionTitle: competitions.title,
      createdAt: submissions.createdAt,
    })
    .from(submissions)
    .innerJoin(teams, eq(submissions.teamId, teams.id))
    .innerJoin(competitions, eq(submissions.competitionId, competitions.id))
    .where(
      sql`${submissions.competitionId} IN (${sql.join(
        compIds.map((id) => sql`${id}`),
        sql`, `
      )})`
    )
    .orderBy(desc(submissions.createdAt));

  // Check which ones this judge already evaluated
  const myEvaluations = await db
    .select({ submissionId: judgeEvaluations.submissionId })
    .from(judgeEvaluations)
    .where(eq(judgeEvaluations.judgeId, dbUser.id));

  const evaluatedSet = new Set(myEvaluations.map((e) => e.submissionId));

  const pending = allSubmissions.filter(
    (s) => !evaluatedSet.has(s.submissionId)
  );
  const completed = allSubmissions.filter((s) =>
    evaluatedSet.has(s.submissionId)
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Evaluate Submissions</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {pending.length} pending, {completed.length} completed
        </p>
      </div>

      {allSubmissions.length === 0 ? (
        <EmptyState
          icon={Gavel}
          title="No submissions to review"
          description="Submissions will appear here once participants submit their projects."
        />
      ) : (
        <div className="space-y-3">
          {pending.length > 0 && (
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Pending Review ({pending.length})
            </p>
          )}
          {pending.map((s) => (
            <Link
              key={s.submissionId}
              href={`/judge/evaluate/${s.submissionId}`}
              className="group block"
            >
              <Card className="rounded-xl border border-border/50 hover:border-primary/20 hover:shadow-md transition-all">
                <CardContent className="p-5 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate group-hover:text-primary transition-colors">
                      {s.submissionTitle}
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {s.teamName} &middot; {s.competitionTitle}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                        STATUS_COLORS[s.submissionStatus] ??
                        "bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      {formatStatus(s.submissionStatus)}
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}

          {completed.length > 0 && (
            <>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mt-6">
                Completed ({completed.length})
              </p>
              {completed.map((s) => (
                <Link
                  key={s.submissionId}
                  href={`/judge/evaluate/${s.submissionId}`}
                  className="group block"
                >
                  <Card className="rounded-xl border border-border/50 opacity-70 hover:opacity-100 transition-all">
                    <CardContent className="p-5 flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">
                          {s.submissionTitle}
                        </p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {s.teamName} &middot; {s.competitionTitle}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-emerald-500">
                        <CheckCircle className="h-3.5 w-3.5" />
                        Scored
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
