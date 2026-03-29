"use client";

import { useEffect, useRef } from "react";
import { motion, stagger, useAnimate, useInView } from "framer-motion";
import { cn } from "@/lib/utils";

interface TextGenerateEffectProps {
  words: string;
  className?: string;
  wordClassName?: string;
  duration?: number;
  filter?: boolean;
  onComplete?: () => void;
}

export function TextGenerateEffect({
  words,
  className,
  wordClassName,
  duration = 0.35,
  filter = true,
  onComplete,
}: TextGenerateEffectProps) {
  const [scope, animate] = useAnimate();
  const hasRun = useRef(false);
  const isInView = useInView(scope, { once: true, amount: 0.5 });

  const wordsArray = words.split(" ");

  useEffect(() => {
    if (!isInView || hasRun.current) return;
    hasRun.current = true;

    animate(
      "span.tge-word",
      { opacity: 1, filter: filter ? "blur(0px)" : "none" },
      {
        duration,
        delay: stagger(0.15),
        onComplete,
      }
    );
  }, [isInView, animate, duration, filter, onComplete]);

  return (
    <div ref={scope} className={cn("inline", className)}>
      {wordsArray.map((word, idx) => (
        <motion.span
          key={`${word}-${idx}`}
          className={cn("tge-word inline-block", wordClassName)}
          style={{
            opacity: 0,
            filter: filter ? "blur(8px)" : "none",
          }}
        >
          {word}
          {idx < wordsArray.length - 1 ? "\u00A0" : ""}
        </motion.span>
      ))}
    </div>
  );
}
