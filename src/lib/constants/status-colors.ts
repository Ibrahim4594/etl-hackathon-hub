/**
 * Centralized status color maps used across all dashboards.
 * Import from here instead of defining inline in each page.
 */

/** Split-property config for badges that need individual color/bg/border/label access. */
export const COMPETITION_STATUS_CONFIG: Record<string, {
  color: string;
  bg: string;
  border: string;
  label: string;
  dot?: boolean;
}> = {
  draft: { color: "text-zinc-400", bg: "bg-zinc-500/10", border: "border-zinc-500/20", label: "Draft" },
  pending_review: { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", label: "In Review" },
  approved: { color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", label: "Approved" },
  active: { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", label: "Live", dot: true },
  judging: { color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20", label: "Judging", dot: true },
  completed: { color: "text-zinc-400", bg: "bg-zinc-500/10", border: "border-zinc-500/20", label: "Completed" },
  cancelled: { color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", label: "Cancelled" },
};

export const COMPETITION_STATUS_COLORS: Record<string, string> = {
  draft: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
  pending_review: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  approved: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  active: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  judging: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  completed: "bg-zinc-500/10 text-zinc-400 border-zinc-400/20",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
};

export const SUBMISSION_STATUS_COLORS: Record<string, string> = {
  submitted: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  validating: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  valid: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  invalid: "bg-red-500/10 text-red-500 border-red-500/20",
  flagged: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  ai_evaluated: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  judged: "bg-primary/10 text-primary border-primary/20",
  finalist: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  winner: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

export function formatStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getCompetitionStatusColor(status: string): string {
  return COMPETITION_STATUS_COLORS[status] ?? "bg-muted text-muted-foreground border-border";
}

export function getSubmissionStatusColor(status: string): string {
  return SUBMISSION_STATUS_COLORS[status] ?? "bg-muted text-muted-foreground border-border";
}
