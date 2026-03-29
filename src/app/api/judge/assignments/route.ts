import { serverAuth } from "@/lib/auth/server-auth";
import { db } from "@/lib/db";
import { users, competitions, judgeAssignments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { userId } = await serverAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Look up DB user by clerkId
    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, userId));

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch judge assignments for this user
    const assignments = await db
      .select()
      .from(judgeAssignments)
      .where(eq(judgeAssignments.judgeId, dbUser.id));

    // Enrich with competition details
    const enriched = [];
    for (const assignment of assignments) {
      const [competition] = await db
        .select()
        .from(competitions)
        .where(eq(competitions.id, assignment.competitionId));

      enriched.push({
        assignmentId: assignment.id,
        assignedAt: assignment.assignedAt,
        competition: competition
          ? {
              id: competition.id,
              title: competition.title,
              slug: competition.slug,
              tagline: competition.tagline,
              category: competition.category,
              status: competition.status,
              judgingStart: competition.judgingStart,
              judgingEnd: competition.judgingEnd,
              coverImageUrl: competition.coverImageUrl,
              logoUrl: competition.logoUrl,
            }
          : null,
      });
    }

    return NextResponse.json({ assignments: enriched });
  } catch (error) {
    console.error("Judge assignments endpoint error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch judge assignments" },
      { status: 500 }
    );
  }
}
