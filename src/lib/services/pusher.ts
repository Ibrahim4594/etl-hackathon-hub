/**
 * Server-side Pusher client for real-time event broadcasting.
 * Gracefully does nothing when Pusher env vars are not configured.
 */

import Pusher from "pusher";

const hasPusherConfig =
  !!process.env.PUSHER_APP_ID &&
  !!process.env.NEXT_PUBLIC_PUSHER_APP_KEY &&
  !!process.env.PUSHER_SECRET &&
  !!process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

const pusher = hasPusherConfig
  ? new Pusher({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.NEXT_PUBLIC_PUSHER_APP_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      useTLS: true,
    })
  : null;

export { pusher };

export async function triggerEvent(
  channel: string,
  event: string,
  data: unknown
): Promise<void> {
  if (!pusher) return;
  try {
    await pusher.trigger(channel, event, data);
  } catch (error) {
    console.error(
      `Failed to trigger Pusher event "${event}" on channel "${channel}":`,
      error
    );
  }
}
