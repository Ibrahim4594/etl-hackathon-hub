"use client";

import { useEffect, useRef, useCallback } from "react";
import PusherClient from "pusher-js";

let pusherInstance: PusherClient | null = null;

function getPusherClient(): PusherClient | null {
  const key = process.env.NEXT_PUBLIC_PUSHER_APP_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
  if (!key || !cluster) return null;

  if (!pusherInstance) {
    pusherInstance = new PusherClient(key, {
      cluster,
      channelAuthorization: {
        endpoint: "/api/pusher/auth",
        transport: "ajax",
      },
    });
  }
  return pusherInstance;
}

/**
 * Subscribe to multiple events on a single Pusher channel.
 * Gracefully degrades to no-op when Pusher env vars are missing.
 */
export function useRealtimeChannel(
  channel: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bindings: Record<string, (data: any) => void>
): void {
  const bindingsRef = useRef(bindings);
  bindingsRef.current = bindings;

  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return;

    const ch = pusher.subscribe(channel);

    const events = Object.keys(bindingsRef.current);
    const handlers = events.map((event) => {
      const handler = (data: unknown) => bindingsRef.current[event]?.(data);
      ch.bind(event, handler);
      return { event, handler };
    });

    return () => {
      for (const { event, handler } of handlers) {
        ch.unbind(event, handler);
      }
      pusher.unsubscribe(channel);
    };
  }, [channel]);
}

/**
 * Subscribe to a single event on a channel. Convenience wrapper.
 */
export function useRealtimeEvent<T = unknown>(
  channel: string,
  event: string,
  callback: (data: T) => void
): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return;

    const ch = pusher.subscribe(channel);
    const handler = (data: T) => callbackRef.current(data);
    ch.bind(event, handler);

    return () => {
      ch.unbind(event, handler);
      pusher.unsubscribe(channel);
    };
  }, [channel, event]);
}

/**
 * Check if Pusher is available (env vars present).
 */
export function usePusherAvailable(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_PUSHER_APP_KEY &&
    process.env.NEXT_PUBLIC_PUSHER_CLUSTER
  );
}
