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
import { eq, and, desc, inArray } from "drizzle-orm";
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

    // 3. Batch-fetch AI evaluations and all judge evaluations in two queries.
    //    (Previously two O(N) serial loops — now O(1) queries regardless of submission count.)
    const submissionIds = filtered.map((s) => s.id);

    const [allAiEvals, allHumanEvals] = await Promise.all([
      db
        .select()
        .from(aiEvaluations)
        .where(inArray(aiEvaluations.submissionId, submissionIds))
        .orderBy(desc(aiEvaluations.createdAt)),
      db
        .select()
        .from(judgeEvaluations)
        .where(inArray(judgeEvaluations.submissionId, submissionIds)),
    ]);

    // Keep only the latest AI eval per submission
    const latestAiBySubmission = new Map<string, typeof allAiEvals[0]>();
    for (const e of allAiEvals) {
      if (!latestAiBySubmission.has(e.submissionId)) {
        latestAiBySubmission.set(e.submissionId, e);
      }
    }

    const rows: SubmissionScoreRow[] = filtered.map((sub) => {
      const aiEval = latestAiBySubmission.get(sub.id);
      const humanRawScores = allHumanEvals
        .filter((e) => e.submissionId === sub.id && e.compositeScore !== null)
        .map((e) => e.compositeScore as number);
      return {
        submissionId: sub.id,
        teamId: sub.teamId,
        aiComposite: aiEval?.compositeScore ?? null,
        humanRawScores,
      };
    });

    // 4. Z-score normalise human scores per judge
    //    Group all judge evaluations by judgeId, normalise within each
    //    judge, then map back to per-submission averages.

    // Build allJudgeEvals from the already-fetched batch
    const allJudgeEvals: {
      judgeId: string;
      submissionId: string;
      compositeScore: number;
    }[] = allHumanEvals
      .filter((e) => e.compositeScore !== null)
      .map((e) => ({
        judgeId: e.judgeId,
        submissionId: e.submissionId,
        compositeScore: e.compositeScore as number,
      }));

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

    // 5. Compute final scores.
    //    Z-scores from step 4 are unbounded; min-max normalize them to 0-100
    //    so the human component is on the same scale as the AI composite.

    // Collect per-submission average z-score
    const avgZScores = rows.map((row) => {
      const zScores = submissionZScores.get(row.submissionId) ?? [];
      if (zScores.length === 0) return null;
      return zScores.reduce((a, b) => a + b, 0) / zScores.length;
    });

    const validZScores = avgZScores.filter((z): z is number => z !== null);
    const zMin = validZScores.length > 0 ? Math.min(...validZScores) : 0;
    const zMax = validZScores.length > 0 ? Math.max(...validZScores) : 1;
    const zRange = zMax - zMin;

    const ranked = rows.map((row, i) => {
      const avgZ = avgZScores[i];
      // Normalize z-score to 0-100; if all z-scores identical (zRange===0), use 50
      const humanScore100 =
        avgZ !== null
          ? zRange === 0
            ? 50
            : ((avgZ - zMin) / zRange) * 100
          : null;

      const aiComponent =
        row.aiComposite !== null ? (aiWeight / 100) * row.aiComposite : 0;
      const humanComponent =
        humanScore100 !== null ? (humanWeight / 100) * humanScore100 : 0;

      // If no human scores exist, use AI score only (full weight to AI)
      const finalScore =
        humanScore100 !== null
          ? aiComponent + humanComponent
          : row.aiComposite ?? 0;

      return {
        submissionId: row.submissionId,
        teamId: row.teamId,
        aiScore: row.aiComposite,
        humanScoreNormalized: humanScore100,
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
