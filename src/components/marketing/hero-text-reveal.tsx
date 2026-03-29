"use client";

import { useRef, useEffect, useState } from "react";
import gsap from "gsap";

interface HeroTextRevealProps {
  children: React.ReactNode;
  onComplete?: () => void;
}

export function HeroTextReveal({ children, onComplete }: HeroTextRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || hasAnimated.current || !containerRef.current) return;
    hasAnimated.current = true;

    const words = containerRef.current.querySelectorAll(".hero-word");
    const subtitle = containerRef.current.querySelector(".hero-subtitle");
    const ctas = containerRef.current.querySelector(".hero-ctas");

    const tl = gsap.timeline({ onComplete });

    // Words stagger in
    tl.from(words, {
      y: 30,
      opacity: 0,
      duration: 0.6,
      stagger: 0.15,
      ease: "power2.out",
    });

    // Subtitle fades in 500ms after heading
    if (subtitle) {
      tl.from(
        subtitle,
        { y: 20, opacity: 0, duration: 0.5, ease: "power2.out" },
        "+=0.2"
      );
    }

    // CTAs fade in 300ms after subtitle
    if (ctas) {
      tl.from(
        ctas,
        { y: 15, opacity: 0, duration: 0.4, ease: "power2.out" },
        "+=0.1"
      );
    }
  }, [ready, onComplete]);

  return (
    <div ref={containerRef} className={ready ? "" : "opacity-0"}>
      {children}
    </div>
  );
}
