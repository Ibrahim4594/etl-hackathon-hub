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
import { SidebarProvider } from "@/components/ui/sidebar";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Topbar } from "@/components/layout/topbar";
import { PlatformFab } from "@/components/layout/platform-fab";

async function MarketingNavbar({
  userId,
  role,
}: {
  userId: string | null;
  role: string | undefined;
}) {
  const dashboardSegment = role === "sponsor" ? "organizer" : role;
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
            <Link href="/competitions" className="text-foreground hover:text-primary transition-colors font-medium">
              Competitions
            </Link>
            <Link href="/#features" className="text-foreground hover:text-primary transition-colors font-medium">
              Features
            </Link>
            <Link href="/#sponsors" className="text-foreground hover:text-primary transition-colors font-medium">
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
                  <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium border border-input bg-background shadow-sm hover:bg-accent h-9 px-4 py-2">
                    <span className="hidden sm:inline">Sign In</span>
                    <LogIn className="w-4 h-4" />
                  </button>
                </SignInButton>
                <div className="hidden sm:block">
                  <SignUpButton mode="redirect">
                    <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-9 px-4 py-2 bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg">
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
                    {role ? "Dashboard" : "Complete Profile"}
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

export default async function CompetitionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await serverAuth();
  let role: string | undefined;
  let dbUserId: string | undefined;

  if (userId) {
    const [u] = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.clerkId, userId));
    role = u?.role ?? undefined;
    dbUserId = u?.id;
  }

  // Authenticated user with role → wrap in platform shell so sidebar/topbar
  // match other pages. Public visitors see marketing-style top nav.
  if (userId && role) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <SidebarNav />
          <div className="flex flex-1 flex-col">
            <Topbar userId={dbUserId} />
            <main className="flex-1 p-6">{children}</main>
          </div>
        </div>
        <PlatformFab />
      </SidebarProvider>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <MarketingNavbar userId={userId} role={role} />
      <main className="flex-1 pt-24">{children}</main>
    </div>
  );
}
