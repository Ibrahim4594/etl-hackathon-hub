"use client";

import { Trophy, FileText, Users, DollarSign, BarChart3, Gavel, Star } from "lucide-react";
import { AnimatedStat } from "./animated-stat";

const ICON_MAP = {
  trophy: Trophy,
  fileText: FileText,
  users: Users,
  dollarSign: DollarSign,
  barChart3: BarChart3,
  gavel: Gavel,
  star: Star,
} as const;

export type StatIconName = keyof typeof ICON_MAP;

interface PremiumStatCardProps {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  icon: StatIconName;
}

export function PremiumStatCard({
  title,
  value,
  prefix,
  suffix,
  icon,
}: PremiumStatCardProps) {
  const Icon = ICON_MAP[icon];

  return (
    <div className="group rounded-2xl border border-border/50 bg-card p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-0.5 text-3xl font-bold tracking-tight">
            <AnimatedStat
              value={value}
              prefix={prefix}
              suffix={suffix}
            />
          </p>
        </div>
      </div>
    </div>
  );
}
