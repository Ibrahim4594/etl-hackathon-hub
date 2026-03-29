import { CheckCircle, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Stage {
  label: string;
  date: Date | null;
}

interface CompetitionTimelineProps {
  registrationStart: Date | null;
  registrationEnd: Date | null;
  submissionStart: Date | null;
  submissionEnd: Date | null;
  judgingStart: Date | null;
  judgingEnd: Date | null;
  resultsDate: Date | null;
}

function fmt(d: Date | null): string {
  if (!d) return "TBD";
  return new Intl.DateTimeFormat("en-PK", {
    month: "short",
    day: "numeric",
  }).format(new Date(d));
}

function getStageStatus(
  date: Date | null,
  nextDate: Date | null
): "completed" | "current" | "upcoming" {
  const now = Date.now();
  if (!date) return "upcoming";
  const t = new Date(date).getTime();
  if (nextDate && now >= new Date(nextDate).getTime()) return "completed";
  if (now >= t) return "current";
  return "upcoming";
}

export function CompetitionTimeline(props: CompetitionTimelineProps) {
  const stages: (Stage & { status: "completed" | "current" | "upcoming" })[] = [
    {
      label: "Registration",
      date: props.registrationStart,
      status: getStageStatus(props.registrationStart, props.registrationEnd),
    },
    {
      label: "Development",
      date: props.registrationEnd,
      status: getStageStatus(props.registrationEnd, props.submissionEnd),
    },
    {
      label: "Submission",
      date: props.submissionEnd,
      status: getStageStatus(
        props.submissionStart ?? props.registrationEnd,
        props.submissionEnd
      ),
    },
    {
      label: "Judging",
      date: props.judgingStart,
      status: getStageStatus(props.judgingStart, props.judgingEnd),
    },
    {
      label: "Results",
      date: props.resultsDate,
      status: getStageStatus(props.resultsDate, null),
    },
  ];

  // Fix: if submission deadline passed, mark submission as completed
  if (props.submissionEnd && Date.now() >= new Date(props.submissionEnd).getTime()) {
    stages[2].status = "completed";
  }

  const currentIdx = stages.findIndex((s) => s.status === "current");
  const completedCount = stages.filter((s) => s.status === "completed").length;
  const currentStage = currentIdx >= 0 ? stages[currentIdx] : null;

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-semibold">
          Progress Tracker
        </span>
        <span className="text-xs text-muted-foreground">
          Stage {completedCount + (currentIdx >= 0 ? 1 : 0)}/{stages.length}
          {currentStage && (
            <span className="ml-1 text-foreground font-medium">
              &middot; {currentStage.label}
            </span>
          )}
        </span>
      </div>

      {/* Desktop: horizontal */}
      <div className="hidden sm:block">
        <div className="flex items-start">
          {stages.map((stage, i) => (
            <div key={stage.label} className="flex items-start flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                {/* Dot */}
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors",
                    stage.status === "completed" &&
                      "border-emerald-500 bg-emerald-500 text-white",
                    stage.status === "current" &&
                      "border-primary bg-primary/10 text-primary ring-4 ring-primary/20",
                    stage.status === "upcoming" &&
                      "border-muted-foreground/30 bg-muted text-muted-foreground"
                  )}
                >
                  {stage.status === "completed" ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Circle className="h-3 w-3" />
                  )}
                </div>
                {/* Label */}
                <p
                  className={cn(
                    "mt-2 text-xs font-medium text-center whitespace-nowrap",
                    stage.status === "completed" && "text-emerald-500",
                    stage.status === "current" && "text-primary",
                    stage.status === "upcoming" && "text-muted-foreground"
                  )}
                >
                  {stage.label}
                </p>
                {/* Date */}
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {fmt(stage.date)}
                </p>
              </div>
              {/* Connecting line */}
              {i < stages.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 mt-4 mx-2",
                    stages[i + 1].status === "upcoming"
                      ? "border-t-2 border-dashed border-muted-foreground/20"
                      : "bg-emerald-500"
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile: vertical */}
      <div className="block sm:hidden space-y-3">
        {stages.map((stage, i) => (
          <div key={stage.label} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full border-2",
                  stage.status === "completed" &&
                    "border-emerald-500 bg-emerald-500 text-white",
                  stage.status === "current" &&
                    "border-primary bg-primary/10 text-primary",
                  stage.status === "upcoming" &&
                    "border-muted-foreground/30 bg-muted text-muted-foreground"
                )}
              >
                {stage.status === "completed" ? (
                  <CheckCircle className="h-3.5 w-3.5" />
                ) : (
                  <Circle className="h-2.5 w-2.5" />
                )}
              </div>
              {i < stages.length - 1 && (
                <div
                  className={cn(
                    "w-0.5 flex-1 min-h-[20px] mt-1",
                    stages[i + 1].status === "upcoming"
                      ? "border-l-2 border-dashed border-muted-foreground/20"
                      : "bg-emerald-500"
                  )}
                />
              )}
            </div>
            <div className="pb-3">
              <p
                className={cn(
                  "text-sm font-medium",
                  stage.status === "completed" && "text-emerald-500",
                  stage.status === "current" && "text-primary",
                  stage.status === "upcoming" && "text-muted-foreground"
                )}
              >
                {stage.label}
              </p>
              <p className="text-xs text-muted-foreground">{fmt(stage.date)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
