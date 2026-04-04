import { serverAuth } from "@/lib/auth/server-auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users, judgeAssignments, judgeEvaluations, competitions } from "@/lib/db/schema";
import { eq, desc, sql, and, or } from "drizzle-orm";
import { resolveOnboardingUser } from "@/lib/auth/resolve-onboarding-user";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Gavel, ClipboardList, CheckCircle } from "lucide-react";
import { AssignJudgeDialog } from "./assign-judge-dialog";

function formatDate(date: Date | null): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export default async function AdminJudgesPage() {
  const { userId } = await serverAuth();
  if (!userId) redirect("/sign-in");

  const dbUser = await resolveOnboardingUser(userId);
  if (!dbUser || !dbUser.onboardingComplete) redirect("/onboarding");
  if (dbUser.role !== "admin") {
    redirect(dbUser.role ? `/${dbUser.role}/dashboard` : "/onboarding");
  }

  // Fetch all judges
  const judges = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      imageUrl: users.imageUrl,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.role, "judge"))
    .orderBy(desc(users.createdAt));

  // Fetch assignment counts per judge
  const assignmentCounts = await db
    .select({
      judgeId: judgeAssignments.judgeId,
      count: sql<number>`count(*)`.as("count"),
    })
    .from(judgeAssignments)
    .groupBy(judgeAssignments.judgeId);

  const assignmentMap = new Map(
    assignmentCounts.map((a) => [a.judgeId, Number(a.count)])
  );

  // Fetch evaluation counts per judge
  const evaluationCounts = await db
    .select({
      judgeId: judgeEvaluations.judgeId,
      count: sql<number>`count(*)`.as("count"),
    })
    .from(judgeEvaluations)
    .groupBy(judgeEvaluations.judgeId);

  const evaluationMap = new Map(
    evaluationCounts.map((e) => [e.judgeId, Number(e.count)])
  );

  // Compute stats
  const totalJudges = judges.length;
  const totalAssignments = Array.from(assignmentMap.values()).reduce((sum, c) => sum + c, 0);
  const totalEvaluations = Array.from(evaluationMap.values()).reduce((sum, c) => sum + c, 0);

  // Fetch active/approved competitions for the assign dialog
  const availableCompetitions = await db
    .select({
      id: competitions.id,
      title: competitions.title,
    })
    .from(competitions)
    .where(
      or(
        eq(competitions.status, "active"),
        eq(competitions.status, "approved"),
        eq(competitions.status, "judging")
      )
    )
    .orderBy(desc(competitions.createdAt));

  // Build enriched judge list
  const judgeList = judges.map((judge) => {
    const assignments = assignmentMap.get(judge.id) ?? 0;
    const evaluations = evaluationMap.get(judge.id) ?? 0;
    const progress = assignments > 0 ? Math.round((evaluations / assignments) * 100) : 0;
    const name = [judge.firstName, judge.lastName].filter(Boolean).join(" ") || "Unnamed Judge";

    return {
      ...judge,
      name,
      assignments,
      evaluations,
      progress,
    };
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Judge Management"
        description="View all judges, their assignments, and evaluation progress"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Total Judges" value={totalJudges} icon={Gavel} />
        <StatCard title="Total Assignments" value={totalAssignments} icon={ClipboardList} />
        <StatCard title="Total Evaluations" value={totalEvaluations} icon={CheckCircle} />
      </div>

      {judgeList.length === 0 ? (
        <EmptyState
          icon={Gavel}
          title="No judges"
          description="No users with the judge role exist yet. Invite judges from the Hackathon Management page."
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Assignments</TableHead>
                <TableHead>Evaluations Done</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Joined At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {judgeList.map((judge) => (
                <TableRow key={judge.id}>
                  <TableCell className="font-medium">{judge.name}</TableCell>
                  <TableCell>{judge.email}</TableCell>
                  <TableCell>{judge.assignments}</TableCell>
                  <TableCell>{judge.evaluations}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3 min-w-[120px]">
                      <Progress value={judge.progress} className="flex-1" />
                      <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">
                        {judge.progress}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(judge.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <AssignJudgeDialog
                      judgeEmail={judge.email}
                      judgeName={judge.name}
                      competitions={availableCompetitions}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {judgeList.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Showing {judgeList.length} judge{judgeList.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
