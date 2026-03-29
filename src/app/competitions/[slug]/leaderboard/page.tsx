import { db } from "@/lib/db";
import { competitions, submissions, teams, users, teamMembers } from "@/lib/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const RANK_CONFIG = [
  { icon: Trophy, color: "text-yellow-500", bg: "bg-yellow-500/10", label: "1st Place" },
  { icon: Medal, color: "text-zinc-400", bg: "bg-zinc-400/10", label: "2nd Place" },
  { icon: Award, color: "text-amber-600", bg: "bg-amber-600/10", label: "3rd Place" },
];

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function LeaderboardPage({ params }: Props) {
  const { slug } = await params;

  const [result] = await db
    .select({
      id: competitions.id,
      title: competitions.title,
      slug: competitions.slug,
      status: competitions.status,
    })
    .from(competitions)
    .where(eq(competitions.slug, slug));

  if (!result) notFound();

  // Only show leaderboard after judging starts
  const isVisible =
    result.status === "judging" || result.status === "completed";

  if (!isVisible) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <Trophy className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
        <h1 className="text-2xl font-bold">Leaderboard Not Available Yet</h1>
        <p className="mt-2 text-muted-foreground">
          The leaderboard will appear once judging begins for this competition.
        </p>
        <Link href={`/competitions/${slug}`}>
          <Button variant="outline" className="mt-6 gap-1.5 rounded-full">
            <ArrowLeft className="h-4 w-4" />
            Back to Competition
          </Button>
        </Link>
      </div>
    );
  }

  const ranked = await db
    .select({
      submissionId: submissions.id,
      title: submissions.title,
      status: submissions.status,
      finalScore: submissions.finalScore,
      aiScore: submissions.aiScore,
      humanScore: submissions.humanScore,
      rank: submissions.rank,
      teamName: teams.name,
    })
    .from(submissions)
    .innerJoin(teams, eq(submissions.teamId, teams.id))
    .where(
      and(
        eq(submissions.competitionId, result.id),
        sql`${submissions.status} NOT IN ('submitted', 'validating', 'invalid')`
      )
    )
    .orderBy(desc(submissions.finalScore));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link
            href={`/competitions/${slug}`}
            className="text-sm text-muted-foreground hover:text-primary transition-colors mb-2 inline-flex items-center gap-1"
          >
            <ArrowLeft className="h-3 w-3" />
            {result.title}
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            Leaderboard
          </h1>
        </div>
        <Badge variant={result.status === "completed" ? "default" : "secondary"}>
          {result.status === "completed" ? "Final Results" : "Live Rankings"}
        </Badge>
      </div>

      {ranked.length === 0 ? (
        <Card className="rounded-xl border border-border/50">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No scored submissions yet. Check back after judging.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {ranked.map((entry, i) => {
            const rankCfg = RANK_CONFIG[i];
            const isTopThree = i < 3;
            const RankIcon = rankCfg?.icon ?? Trophy;

            return (
              <Card
                key={entry.submissionId}
                className={`rounded-xl border transition-all ${
                  isTopThree
                    ? "border-primary/20 shadow-md"
                    : "border-border/50"
                }`}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  {/* Rank */}
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold ${
                      isTopThree
                        ? `${rankCfg!.bg} ${rankCfg!.color}`
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isTopThree ? (
                      <RankIcon className="h-5 w-5" />
                    ) : (
                      <span className="text-sm">#{i + 1}</span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{entry.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {entry.teamName}
                    </p>
                  </div>

                  {/* Score */}
                  <div className="text-right shrink-0">
                    {entry.finalScore !== null ? (
                      <p className="text-lg font-black text-primary">
                        {entry.finalScore.toFixed(1)}
                      </p>
                    ) : entry.aiScore !== null ? (
                      <p className="text-lg font-bold text-muted-foreground">
                        {entry.aiScore.toFixed(1)}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Pending</p>
                    )}
                    {entry.status === "winner" && (
                      <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 text-[10px]">
                        Winner
                      </Badge>
                    )}
                    {entry.status === "finalist" && (
                      <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                        Finalist
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
