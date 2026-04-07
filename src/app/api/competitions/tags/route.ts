import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

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
    const tags = (rows as unknown as Array<{ tag: string }>).map((r) => r.tag).filter(Boolean);
    return NextResponse.json({ tags });
  } catch {
    return NextResponse.json({ tags: [] });
  }
}
