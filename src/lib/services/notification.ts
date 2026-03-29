import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { triggerEvent } from "@/lib/services/pusher";
import { channels, EVENTS } from "@/lib/services/pusher-channels";
import type { NotificationPayload } from "@/lib/services/pusher-channels";

type NotificationType =
  | "competition_approved"
  | "competition_rejected"
  | "team_invite"
  | "team_joined"
  | "submission_valid"
  | "submission_invalid"
  | "submission_flagged"
  | "ai_evaluation_complete"
  | "judge_assigned"
  | "judge_evaluation_complete"
  | "finalist_selected"
  | "winner_announced"
  | "payment_received"
  | "general";

export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}): Promise<void> {
  try {
    const [row] = await db
      .insert(notifications)
      .values({
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        link: params.link ?? null,
      })
      .returning();

    // Push real-time notification via Pusher
    const payload: NotificationPayload = {
      id: row.id,
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link,
      createdAt: row.createdAt.toISOString(),
    };
    await triggerEvent(channels.user(params.userId), EVENTS.NOTIFICATION, payload);
  } catch (error) {
    console.error("Failed to create notification:", error);
  }
}
