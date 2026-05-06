import { db } from "@/lib/db";
import { competitions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

type StatusRow = {
  id: string;
  status: string;
  submissionEnd: Date | null;
  judgingEnd: Date | null;
};

/**
 * Auto-advance a competition's status based on elapsed dates.
 *
 * Rules (only forward transitions — never moves backwards):
 *   active     → judging   when submissionEnd has passed
 *   judging    → completed when judgingEnd has passed
 *
 * Safe to call on every page load; skips the DB write if nothing changed.
 * Returns the final (possibly updated) status string.
 */
export async function autoAdvanceCompetitionStatus(comp: StatusRow): Promise<string> {
  const now = new Date();
  let targetStatus = comp.status;

  // Only auto-advance active → judging when submission deadline passes.
  // judging → completed is intentionally manual (organizer announces winners)
  // so judges are never auto-locked out before they finish scoring.
  if (comp.status === "active" && comp.submissionEnd && comp.submissionEnd < now) {
    targetStatus = "judging";
  }

  if (targetStatus !== comp.status) {
    try {
      await db
        .update(competitions)
        .set({ status: targetStatus as "judging" | "completed", updatedAt: new Date() })
        .where(eq(competitions.id, comp.id));
    } catch {
      // Non-fatal: return the computed status even if the DB write fails
    }
  }

  return targetStatus;
}
