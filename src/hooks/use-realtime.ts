"use client";

import { useEffect, useRef } from "react";
import PusherClient from "pusher-js";

let pusherInstance: PusherClient | null = null;
const channelRefCounts = new Map<string, number>();

function getPusherClient(): PusherClient {
  if (!pusherInstance) {
    pusherInstance = new PusherClient(
      process.env.NEXT_PUBLIC_PUSHER_APP_KEY!,
      {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      }
    );
  }
  return pusherInstance;
}

export function useRealtime(
  channel: string,
  event: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  callback: (data: any) => void
): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const pusher = getPusherClient();

    // Increment ref count; subscribe only on first ref
    const refCount = (channelRefCounts.get(channel) ?? 0) + 1;
    channelRefCounts.set(channel, refCount);
    const channelInstance = refCount === 1 ? pusher.subscribe(channel) : pusher.channel(channel);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = (data: any) => {
      callbackRef.current(data);
    };

    channelInstance.bind(event, handler);

    return () => {
      channelInstance.unbind(event, handler);
      const remaining = (channelRefCounts.get(channel) ?? 1) - 1;
      if (remaining <= 0) {
        channelRefCounts.delete(channel);
        pusher.unsubscribe(channel);
      } else {
        channelRefCounts.set(channel, remaining);
      }
    };
  }, [channel, event]);
}
