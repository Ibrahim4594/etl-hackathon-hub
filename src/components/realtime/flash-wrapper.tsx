"use client";

import { useEffect, useState } from "react";

interface FlashWrapperProps {
  /** Changes to this key trigger a flash animation */
  flashKey: number;
  children: React.ReactNode;
  className?: string;
}

/**
 * Wraps children and flashes a teal glow when flashKey changes.
 */
export function FlashWrapper({ flashKey, children, className = "" }: FlashWrapperProps) {
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (flashKey === 0) return;
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 600);
    return () => clearTimeout(t);
  }, [flashKey]);

  return (
    <div
      className={`transition-all duration-600 ${
        flash ? "ring-2 ring-primary/40 shadow-lg shadow-primary/10" : ""
      } rounded-xl ${className}`}
    >
      {children}
    </div>
  );
}
