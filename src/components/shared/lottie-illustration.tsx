"use client";

import dynamic from "next/dynamic";
import type { LucideIcon } from "lucide-react";

const DotLottieReact = dynamic(
  () =>
    import("@lottiefiles/dotlottie-react").then((mod) => mod.DotLottieReact),
  { ssr: false }
);

interface LottieIllustrationProps {
  src: string;
  width?: number;
  height?: number;
  loop?: boolean;
  fallbackIcon?: LucideIcon;
  className?: string;
}

export function LottieIllustration({
  src,
  width = 100,
  height = 100,
  loop = true,
  fallbackIcon: Icon,
  className,
}: LottieIllustrationProps) {
  return (
    <div
      className={className}
      style={{ width, height, position: "relative" }}
    >
      {Icon && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon className="h-7 w-7 text-primary opacity-20" />
        </div>
      )}
      <DotLottieReact
        src={src}
        autoplay
        loop={loop}
        style={{ width, height }}
      />
    </div>
  );
}
