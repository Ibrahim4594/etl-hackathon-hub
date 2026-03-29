"use client";

import CinematicThemeSwitcher from "@/components/ui/cinematic-theme-switcher";

export function ModeToggle({ className }: { className?: string }) {
  return (
    <div className={`w-[47px] h-[29px] relative ${className ?? ""}`}>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-[0.45]">
        <CinematicThemeSwitcher />
      </div>
    </div>
  );
}
