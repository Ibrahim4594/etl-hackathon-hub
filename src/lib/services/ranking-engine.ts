/**
 * Ranking engine.
 *
 * Combines AI scores and human judge evaluations (z-score normalised
 * per judge) using the competition's configured weights, then writes
 * final rankings to the database.
 */

import { db } from "@/lib/db";
import {
  submissions,
  competitions,
  aiEvaluations,
  judgeEvaluations,
  finalRankings,
} from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { zScoreNormalize } from "./z-score";

// ────────────────────────── types ──────────────────────────

interface SubmissionScoreRow {
  submissionId: string;
  teamId: string;
  aiComposite: number | null;
  humanRawScores: number[]; // one composite per judge
}

// ────────────────────────── main ───────────────────────────

export async function computeRankings(
  competitionId: string
): Promise<void> {
  try {
    // 1. Fetch competition config
    const [competition] = await db
      .select()
      .from(competitions)
      .where(eq(competitions.id, competitionId));

    if (!competition) {
      throw new Error(`Competition ${competitionId} not found`);
    }

    const aiWeight = competition.aiJudgingWeight ?? 30;
    const humanWeight = competition.humanJudgingWeight ?? 70;
    const finalistCount = competition.finalistCount ?? 10;

    // 2. Fetch eligible submissions (ai_evaluated or judged)
    const eligibleSubmissions = await db
      .select()
      .from(submissions)
      .where(
        and(
          eq(submissions.competitionId, competitionId)
        )
      );

    const filtered = eligibleSubmissions.filter(
      (s) => s.status === "ai_evaluated" || s.status === "judged"
    );

    if (filtered.length === 0) {
      return;
    }

    // 3. For each submission, gather AI and human scores
    const rows: SubmissionScoreRow[] = [];

    for (const sub of filtered) {
      // AI score
      const [aiEval] = await db
        .select()
        .from(aiEvaluations)
        .where(eq(aiEvaluations.submissionId, sub.id))
        .orderBy(desc(aiEvaluations.createdAt))
        .limit(1);

      // Human judge evaluations
      const humanEvals = await db
        .select()
        .from(judgeEvaluations)
        .where(eq(judgeEvaluations.submissionId, sub.id));

      const humanRawScores = humanEvals
        .filter((e) => e.compositeScore !== null)
        .map((e) => e.compositeScore as number);

      rows.push({
        submissionId: sub.id,
        teamId: sub.teamId,
        aiComposite: aiEval?.compositeScore ?? null,
        humanRawScores,
      });
    }

    // 4. Z-score normalise human scores per judge
    //    Group all judge evaluations by judgeId, normalise within each
    //    judge, then map back to per-submission averages.

    // Collect all judge evaluations for this competition's submissions
    const submissionIds = rows.map((r) => r.submissionId);
    const allJudgeEvals: {
      judgeId: string;
      submissionId: string;
      compositeScore: number;
    }[] = [];

    for (const sid of submissionIds) {
      const evals = await db
        .select()
        .from(judgeEvaluations)
        .where(eq(judgeEvaluations.submissionId, sid));

      for (const e of evals) {
        if (e.compositeScore !== null) {
          allJudgeEvals.push({
            judgeId: e.judgeId,
            submissionId: e.submissionId,
            compositeScore: e.compositeScore,
          });
        }
      }
    }

    // Group by judge
    const byJudge = new Map<
      string,
      { submissionId: string; raw: number }[]
    >();

    for (const e of allJudgeEvals) {
      const list = byJudge.get(e.judgeId) ?? [];
      list.push({ submissionId: e.submissionId, raw: e.compositeScore });
      byJudge.set(e.judgeId, list);
    }

    // Normalise per judge and collect z-scores per submission
    const submissionZScores = new Map<string, number[]>();

    for (const [, entries] of byJudge) {
      const rawScores = entries.map((e) => e.raw);
      const normalised = zScoreNormalize(rawScores);

      entries.forEach((entry, idx) => {
        const list = submissionZScores.get(entry.submissionId) ?? [];
        list.push(normalised[idx]);
        submissionZScores.set(entry.submissionId, list);
      });
    }

    // 5. Compute final scores
    const ranked = rows.map((row) => {
      const zScores = submissionZScores.get(row.submissionId) ?? [];
      const normalizedHumanAvg =
        zScores.length > 0
          ? zScores.reduce((a, b) => a + b, 0) / zScores.length
          : 0;

      const aiComponent =
        row.aiComposite !== null ? (aiWeight / 100) * row.aiComposite : 0;
      const humanComponent = (humanWeight / 100) * normalizedHumanAvg;

      // If no human scores exist, use AI score only (scaled to full weight)
      const finalScore =
        zScores.length > 0
          ? aiComponent + humanComponent
          : row.aiComposite ?? 0;

      return {
        submissionId: row.submissionId,
        teamId: row.teamId,
        aiScore: row.aiComposite,
        humanScoreNormalized: zScores.length > 0 ? normalizedHumanAvg : null,
        finalScore,
      };
    });

    // Sort descending by finalScore
    ranked.sort((a, b) => b.finalScore - a.finalScore);

    // 6. Clear old rankings for this competition
    await db
      .delete(finalRankings)
      .where(eq(finalRankings.competitionId, competitionId));

    // 7. Write new rankings
    for (let i = 0; i < ranked.length; i++) {
      const entry = ranked[i];
      const rank = i + 1;
      const isFinalist = rank <= finalistCount;
      const isWinner = rank === 1;

      await db.insert(finalRankings).values({
        competitionId,
        submissionId: entry.submissionId,
        teamId: entry.teamId,
        aiScore: entry.aiScore,
        humanScoreNormalized: entry.humanScoreNormalized,
        finalScore: entry.finalScore,
        rank,
        isFinalist,
        isWinner,
      });

      // 8. Update submission status
      let newStatus: "finalist" | "winner" | "judged";
      if (isWinner) {
        newStatus = "winner";
      } else if (isFinalist) {
        newStatus = "finalist";
      } else {
        newStatus = "judged";
      }

      await db
        .update(submissions)
        .set({
          finalScore: entry.finalScore,
          rank,
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(eq(submissions.id, entry.submissionId));
    }
  } catch (error) {
    console.error(
      `Ranking computation failed for competition ${competitionId}:`,
      error
    );
    throw error;
  }
}
