"use client";

import { usePusherAvailable } from "@/hooks/use-realtime-channel";

interface LiveBadgeProps {
  /** Whether there's pending real-time data */
  hasUpdates?: boolean;
  className?: string;
}

/**
 * Small "LIVE" indicator with a pulsing dot.
 * Only renders when Pusher is connected.
 */
export function LiveBadge({ hasUpdates = false, className = "" }: LiveBadgeProps) {
  const available = usePusherAvailable();
  if (!available) return null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
        hasUpdates
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
      } ${className}`}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span
          className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
            hasUpdates ? "bg-primary" : "bg-emerald-400"
          }`}
        />
        <span
          className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
            hasUpdates ? "bg-primary" : "bg-emerald-500"
          }`}
        />
      </span>
      LIVE
    </span>
  );
}
