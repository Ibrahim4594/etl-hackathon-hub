"use client";

import { useEffect, useState } from "react";

interface SlideInItemProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Slides in from the right with a fade. Good for new list items.
 */
export function SlideInItem({ children, className = "" }: SlideInItemProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  return (
    <div
      className={`transition-all duration-300 ease-out ${
        mounted
          ? "translate-x-0 opacity-100"
          : "translate-x-4 opacity-0"
      } ${className}`}
    >
      {children}
    </div>
  );
}
