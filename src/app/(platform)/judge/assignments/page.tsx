import { serverAuth } from "@/lib/auth/server-auth";
import { db } from "@/lib/db";
import {
  users,
  judgeAssignments,
  competitions,
  organizations,
  submissions,
  judgeEvaluations,
} from "@/lib/db/schema";
import { eq, and, count, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { ClipboardList, ArrowRight, Building2 } from "lucide-react";

export default async function JudgeAssignmentsPage() {
  const { userId: clerkId } = await serverAuth();
  if (!clerkId) redirect("/sign-in");

  const [dbUser] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId));
  if (!dbUser || (dbUser.role !== "judge" && dbUser.role !== "admin")) redirect("/onboarding");

  // Fetch judge's assignments with competition and organization details
  const assignments = await db
    .select({
      assignmentId: judgeAssignments.id,
      assignedAt: judgeAssignments.assignedAt,
      competitionId: competitions.id,
      competitionTitle: competitions.title,
      competitionSlug: competitions.slug,
      competitionStatus: competitions.status,
      orgName: organizations.name,
      orgLogoUrl: organizations.logoUrl,
    })
    .from(judgeAssignments)
    .innerJoin(competitions, eq(judgeAssignments.competitionId, competitions.id))
    .innerJoin(organizations, eq(competitions.organizationId, organizations.id))
    .where(eq(judgeAssignments.judgeId, dbUser.id));

  // For each assignment, get submission count and evaluation progress
  const assignmentsWithCounts = await Promise.all(
    assignments.map(async (assignment) => {
      const [submissionCount] = await db
        .select({ value: count() })
        .from(submissions)
        .where(eq(submissions.competitionId, assignment.competitionId));

      const [evaluatedCount] = await db
        .select({ value: count() })
        .from(judgeEvaluations)
        .innerJoin(submissions, eq(judgeEvaluations.submissionId, submissions.id))
        .where(
          and(
            eq(judgeEvaluations.judgeId, dbUser.id),
            eq(submissions.competitionId, assignment.competitionId)
          )
        );

      const total = submissionCount?.value ?? 0;
      const evaluated = evaluatedCount?.value ?? 0;

      return {
        ...assignment,
        submissionCount: total,
        evaluatedCount: evaluated,
        progress: total > 0 ? Math.round((evaluated / total) * 100) : 0,
      };
    })
  );

  const statusColors: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
    active: "default",
    judging: "secondary",
    completed: "outline",
    draft: "outline",
    cancelled: "destructive",
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="My Assignments"
        description="Competitions assigned to you for evaluation"
      />

      {assignmentsWithCounts.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No assignments yet"
          description="You will be notified when you are assigned to judge a competition. Check back later."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assignmentsWithCounts.map((assignment) => (
            <Card key={assignment.assignmentId} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-lg leading-snug truncate">
                      {assignment.competitionTitle}
                    </CardTitle>
                    <CardDescription className="mt-1 flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{assignment.orgName}</span>
                    </CardDescription>
                  </div>
                  <Badge variant={statusColors[assignment.competitionStatus] ?? "outline"}>
                    {assignment.competitionStatus}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Submissions</span>
                    <span className="font-medium">{assignment.submissionCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Evaluated</span>
                    <span className="font-medium">
                      {assignment.evaluatedCount} / {assignment.submissionCount}
                    </span>
                  </div>
                  <Progress value={assignment.progress}>
                    <ProgressLabel className="text-xs text-muted-foreground">
                      Progress
                    </ProgressLabel>
                    <ProgressValue className="text-xs" />
                  </Progress>
                </div>

                <div className="mt-auto flex gap-2">
                  <Link href={`/judge/leaderboard/${assignment.competitionId}`} className="flex-1">
                    <Button className="w-full" size="sm">
                      Leaderboard
                    </Button>
                  </Link>
                  <Link href={`/competitions/${assignment.competitionSlug}`}>
                    <Button variant="outline" size="sm">
                      View
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
