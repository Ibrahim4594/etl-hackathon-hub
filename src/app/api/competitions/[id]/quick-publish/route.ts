import { serverAuth } from "@/lib/auth/server-auth";
import { db } from "@/lib/db";
import { competitions, users, organizations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { triggerEvent } from "@/lib/services/pusher";
import { channels, EVENTS } from "@/lib/services/pusher-channels";

/**
 * DEV-ONLY: Bypasses admin review and sets a draft competition to "active".
 * In production, competitions go through pending_review -> admin approval.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Quick publish is not available in production" },
      { status: 403 }
    );
  }

  const { id } = await params;

  const { userId } = await serverAuth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [dbUser] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, userId));

  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const [competition] = await db
    .select()
    .from(competitions)
    .where(eq(competitions.id, id));

  if (!competition) {
    return NextResponse.json({ error: "Competition not found" }, { status: 404 });
  }

  if (competition.status === "active") {
    return NextResponse.json({ error: "Already active" }, { status: 400 });
  }

  const [updated] = await db
    .update(competitions)
    .set({
      status: "active",
      publishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(competitions.id, id))
    .returning();

  // Real-time: broadcast to global channel
  triggerEvent(channels.global(), EVENTS.COMPETITION_PUBLISHED, {
    competitionId: id,
    title: updated.title,
    slug: updated.slug,
    organizationName: "",
    totalPrizePool: updated.totalPrizePool,
  });

  return NextResponse.json({ competition: updated });
}
