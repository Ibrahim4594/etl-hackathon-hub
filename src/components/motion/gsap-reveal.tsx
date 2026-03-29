"use client";
import { useRef, useEffect, useState, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface GsapRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  duration?: number;
}

export function GsapReveal({
  children,
  className,
  delay = 0,
  y = 30,
  duration = 0.7,
}: GsapRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ref.current,
        { opacity: 0.15, y },
        {
          opacity: 1,
          y: 0,
          duration,
          delay,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ref.current,
            start: "top 90%",
            once: true,
          },
          onComplete: () => setHasAnimated(true),
        }
      );
    });
    return () => ctx.revert();
  }, [delay, y, duration]);

  return (
    <div
      ref={ref}
      className={className}
      style={{ opacity: hasAnimated ? 1 : 0.15 }}
    >
      {children}
    </div>
  );
}
