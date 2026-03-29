import { db } from "@/lib/db";
import { platformSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { serverAuth } from "@/lib/auth/server-auth";
import { ensureDbUser } from "@/lib/auth/ensure-db-user";
import { NextResponse } from "next/server";

// Default settings — used when no DB value exists
const DEFAULTS: Record<string, string> = {
  "judging.ai_weight": "30",
  "judging.human_weight": "70",
  "judging.finalist_count": "10",
  "competition.max_team_size": "4",
  "competition.min_team_size": "1",
  "competition.max_screenshots": "5",
  "platform.name": "Competition Spark",
  "platform.support_email": "support@competitionspark.com",
  "platform.maintenance_mode": "false",
};

export async function GET() {
  try {
    const { userId } = await serverAuth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await ensureDbUser(userId);
    if (!dbUser || dbUser.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Fetch all settings from DB
    const rows = await db.select().from(platformSettings);
    const settings: Record<string, string> = { ...DEFAULTS };
    for (const row of rows) {
      settings[row.key] = row.value;
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("GET /api/admin/settings error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const { userId } = await serverAuth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await ensureDbUser(userId);
    if (!dbUser || dbUser.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { settings } = body as { settings?: Record<string, string> };

    if (!settings || typeof settings !== "object") {
      return NextResponse.json({ error: "settings object required" }, { status: 400 });
    }

    // Upsert each setting
    for (const [key, value] of Object.entries(settings)) {
      if (!DEFAULTS.hasOwnProperty(key)) continue; // Only allow known keys

      const [existing] = await db
        .select()
        .from(platformSettings)
        .where(eq(platformSettings.key, key));

      if (existing) {
        await db
          .update(platformSettings)
          .set({ value, updatedAt: new Date() })
          .where(eq(platformSettings.key, key));
      } else {
        await db.insert(platformSettings).values({ key, value });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/admin/settings error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update settings" },
      { status: 500 }
    );
  }
}
