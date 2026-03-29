import { serverAuth } from "@/lib/auth/server-auth";
import { db } from "@/lib/db";
import {
  users,
  competitions,
  finalRankings,
  submissions,
  teams,
  judgeAssignments,
} from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Trophy,
  Medal,
  ArrowLeft,
  Award,
  BarChart3,
} from "lucide-react";

function getRankStyle(rank: number): string {
  switch (rank) {
    case 1:
      return "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800";
    case 2:
      return "bg-gray-50 border-gray-200 dark:bg-gray-900/20 dark:border-gray-700";
    case 3:
      return "bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800";
    default:
      return "";
  }
}

function getRankIcon(rank: number) {
  switch (rank) {
    case 1:
      return <Trophy className="h-5 w-5 text-yellow-500" />;
    case 2:
      return <Medal className="h-5 w-5 text-gray-400" />;
    case 3:
      return <Medal className="h-5 w-5 text-orange-500" />;
    default:
      return null;
  }
}

export default async function JudgeLeaderboardPage({
  params,
}: {
  params: Promise<{ competitionId: string }>;
}) {
  const { competitionId } = await params;
  const { userId: clerkId } = await serverAuth();
  if (!clerkId) redirect("/sign-in");

  const [dbUser] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId));
  if (!dbUser || dbUser.role !== "judge") redirect("/onboarding");

  // Verify judge is assigned to this competition
  const [assignment] = await db
    .select({ id: judgeAssignments.id })
    .from(judgeAssignments)
    .where(
      and(
        eq(judgeAssignments.judgeId, dbUser.id),
        eq(judgeAssignments.competitionId, competitionId)
      )
    );

  if (!assignment) notFound();

  // Fetch competition
  const [competition] = await db
    .select({
      id: competitions.id,
      title: competitions.title,
      status: competitions.status,
    })
    .from(competitions)
    .where(eq(competitions.id, competitionId));

  if (!competition) notFound();

  // Fetch rankings
  const rankings = await db
    .select({
      id: finalRankings.id,
      rank: finalRankings.rank,
      aiScore: finalRankings.aiScore,
      humanScoreNormalized: finalRankings.humanScoreNormalized,
      finalScore: finalRankings.finalScore,
      isFinalist: finalRankings.isFinalist,
      isWinner: finalRankings.isWinner,
      submissionId: submissions.id,
      submissionTitle: submissions.title,
      teamId: teams.id,
      teamName: teams.name,
    })
    .from(finalRankings)
    .innerJoin(submissions, eq(finalRankings.submissionId, submissions.id))
    .innerJoin(teams, eq(finalRankings.teamId, teams.id))
    .where(eq(finalRankings.competitionId, competitionId))
    .orderBy(asc(finalRankings.rank));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Leaderboard"
        description={competition.title}
      >
        <Link href="/judge/assignments">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Assignments
          </Button>
        </Link>
      </PageHeader>

      {rankings.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No rankings yet"
          description="Rankings will appear here once the evaluation process is complete and final scores have been calculated."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="h-5 w-5" />
              Final Rankings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Submission</TableHead>
                  <TableHead className="text-right">AI Score</TableHead>
                  <TableHead className="text-right">Human Score</TableHead>
                  <TableHead className="text-right">Final Score</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rankings.map((ranking) => (
                  <TableRow
                    key={ranking.id}
                    className={getRankStyle(ranking.rank)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getRankIcon(ranking.rank) ?? (
                          <span className="text-sm text-muted-foreground pl-1">
                            {ranking.rank}
                          </span>
                        )}
                        {ranking.rank <= 3 && (
                          <span className="text-sm font-bold">
                            #{ranking.rank}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {ranking.teamName}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/judge/evaluate/${ranking.submissionId}`}
                        className="text-sm hover:text-primary hover:underline"
                      >
                        {ranking.submissionTitle}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {ranking.aiScore !== null
                        ? ranking.aiScore.toFixed(1)
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {ranking.humanScoreNormalized !== null
                        ? ranking.humanScoreNormalized.toFixed(1)
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-bold tabular-nums">
                        {ranking.finalScore.toFixed(1)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {ranking.isWinner && (
                          <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600 text-white">
                            Winner
                          </Badge>
                        )}
                        {ranking.isFinalist && !ranking.isWinner && (
                          <Badge variant="secondary">Finalist</Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
