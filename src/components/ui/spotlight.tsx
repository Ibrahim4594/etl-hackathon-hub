"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

interface SpotlightProps {
  className?: string;
  size?: number;
  color?: string;
}

export function Spotlight({
  className,
  size = 400,
  color = "rgba(81, 236, 220, 0.08)",
}: SpotlightProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(true);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springX = useSpring(mouseX, { damping: 30, stiffness: 200 });
  const springY = useSpring(mouseY, { damping: 30, stiffness: 200 });

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      mouseX.set(e.clientX - rect.left - size / 2);
      mouseY.set(e.clientY - rect.top - size / 2);
    },
    [mouseX, mouseY, size]
  );

  useEffect(() => {
    if (window.innerWidth < 768) return;
    setIsMobile(false);

    const parent = containerRef.current?.parentElement;
    if (!parent) return;
    parent.addEventListener("mousemove", handleMouseMove);
    return () => parent.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  if (isMobile) return null;

  return (
    <div
      ref={containerRef}
      className={cn(
        "absolute inset-0 z-[2] overflow-hidden pointer-events-none",
        className
      )}
    >
      <motion.div
        className="absolute rounded-full"
        style={{
          x: springX,
          y: springY,
          width: size,
          height: size,
          background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        }}
      />
    </div>
  );
}
