import { serverAuth } from "@/lib/auth/server-auth";
import { db } from "@/lib/db";
import { competitions, organizations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { triggerEvent } from "@/lib/services/pusher";
import { channels, EVENTS } from "@/lib/services/pusher-channels";
import { createNotification } from "@/lib/services/notification";
import { apiError } from "@/lib/api-error";
import { resolveOnboardingUser } from "@/lib/auth/resolve-onboarding-user";

export async function PATCH(req: Request) {
  try {
    const { userId } = await serverAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Look up DB user
    const dbUser = await resolveOnboardingUser(userId);

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (dbUser.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { competitionId, action, reason } = body;

    if (!competitionId) {
      return NextResponse.json({ error: "competitionId is required" }, { status: 400 });
    }

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "action must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    // Fetch the competition
    const [competition] = await db
      .select()
      .from(competitions)
      .where(eq(competitions.id, competitionId));

    if (!competition) {
      return NextResponse.json({ error: "Competition not found" }, { status: 404 });
    }

    if (competition.status !== "pending_review") {
      return NextResponse.json(
        { error: "Only pending_review competitions can be approved or rejected" },
        { status: 400 }
      );
    }

    const newStatus = action === "approve" ? "approved" : "cancelled"; // "cancelled" = rejected in UI

    const [updated] = await db
      .update(competitions)
      .set({
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(competitions.id, competitionId))
      .returning();

    // Trigger real-time events and notifications
    try {
      if (action === "approve") {
        // Notify organizer about approval
        const [org] = await db
          .select({ name: organizations.name, id: organizations.id })
          .from(organizations)
          .where(eq(organizations.id, competition.organizationId));

        if (org) {
          await triggerEvent(channels.organizer(org.id), EVENTS.ORG_COMPETITION_STATUS, {
            competitionId: competition.id,
            title: competition.title,
            oldStatus: "pending_review",
            newStatus: "approved",
          });
        }

        // Create notification for the competition creator
        if (competition.createdBy) {
          await createNotification({
            userId: competition.createdBy,
            type: "competition_approved",
            title: "Competition Approved!",
            message: `Your competition "${competition.title}" has been approved! You can now publish it live.`,
            link: `/organizer/competitions/${competition.id}`,
          });
        }
      } else {
        // Rejected — include reason
        if (competition.createdBy) {
          const rejectMsg = reason
            ? `Your competition "${competition.title}" was not approved. Reason: ${reason}`
            : `Your competition "${competition.title}" was not approved.`;

          await createNotification({
            userId: competition.createdBy,
            type: "competition_rejected",
            title: "Competition Rejected",
            message: rejectMsg,
            link: `/organizer/competitions/${competition.id}`,
          });
        }
      }
    } catch (notifErr) {
      console.error("Admin competitions: notification/pusher failed:", notifErr);
    }

    return NextResponse.json({ competition: updated });
  } catch (error) {
    console.error("PATCH /api/admin/competitions error:", error);
    return apiError(error, "Failed to update competition");
  }
}
