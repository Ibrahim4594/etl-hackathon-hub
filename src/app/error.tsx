"use client";

import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="text-center max-w-md">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-destructive/10 mx-auto mb-6">
          <span className="text-5xl text-destructive font-bold">!</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground">
          Something <span className="animated-gradient-text">went wrong</span>
        </h1>
        {error?.message && (
          <p className="mt-2 text-sm text-muted-foreground/70">{error.message}</p>
        )}
        <p className="mt-2 text-muted-foreground">
          An unexpected error occurred. Please try again.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold hover:scale-[1.02] transition-transform cursor-pointer"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
