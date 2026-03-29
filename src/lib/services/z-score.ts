/**
 * Z-score normalization utility.
 *
 * Transforms a set of raw scores into z-scores so that scores from
 * different judges (who may use different parts of the scale) become
 * comparable.
 */
export function zScoreNormalize(scores: number[]): number[] {
  if (scores.length === 0) return [];

  const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;

  const variance =
    scores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / scores.length;
  const stddev = Math.sqrt(variance);

  // If all scores are identical, stddev is 0 – return all zeros.
  if (stddev === 0) {
    return scores.map(() => 0);
  }

  return scores.map((s) => (s - mean) / stddev);
}
