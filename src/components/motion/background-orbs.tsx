"use client";

import { useEffect, useState } from "react";

/**
 * Slowly drifting teal background orbs — pure CSS animation.
 * Fixed full-viewport container with 4 blurred circles that drift subtly.
 */
export function BackgroundOrbs() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/15 dark:bg-primary/10 rounded-full blur-3xl animate-orb-drift-1" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/15 dark:bg-accent/10 rounded-full blur-3xl animate-orb-drift-2" />
      <div className="absolute top-[55%] left-[25%] w-64 h-64 bg-primary/10 dark:bg-primary/5 rounded-full blur-3xl animate-orb-drift-3" />
      <div className="absolute top-[25%] right-[15%] w-48 h-48 bg-accent/10 dark:bg-accent/5 rounded-full blur-3xl animate-orb-drift-4" />
    </div>
  );
}
