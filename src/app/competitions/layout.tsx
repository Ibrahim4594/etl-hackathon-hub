import Link from "next/link";
import Image from "next/image";
import { LogIn, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { serverAuth } from "@/lib/auth/server-auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ModeToggle } from "@/components/shared/mode-toggle";
import { MobileNav } from "@/components/marketing/mobile-nav";

async function Navbar() {
  const { userId } = await serverAuth();
  let userRole: string | undefined;
  if (userId) {
    const [u] = await db.select({ role: users.role }).from(users).where(eq(users.clerkId, userId));
    userRole = u?.role ?? undefined;
  }
  const dashboardSegment = userRole === "sponsor" ? "organizer" : userRole;
  const dashboardHref = dashboardSegment ? `/${dashboardSegment}/dashboard` : "/onboarding";

  return (
    <nav className="fixed top-0 w-full bg-background/80 backdrop-blur-xl border-b border-border/50 z-50">
      <div className="container mx-auto px-2 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-1">
              <div className="relative">
                <Image
                  src="/logo/spark-logo-animated-themed.gif"
                  width={40}
                  height={30}
                  alt="Spark logo"
                  unoptimized
                />
              </div>
              <Link href="/" className="text-xl font-bold bg-gradient-to-r from-primary via-primary-hover to-foreground bg-clip-text text-transparent">
                SPARK
              </Link>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-6">
            <Link href="/competitions" className="text-foreground dark:text-foreground hover:text-primary dark:hover:text-primary-hover transition-colors font-medium">
              Competitions
            </Link>
            <Link href="/#features" className="text-foreground dark:text-foreground hover:text-primary dark:hover:text-primary-hover transition-colors font-medium">
              Features
            </Link>
            <Link href="/#sponsors" className="text-foreground dark:text-foreground hover:text-primary dark:hover:text-primary-hover transition-colors font-medium">
              For Organizers
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <MobileNav userId={userId} dashboardHref={dashboardHref} />
            <div className="hidden sm:block">
              <ModeToggle />
            </div>
            {!userId ? (
              <>
                <SignInButton mode="redirect">
                  <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
                    <span className="hidden sm:inline">Sign In</span>
                    <LogIn className="w-4 h-4" />
                  </button>
                </SignInButton>
                <div className="hidden sm:block">
                  <SignUpButton mode="redirect">
                    <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors h-9 px-4 py-2 bg-gradient-to-r from-primary to-accent hover:from-primary-hover hover:to-accent-hover text-primary-foreground shadow-lg">
                      Join SPARK
                      <Sparkles className="ml-2 w-4 h-4" />
                    </button>
                  </SignUpButton>
                </div>
              </>
            ) : (
              <>
                <Link href={dashboardHref}>
                  <Button variant="ghost" className="h-9 px-4 py-2 text-sm font-medium">
                    {userRole ? "Dashboard" : "Complete Profile"}
                  </Button>
                </Link>
                <UserButton />
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default function CompetitionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 pt-24">{children}</main>
    </div>
  );
}
