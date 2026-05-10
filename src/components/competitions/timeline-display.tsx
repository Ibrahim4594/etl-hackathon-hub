import { format } from "date-fns";
import { Calendar, Clock, CheckCircle2 } from "lucide-react";

interface TimelineEvent {
  label: string;
  date: Date | null;
  color: string;
}

interface TimelineDisplayProps {
  registrationStart?: Date | null;
  registrationEnd?: Date | null;
  submissionStart?: Date | null;
  submissionEnd?: Date | null;
  judgingStart?: Date | null;
  judgingEnd?: Date | null;
  resultsDate?: Date | null;
}

export function TimelineDisplay(props: TimelineDisplayProps) {
  const events: TimelineEvent[] = [
    { label: "Registration Opens", date: props.registrationStart ?? null, color: "bg-blue-500" },
    { label: "Registration Closes", date: props.registrationEnd ?? null, color: "bg-blue-500" },
    { label: "Submission Opens", date: props.submissionStart ?? null, color: "bg-primary" },
    { label: "Submission Deadline", date: props.submissionEnd ?? null, color: "bg-primary" },
    { label: "Judging Begins", date: props.judgingStart ?? null, color: "bg-amber-500" },
    { label: "Judging Ends", date: props.judgingEnd ?? null, color: "bg-amber-500" },
    { label: "Results Announced", date: props.resultsDate ?? null, color: "bg-green-500" },
  ].filter((e) => e.date);

  if (events.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        Timeline not yet set
      </div>
    );
  }

  const now = new Date();
  // Find the current stage = first event in the future. Everything before
  // is past (✓), everything after is future (dim).
  const firstFutureIdx = events.findIndex((e) => e.date && e.date > now);
  const currentStageIdx = firstFutureIdx === -1 ? events.length - 1 : Math.max(0, firstFutureIdx - 1);

  return (
    <div className="space-y-3">
      {events.map((event, i) => {
        const isPast = event.date && event.date < now;
        const isCurrent = i === currentStageIdx && !isPast;
        const isJustPassed = i === currentStageIdx && isPast;
        const isFuture = !isPast && !isCurrent;

        return (
          <div key={i} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              {isPast ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : isCurrent || isJustPassed ? (
                <span className="relative flex h-3.5 w-3.5">
                  <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${event.color} opacity-60`} />
                  <span className={`relative inline-flex h-3.5 w-3.5 rounded-full ${event.color}`} />
                </span>
              ) : (
                <div className="h-3 w-3 rounded-full bg-muted-foreground/30" />
              )}
              {i < events.length - 1 && (
                <div className={`h-6 w-px ${isPast ? "bg-emerald-500/40" : "bg-border"}`} />
              )}
            </div>
            <div
              className={
                isPast
                  ? "-mt-0.5 text-muted-foreground line-through-none"
                  : isCurrent
                    ? "-mt-0.5"
                    : "-mt-0.5 text-muted-foreground/70"
              }
            >
              <p
                className={`text-sm font-medium ${isCurrent ? "text-primary" : ""}`}
              >
                {event.label}
                {isCurrent && (
                  <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    NOW
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {event.date ? format(new Date(event.date), "MMM d, yyyy 'at' h:mm a") : "TBD"}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
