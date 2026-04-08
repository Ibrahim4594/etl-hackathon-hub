import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { extractTagsFromRows } from "@/lib/db/tag-queries";

export const revalidate = 300;

export async function GET() {
  try {
    const rows = await db.execute(
      sql`SELECT DISTINCT jsonb_array_elements_text(tags) AS tag
          FROM competitions
          WHERE status IN ('active', 'judging', 'completed')
            AND tags IS NOT NULL
            AND jsonb_array_length(tags) > 0
          ORDER BY tag`
    );
    const tags = extractTagsFromRows(rows);
    return NextResponse.json({ tags });
  } catch {
    return NextResponse.json({ tags: [] });
  }
}
