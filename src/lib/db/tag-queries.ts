/**
 * Typed helper for raw SQL tag queries.
 * Centralizes the cast from postgres.js raw rows to typed tag records.
 */

type TagRow = { tag: string };

export function extractTagsFromRows(rows: unknown): string[] {
  return (rows as TagRow[]).map((r) => r.tag).filter(Boolean);
}
