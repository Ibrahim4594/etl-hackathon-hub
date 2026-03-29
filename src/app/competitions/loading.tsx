import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonCard } from "@/components/shared/skeleton-card";

export default function CompetitionsLoading() {
  return (
    <div className="space-y-8">
      {/* Hero skeleton */}
      <div className="text-center space-y-4 py-8">
        <Skeleton className="h-10 w-80 mx-auto" />
        <Skeleton className="h-5 w-96 mx-auto max-w-full" />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <Skeleton className="h-10 w-32 rounded-xl" />
        <Skeleton className="h-10 w-32 rounded-xl" />
        <Skeleton className="ml-auto h-10 w-28 rounded-xl" />
      </div>

      {/* Competition cards grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
