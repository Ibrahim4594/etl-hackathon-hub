"use client";

import { FileText, Users, Gavel, Trophy } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ActivityItem {
  id: string;
  type: "submission" | "registration" | "judge" | "status";
  message: string;
  timestamp: string;
}

const ICON_MAP = {
  submission: { icon: FileText, color: "bg-emerald-500", dot: "bg-emerald-400" },
  registration: { icon: Users, color: "bg-blue-500", dot: "bg-blue-400" },
  judge: { icon: Gavel, color: "bg-amber-500", dot: "bg-amber-400" },
  status: { icon: Trophy, color: "bg-purple-500", dot: "bg-purple-400" },
};

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
          <FileText className="h-6 w-6 text-primary" />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          No activity yet. Activity will appear as participants register and submit.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {items.map((item) => {
        const cfg = ICON_MAP[item.type];
        const Icon = cfg.icon;
        return (
          <div
            key={item.id}
            className="flex items-start gap-3 rounded-lg p-2.5 transition-colors hover:bg-muted/50"
          >
            <div className="relative mt-0.5">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${cfg.color}/10`}
              >
                <Icon className={`h-4 w-4 ${cfg.color.replace("bg-", "text-")}`} />
              </div>
              <span
                className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ${cfg.dot} ring-2 ring-card`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm leading-snug">{item.message}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
