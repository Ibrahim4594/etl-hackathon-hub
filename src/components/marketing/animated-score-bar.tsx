"use client";

import { useRef, useState, useEffect } from "react";
import { useInView } from "framer-motion";

interface AnimatedScoreBarProps {
  label: string;
  score: number;
  max?: number;
  delay?: number;
}

export function AnimatedScoreBar({
  label,
  score,
  max = 10,
  delay = 0,
}: AnimatedScoreBarProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const [displayScore, setDisplayScore] = useState(0);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!inView) return;

    const timeout = setTimeout(() => {
      const start = performance.now();
      const duration = 1000;

      function animate(now: number) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);

        setDisplayScore(Number((score * eased).toFixed(1)));
        setWidth((score / max) * 100 * eased);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      }

      requestAnimationFrame(animate);
    }, delay);

    return () => clearTimeout(timeout);
  }, [inView, score, max, delay]);

  return (
    <div ref={ref} className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground font-medium">{label}</span>
        <span className="font-bold text-foreground">
          {inView ? displayScore : 0}/{max}
        </span>
      </div>
      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
          style={{
            width: `${width}%`,
            transition: "none",
          }}
        />
      </div>
    </div>
  );
}
