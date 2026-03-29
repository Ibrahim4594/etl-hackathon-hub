import { Skeleton } from "@/components/ui/skeleton";

export default function StudentSubmissionsLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-44" />
        </div>
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>

      {/* Table header */}
      <div className="rounded-xl border p-6 space-y-4">
        <Skeleton className="h-10 w-full rounded-lg" />
        {/* Table rows */}
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
