/**
 * Batch AI evaluation service.
 *
 * Processes all "valid" submissions for a competition through the
 * AI judge sequentially (to respect rate limits) with a short delay
 * between each call.
 */

import { db } from "@/lib/db";
import { submissions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { evaluateSubmission } from "./ai-judge";

const DELAY_MS = 2000; // 2 seconds between calls

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function batchEvaluate(
  competitionId: string
): Promise<{ processed: number; errors: number }> {
  let processed = 0;
  let errors = 0;

  try {
    // Fetch all valid submissions for this competition
    const validSubmissions = await db
      .select()
      .from(submissions)
      .where(
        and(
          eq(submissions.competitionId, competitionId),
          eq(submissions.status, "valid")
        )
      );

    for (const submission of validSubmissions) {
      try {
        await evaluateSubmission(submission.id);
        processed++;
      } catch (error) {
        console.error(
          `Batch: failed to evaluate submission ${submission.id}:`,
          error
        );
        errors++;
      }

      // Respect rate limits – wait between calls
      if (submission !== validSubmissions[validSubmissions.length - 1]) {
        await delay(DELAY_MS);
      }
    }
  } catch (error) {
    console.error(
      `Batch evaluation failed for competition ${competitionId}:`,
      error
    );
  }

  return { processed, errors };
}
