import Link from "next/link";
import { Trophy } from "lucide-react";

export default function CompetitionNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mx-auto mb-4">
          <Trophy className="h-8 w-8 text-primary/40" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">
          Competition not found
        </h1>
        <p className="mt-2 text-muted-foreground">
          This competition may have been removed or the link is incorrect.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <Link
            href="/competitions"
            className="inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold hover:scale-[1.02] transition-transform"
          >
            Browse Competitions
          </Link>
          <Link
            href="/competitions"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Browse all competitions
          </Link>
        </div>
      </div>
    </div>
  );
}
