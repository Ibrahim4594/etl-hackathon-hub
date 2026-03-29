"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STAGES = [
  { key: "submitted", label: "Submitted" },
  { key: "validating", label: "Validating" },
  { key: "valid", label: "Valid", alternates: ["invalid", "flagged"] },
  { key: "ai_evaluated", label: "AI Evaluated" },
  { key: "judged", label: "Judged" },
  { key: "finalist", label: "Finalist", alternates: ["winner"] },
] as const;

type SubmissionStatus =
  | "submitted"
  | "validating"
  | "valid"
  | "invalid"
  | "flagged"
  | "ai_evaluated"
  | "judged"
  | "finalist"
  | "winner";

interface StatusTrackerProps {
  status: SubmissionStatus;
}

function getStageIndex(status: SubmissionStatus): number {
  for (let i = 0; i < STAGES.length; i++) {
    const stage = STAGES[i];
    if (stage.key === status) return i;
    if ("alternates" in stage && stage.alternates?.includes(status as never)) return i;
  }
  return 0;
}

function getDisplayLabel(status: SubmissionStatus, stageIndex: number): string {
  const stage = STAGES[stageIndex];
  if (stage.key === status) return stage.label;
  if ("alternates" in stage && stage.alternates?.includes(status as never)) {
    return status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ");
  }
  return stage.label;
}

const terminalStatuses: SubmissionStatus[] = ["invalid", "flagged"];

export function StatusTracker({ status }: StatusTrackerProps) {
  const currentIndex = getStageIndex(status);
  const isTerminal = terminalStatuses.includes(status);

  return (
    <div className="w-full">
      {/* Desktop view */}
      <div className="hidden sm:flex items-center justify-between">
        {STAGES.map((stage, index) => {
          const isPast = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isFuture = index > currentIndex;
          const label = isCurrent ? getDisplayLabel(status, index) : stage.label;

          const isTerminalStage = isCurrent && isTerminal;

          return (
            <div key={stage.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors",
                    isPast && "border-primary bg-primary text-primary-foreground",
                    isCurrent && !isTerminalStage && "border-primary bg-primary/10 text-primary",
                    isCurrent && isTerminalStage && "border-destructive bg-destructive/10 text-destructive",
                    isFuture && "border-muted-foreground/30 bg-muted text-muted-foreground"
                  )}
                >
                  {isPast ? <Check className="h-4 w-4" /> : index + 1}
                </div>
                <span
                  className={cn(
                    "text-xs font-medium whitespace-nowrap",
                    isPast && "text-primary",
                    isCurrent && !isTerminalStage && "text-primary",
                    isCurrent && isTerminalStage && "text-destructive",
                    isFuture && "text-muted-foreground"
                  )}
                >
                  {label}
                </span>
              </div>
              {index < STAGES.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 mx-2 mt-[-1.25rem]",
                    isPast ? "bg-primary" : "bg-muted-foreground/20"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile view */}
      <div className="flex sm:hidden flex-col gap-2">
        {STAGES.map((stage, index) => {
          const isPast = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isFuture = index > currentIndex;
          const label = isCurrent ? getDisplayLabel(status, index) : stage.label;
          const isTerminalStage = isCurrent && isTerminal;

          return (
            <div key={stage.key} className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold",
                  isPast && "border-primary bg-primary text-primary-foreground",
                  isCurrent && !isTerminalStage && "border-primary bg-primary/10 text-primary",
                  isCurrent && isTerminalStage && "border-destructive bg-destructive/10 text-destructive",
                  isFuture && "border-muted-foreground/30 bg-muted text-muted-foreground"
                )}
              >
                {isPast ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </div>
              <span
                className={cn(
                  "text-sm font-medium",
                  isPast && "text-primary",
                  isCurrent && !isTerminalStage && "text-primary",
                  isCurrent && isTerminalStage && "text-destructive",
                  isFuture && "text-muted-foreground"
                )}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
