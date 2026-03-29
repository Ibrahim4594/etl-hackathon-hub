import { serverAuth } from "@/lib/auth/server-auth";
import { db } from "@/lib/db";
import { competitions, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { triggerEvent } from "@/lib/services/pusher";
import { channels, EVENTS } from "@/lib/services/pusher-channels";

/**
 * POST /api/competitions/[id]/publish
 * Submit a draft competition for admin review (draft -> pending_review).
 *
 * @auth Required (Clerk session, role: sponsor, must own competition)
 * @returns { competition: {...} } or { error: string, missingFields?: string[] }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    if (dbUser.role !== "sponsor") {
      return NextResponse.json({ error: "Only organizers can publish competitions" }, { status: 403 });
    }

    // Fetch the competition and verify ownership
    const [competition] = await db
      .select()
      .from(competitions)
      .where(eq(competitions.id, id));

    if (!competition) {
      return NextResponse.json({ error: "Competition not found" }, { status: 404 });
    }

    if (competition.createdBy !== dbUser.id) {
      return NextResponse.json({ error: "You do not own this competition" }, { status: 403 });
    }

    if (competition.status !== "draft") {
      return NextResponse.json(
        { error: "Only draft competitions can be submitted for review" },
        { status: 400 }
      );
    }

    // Validate all required fields are filled before publishing
    const missingFields: string[] = [];

    if (!competition.title) missingFields.push("title");
    if (!competition.description) missingFields.push("description");
    if (!competition.submissionEnd) missingFields.push("submissionEnd");
    if (!competition.registrationStart) missingFields.push("registrationStart");
    if (!competition.registrationEnd) missingFields.push("registrationEnd");
    if (!competition.submissionStart) missingFields.push("submissionStart");

    const prizes = competition.prizes as { position: number; title: string; amount: number }[] | null;
    if (!prizes || prizes.length === 0) {
      missingFields.push("prizes");
    }

    const judgingCriteria = competition.judgingCriteria as { name: string }[] | null;
    if (!judgingCriteria || judgingCriteria.length === 0) {
      missingFields.push("judgingCriteria");
    }

    if (!competition.prizeConfirmed) {
      return NextResponse.json(
        { error: "Cannot publish: prize money not confirmed." },
        { status: 400 }
      );
    }

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          error: "Competition is missing required fields",
          missingFields,
        },
        { status: 400 }
      );
    }

    // Change status from draft to pending_review
    const [updated] = await db
      .update(competitions)
      .set({
        status: "pending_review",
        updatedAt: new Date(),
      })
      .where(eq(competitions.id, id))
      .returning();

    // Real-time: notify about status change
    try {
      triggerEvent(channels.participant(dbUser.id), EVENTS.ORG_COMPETITION_STATUS, {
        competitionId: id,
        title: updated.title,
        oldStatus: "draft",
        newStatus: "pending_review",
      });
    } catch (pusherErr) {
      console.error("Publish: Pusher notification failed:", pusherErr);
    }

    return NextResponse.json({ competition: updated });
  } catch (error) {
    console.error("POST /api/competitions/[id]/publish error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to publish competition" },
      { status: 500 }
    );
  }
}
