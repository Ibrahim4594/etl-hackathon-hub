import { serverAuth } from "@/lib/auth/server-auth";
import { db } from "@/lib/db";
import { competitions, users, organizations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { triggerEvent } from "@/lib/services/pusher";
import { channels, EVENTS } from "@/lib/services/pusher-channels";
import { createNotification } from "@/lib/services/notification";
import { sendEmail } from "@/lib/services/email";

/**
 * POST /api/competitions/[id]/go-live
 * Activate an approved competition (approved -> active). Sends email and real-time notifications.
 *
 * @auth Required (Clerk session, role: sponsor owner or admin)
 * @returns { competition: {...} } or { error: string }
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

    // Must be sponsor who owns this competition, OR admin
    if (dbUser.role !== "sponsor" && dbUser.role !== "admin") {
      return NextResponse.json(
        { error: "Only organizers or admins can publish competitions" },
        { status: 403 }
      );
    }

    // Fetch the competition
    const [competition] = await db
      .select()
      .from(competitions)
      .where(eq(competitions.id, id));

    if (!competition) {
      return NextResponse.json({ error: "Competition not found" }, { status: 404 });
    }

    // Sponsor must own the competition
    if (dbUser.role === "sponsor" && competition.createdBy !== dbUser.id) {
      return NextResponse.json(
        { error: "You do not own this competition" },
        { status: 403 }
      );
    }

    // Must be in "approved" status
    if (competition.status !== "approved") {
      return NextResponse.json(
        { error: "Only approved competitions can go live" },
        { status: 400 }
      );
    }

    // For public competitions, double-check prize confirmation
    if (competition.visibility === "public" && !competition.prizeConfirmed) {
      return NextResponse.json(
        { error: "Prize money must be confirmed before going live" },
        { status: 400 }
      );
    }

    // Update status to active and set publishedAt
    const [updated] = await db
      .update(competitions)
      .set({
        status: "active",
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(competitions.id, id))
      .returning();

    // Fetch organization info
    const [org] = await db
      .select({ name: organizations.name, id: organizations.id })
      .from(organizations)
      .where(eq(organizations.id, competition.organizationId));

    // Trigger real-time: notify global channel about new competition
    try {
      triggerEvent(channels.global(), EVENTS.COMPETITION_PUBLISHED, {
        competitionId: competition.id,
        title: competition.title,
        slug: competition.slug,
        organizationName: org?.name ?? "Unknown",
        totalPrizePool: competition.totalPrizePool,
      });

      // Notify organizer channel
      if (org) {
        triggerEvent(channels.organizer(org.id), EVENTS.ORG_COMPETITION_STATUS, {
          competitionId: competition.id,
          title: competition.title,
          oldStatus: "approved",
          newStatus: "active",
        });
      }
    } catch (pusherErr) {
      console.error("Go-live: Pusher notification failed:", pusherErr);
    }

    // Look up the competition creator for email + notification
    const creatorId = competition.createdBy;
    const [creator] = await db
      .select()
      .from(users)
      .where(eq(users.id, creatorId));

    if (creator) {
      // Create in-app notification
      try {
        await createNotification({
          userId: creator.id,
          type: "competition_approved",
          title: "Your competition is now live!",
          message: `"${competition.title}" is now live on the Spark marketplace. Participants can find and join your competition.`,
          link: `/competitions/${competition.slug}`,
        });
      } catch (notifErr) {
        console.error("Go-live: notification creation failed:", notifErr);
      }

      // Send confirmation email
      const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://competitionspark.com"}/competitions/${competition.slug}`;

      try {
        await sendEmail({
          to: creator.email,
          subject: "Your competition is now live on Spark!",
          html: `
            <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #333; font-size: 24px;">Congratulations! 🎉</h1>
              <p style="color: #555; font-size: 16px; line-height: 1.6;">
                Your competition <strong>"${competition.title}"</strong> is now live on the Spark marketplace!
              </p>
              <p style="color: #555; font-size: 16px; line-height: 1.6;">
                Participants can now discover, register for, and submit to your competition. Share the link below to spread the word:
              </p>
              <div style="margin: 24px 0;">
                <a href="${publicUrl}" style="display: inline-block; background-color: #2dd4bf; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                  View Your Competition
                </a>
              </div>
              <p style="color: #888; font-size: 14px;">
                You can manage your competition from your <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://competitionspark.com"}/sponsor/competitions/${competition.id}" style="color: #2dd4bf;">sponsor dashboard</a>.
              </p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
              <p style="color: #aaa; font-size: 12px;">
                This email was sent by Competition Spark. If you have any questions, reply to this email.
              </p>
            </div>
          `,
        });
      } catch (emailErr) {
        // Log but don't fail the request if email fails
        console.error("Failed to send go-live email:", emailErr);
      }
    }

    return NextResponse.json({ competition: updated });
  } catch (error) {
    console.error("POST /api/competitions/[id]/go-live error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to go live" },
      { status: 500 }
    );
  }
}
