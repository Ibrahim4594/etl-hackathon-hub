import { ModeToggle } from "@/components/shared/mode-toggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background overflow-hidden">
      {/* Theme toggle — top right */}
      <div className="absolute top-4 right-4 z-50">
        <ModeToggle />
      </div>

      {/* Decorative orbs */}
      <div className="absolute -left-20 top-20 w-72 h-72 bg-primary/20 dark:bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -right-20 bottom-20 w-96 h-96 bg-accent/20 dark:bg-accent/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative">{children}</div>
    </div>
  );
}
