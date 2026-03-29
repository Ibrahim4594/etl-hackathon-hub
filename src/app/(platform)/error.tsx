"use client";

import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-destructive/10 mx-auto mb-6">
          <span className="text-5xl text-destructive font-bold">!</span>
        </div>
        <h2 className="text-xl font-bold text-foreground">
          Something <span className="animated-gradient-text">went wrong</span>
        </h2>
        {error?.message && (
          <p className="mt-2 text-sm text-muted-foreground/70">{error.message}</p>
        )}
        <p className="mt-2 text-sm text-muted-foreground">
          An error occurred while loading this page.
        </p>
        <div className="mt-6 flex gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground px-5 py-2 text-sm font-semibold hover:scale-[1.02] transition-transform cursor-pointer"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-border text-foreground px-5 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
