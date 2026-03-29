"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUSES = [
  { value: "all", label: "All" },
  { value: "submitted", label: "Submitted" },
  { value: "valid", label: "Valid" },
  { value: "invalid", label: "Invalid" },
  { value: "flagged", label: "Flagged" },
  { value: "ai_evaluated", label: "AI Evaluated" },
  { value: "judged", label: "Judged" },
  { value: "finalist", label: "Finalist" },
  { value: "winner", label: "Winner" },
] as const;

interface SubmissionStatusFilterProps {
  currentStatus: string;
  counts: Record<string, number>;
}

export function SubmissionStatusFilter({ currentStatus, counts }: SubmissionStatusFilterProps) {
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
