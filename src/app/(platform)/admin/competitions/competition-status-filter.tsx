"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUSES = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "pending_review", label: "Pending Review" },
  { value: "approved", label: "Approved" },
  { value: "active", label: "Active" },
  { value: "judging", label: "Judging" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

interface CompetitionStatusFilterProps {
  currentStatus: string;
  counts: Record<string, number>;
}

export function CompetitionStatusFilter({ currentStatus, counts }: CompetitionStatusFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleStatusChange(status: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (status === "all") {
      params.delete("status");
    } else {
      params.set("status", status);
    }
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {STATUSES.map((s) => {
        const isActive = currentStatus === s.value;
        const count = s.value === "all"
          ? Object.values(counts).reduce((sum, c) => sum + c, 0)
          : (counts[s.value] ?? 0);

        return (
          <button
            key={s.value}
            onClick={() => handleStatusChange(s.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {s.label}
            <Badge
              variant="secondary"
              className={cn(
                "ml-0.5 h-5 min-w-[20px] px-1.5 text-xs",
                isActive && "bg-primary-foreground/20 text-primary-foreground"
              )}
            >
              {count}
            </Badge>
          </button>
        );
      })}
    </div>
  );
}
