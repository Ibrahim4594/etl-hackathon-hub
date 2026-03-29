"use client";

import { cn } from "@/lib/utils";

interface GlowCardProps {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
}

export function GlowCard({
  children,
  className,
  innerClassName,
}: GlowCardProps) {
  return (
    <div className={cn("glow-border-wrap", className)}>
      <div
        className={cn(
          "bg-card rounded-[calc(1rem-1px)] h-full",
          innerClassName
        )}
      >
        {children}
      </div>
    </div>
  );
}
