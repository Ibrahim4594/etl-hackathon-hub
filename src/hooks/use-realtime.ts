"use client";

import { useEffect, useRef } from "react";
import PusherClient from "pusher-js";

let pusherInstance: PusherClient | null = null;

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
    const channelInstance = pusher.subscribe(channel);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = (data: any) => {
      callbackRef.current(data);
    };

    channelInstance.bind(event, handler);

    return () => {
      channelInstance.unbind(event, handler);
      pusher.unsubscribe(channel);
    };
  }, [channel, event]);
}
