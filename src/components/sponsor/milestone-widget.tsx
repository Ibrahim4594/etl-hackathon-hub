"use client";

import { Clock, CalendarCheck, Gavel, Trophy } from "lucide-react";
import { formatDistanceToNow, isPast } from "date-fns";

interface Milestone {
  id: string;
  label: string;
  competitionTitle: string;
  date: string;
  type: "registration" | "submission" | "judging" | "results";
}

const TYPE_CONFIG = {
  registration: { icon: CalendarCheck, color: "text-blue-400", bg: "bg-blue-500/10" },
  submission: { icon: Clock, color: "text-primary", bg: "bg-primary/10" },
  judging: { icon: Gavel, color: "text-amber-500", bg: "bg-amber-500/10" },
  results: { icon: Trophy, color: "text-emerald-500", bg: "bg-emerald-500/10" },
};

export function MilestoneWidget({ milestones }: { milestones: Milestone[] }) {
  if (milestones.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No upcoming milestones
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {milestones.map((m) => {
        const cfg = TYPE_CONFIG[m.type];
        const Icon = cfg.icon;
        const dateObj = new Date(m.date);
        const past = isPast(dateObj);
        const urgency = !past && dateObj.getTime() - Date.now() < 3 * 86400000;

        return (
          <div
            key={m.id}
            className={`flex items-start gap-3 rounded-lg p-2.5 transition-colors hover:bg-muted/50 ${past ? "opacity-50" : ""}`}
          >
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cfg.bg}`}>
              <Icon className={`h-4 w-4 ${cfg.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-snug">{m.label}</p>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {m.competitionTitle}
              </p>
            </div>
            <span
              className={`shrink-0 text-xs font-medium ${
                past
                  ? "text-muted-foreground"
                  : urgency
                    ? "text-amber-500"
                    : "text-muted-foreground"
              }`}
            >
              {past ? "Past" : formatDistanceToNow(dateObj, { addSuffix: true })}
            </span>
          </div>
        );
      })}
    </div>
  );
}
