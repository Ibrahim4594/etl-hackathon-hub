"use client";

import { useEffect, useCallback, useRef } from "react";

/**
 * Lightweight real-time hook for sponsor dashboard.
 * Uses polling as a graceful fallback when Pusher is not configured.
 * When Pusher env vars are available, swap in pusher-js for true real-time.
 */
export function useSponsorRealtime(
  orgId: string | undefined,
  onUpdate: () => void,
  intervalMs = 30_000
) {
  const savedCallback = useRef(onUpdate);
  savedCallback.current = onUpdate;

  const refresh = useCallback(() => {
    savedCallback.current();
  }, []);

  useEffect(() => {
    if (!orgId) return;

    // Poll at interval as baseline real-time strategy
    const id = setInterval(refresh, intervalMs);
    return () => clearInterval(id);
  }, [orgId, intervalMs, refresh]);

  return { refresh };
}
