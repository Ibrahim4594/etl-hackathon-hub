import { cn } from "@/lib/utils";

interface SkeletonCardProps {
  className?: string;
}

export function SkeletonCard({ className }: SkeletonCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/50 bg-card p-6 space-y-4",
        className
      )}
    >
      {/* Image placeholder */}
      <div className="h-40 w-full rounded-xl bg-muted animate-pulse" />
      {/* Title */}
      <div className="h-5 w-3/4 rounded-lg bg-muted animate-pulse" />
      {/* Description */}
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-muted animate-pulse" />
        <div className="h-3 w-5/6 rounded bg-muted animate-pulse" />
      </div>
      {/* Metadata row */}
      <div className="flex items-center gap-4 pt-2">
        <div className="h-3 w-16 rounded bg-muted animate-pulse" />
        <div className="h-3 w-20 rounded bg-muted animate-pulse" />
        <div className="h-3 w-14 rounded bg-muted animate-pulse" />
      </div>
    </div>
  );
}

export function SkeletonStats({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/50 bg-card p-6",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-3 w-20 rounded bg-muted animate-pulse" />
          <div className="h-8 w-16 rounded-lg bg-muted animate-pulse" />
        </div>
        <div className="h-12 w-12 rounded-xl bg-muted animate-pulse" />
      </div>
    </div>
  );
}

export function SkeletonTableRow({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 px-4 py-3 border-b border-border/30",
        className
      )}
    >
      <div className="h-4 w-4 rounded bg-muted animate-pulse" />
      <div className="h-4 w-1/4 rounded bg-muted animate-pulse" />
      <div className="h-4 w-1/6 rounded bg-muted animate-pulse" />
      <div className="h-4 w-1/5 rounded bg-muted animate-pulse" />
      <div className="ml-auto h-6 w-16 rounded-full bg-muted animate-pulse" />
    </div>
  );
}

export function SkeletonTable({
  rows = 5,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/50 overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-3 bg-muted/40 border-b border-border/50">
        <div className="h-3 w-1/4 rounded bg-muted animate-pulse" />
        <div className="h-3 w-1/6 rounded bg-muted animate-pulse" />
        <div className="h-3 w-1/5 rounded bg-muted animate-pulse" />
        <div className="ml-auto h-3 w-12 rounded bg-muted animate-pulse" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonTableRow key={i} />
      ))}
    </div>
  );
}
