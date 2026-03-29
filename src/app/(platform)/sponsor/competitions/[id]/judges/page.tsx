import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import {
  competitions,
  organizations,
  submissions,
  judgeAssignments,
  judgeEvaluations,
  users,
} from "@/lib/db/schema";
import { eq, sql, count } from "drizzle-orm";
import { resolveOnboardingUser } from "@/lib/auth/resolve-onboarding-user";
import { serverAuth } from "@/lib/auth/server-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Gavel, Users } from "lucide-react";
import Link from "next/link";
import { InviteJudgeDialog } from "@/components/judge/invite-judge-dialog";

export default async function SponsorJudgesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

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

  // Count total submissions for this competition
  const [subCountResult] = await db
    .select({ count: count() })
    .from(submissions)
    .where(eq(submissions.competitionId, id));
  const totalSubmissions = subCountResult?.count ?? 0;

  // Fetch assigned judges with evaluation progress
  const assignedJudges = await db
    .select({
      assignmentId: judgeAssignments.id,
      assignedAt: judgeAssignments.assignedAt,
      judgeId: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      evaluationCount: sql<number>`(
        SELECT count(*)
        FROM ${judgeEvaluations}
        INNER JOIN ${submissions} ON ${judgeEvaluations.submissionId} = ${submissions.id}
        WHERE ${judgeEvaluations.judgeId} = ${users.id}
          AND ${submissions.competitionId} = ${competitions.id}
      )`,
    })
    .from(judgeAssignments)
    .innerJoin(users, eq(judgeAssignments.judgeId, users.id))
    .innerJoin(competitions, eq(judgeAssignments.competitionId, competitions.id))
    .where(eq(judgeAssignments.competitionId, id));

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
            <h1 className="text-2xl font-bold">Judges</h1>
            <p className="text-sm text-muted-foreground">{competition.title}</p>
          </div>
        </div>
        <InviteJudgeDialog competitionId={id} />
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
              <Gavel className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{assignedJudges.length}</p>
              <p className="text-xs text-muted-foreground">Judges Assigned</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalSubmissions}</p>
              <p className="text-xs text-muted-foreground">Total Submissions</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
              <Gavel className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {assignedJudges.reduce((sum, j) => sum + Number(j.evaluationCount), 0)}
              </p>
              <p className="text-xs text-muted-foreground">Total Evaluations</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Judges List */}
      {assignedJudges.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <Gavel className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No judges assigned yet</h3>
            <p className="mt-1 max-w-sm text-center text-sm text-muted-foreground">
              Invite judges to start evaluating submissions for this competition.
            </p>
            <div className="mt-6">
              <InviteJudgeDialog competitionId={id} />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
                <Gavel className="h-4 w-4 text-primary" />
              </div>
              Assigned Judges
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3 text-right">Evaluations Done</th>
                    <th className="px-4 py-3 text-right">Total Submissions</th>
                    <th className="px-4 py-3">Progress</th>
                    <th className="px-4 py-3 text-right">Assigned At</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {assignedJudges.map((judge) => {
                    const done = Number(judge.evaluationCount);
                    const total = totalSubmissions;
                    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

                    return (
                      <tr
                        key={judge.assignmentId}
                        className="transition-colors hover:bg-muted/50"
                      >
                        <td className="px-4 py-3 text-sm font-medium">
                          {judge.firstName} {judge.lastName}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {judge.email}
                        </td>
                        <td className="px-4 py-3 text-right text-sm tabular-nums">
                          {done}
                        </td>
                        <td className="px-4 py-3 text-right text-sm tabular-nums text-muted-foreground">
                          {total}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-muted-foreground">
                              {pct}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                          {judge.assignedAt.toLocaleDateString("en-PK", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
