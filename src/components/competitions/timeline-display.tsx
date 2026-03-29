import { format } from "date-fns";
import { Calendar, Clock } from "lucide-react";

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

  return (
    <div className="space-y-3">
      {events.map((event, i) => {
        const isPast = event.date && event.date < now;
        return (
          <div key={i} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className={`h-3 w-3 rounded-full ${isPast ? "bg-muted-foreground" : event.color}`} />
              {i < events.length - 1 && <div className="h-6 w-px bg-border" />}
            </div>
            <div className={`-mt-0.5 ${isPast ? "text-muted-foreground" : ""}`}>
              <p className="text-sm font-medium">{event.label}</p>
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
