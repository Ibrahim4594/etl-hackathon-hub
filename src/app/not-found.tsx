import Link from "next/link";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-6 overflow-hidden">
      {/* Subtle decorative orbs */}
      <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute -right-20 -bottom-20 h-48 w-48 rounded-full bg-accent/10 blur-3xl pointer-events-none" />

      <div className="relative text-center max-w-md">
        <p className="text-8xl font-black animated-gradient-text">404</p>
        <h1 className="mt-4 text-2xl font-bold text-foreground">
          Looks like this page went off the grid
        </h1>
        <p className="mt-2 text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold hover:scale-[1.02] transition-transform"
          >
            Go Home
          </Link>
          <Link
            href="/competitions"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Browse Competitions
          </Link>
        </div>
      </div>
    </div>
  );
}
