"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

interface RealtimeToastProps {
  /** Changes to trigger a toast */
  flashKey: number;
  title: string;
  description?: string;
  type?: "default" | "success" | "error" | "info";
}

/**
 * Fires a sonner toast when flashKey changes.
 * Useful for showing real-time event notifications as toasts.
 */
export function RealtimeToast({ flashKey, title, description, type = "default" }: RealtimeToastProps) {
  const prevKey = useRef(flashKey);

  useEffect(() => {
    if (flashKey === 0 || flashKey === prevKey.current) return;
    prevKey.current = flashKey;

    switch (type) {
      case "success":
        toast.success(title, { description });
        break;
      case "error":
        toast.error(title, { description });
        break;
      case "info":
        toast.info(title, { description });
        break;
      default:
        toast(title, { description });
    }
  }, [flashKey, title, description, type]);

  return null;
}
