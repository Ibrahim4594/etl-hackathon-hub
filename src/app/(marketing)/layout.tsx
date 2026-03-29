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
import { PageFadeIn } from "@/components/marketing/page-fade-in";

async function Navbar() {
  const { userId } = await serverAuth();
  let userRole: string | undefined;
  if (userId) {
    const [u] = await db.select({ role: users.role }).from(users).where(eq(users.clerkId, userId));
    userRole = u?.role ?? undefined;
  }
  const dashboardHref = userRole ? `/${userRole}/dashboard` : "/student/dashboard";

  return (
    <nav className="fixed top-0 w-full bg-background/80 backdrop-blur-xl border-b border-border/50 z-50">
      <div className="container mx-auto px-2 py-4">
        <div className="flex items-center justify-between">
          {/* Logo — matches Spark HeaderComponent exactly */}
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

          {/* Center nav links — matches Spark: text-foreground, font-medium, hover:text-primary */}
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

          {/* Right: ModeToggle + auth buttons — matches Spark order: toggle, sign-in, join */}
          <div className="flex items-center gap-2">
            <MobileNav userId={userId} dashboardHref={dashboardHref} />
            <div className="hidden sm:block">
              <ModeToggle />
            </div>
            {!userId ? (
              <>
                {/* Sign In — Spark: variant="outline" = border border-input bg-background shadow-sm hover:bg-accent h-9 px-4 py-2, LogIn icon */}
                <SignInButton mode="redirect">
                  <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
                    <span className="hidden sm:inline">Sign In</span>
                    <LogIn className="w-4 h-4" />
                  </button>
                </SignInButton>
                {/* Join SPARK — Spark: gradient from-primary to-accent, Sparkles icon ml-2 */}
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
                  <Button variant="ghost" className="h-9 px-4 py-2 text-sm font-medium">Dashboard</Button>
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

function Footer() {
  return (
    <footer className="py-16 px-6 bg-gray-900 dark:bg-slate-950 text-white grain relative overflow-hidden">
      <div className="container mx-auto">
        <div className="grid md:grid-cols-4 gap-12">
          <div>
            <div className="flex items-center space-x-3 mb-6">
              <div className="relative">
                <Image
                  src="/logo/spark-logo-animated-themed.gif"
                  width={40}
                  height={30}
                  alt="Spark logo"
                  unoptimized
                />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary via-primary-hover to-white bg-clip-text text-transparent">
                SPARK
              </span>
            </div>
            <p className="text-gray-400 leading-relaxed">
              Empowering Pakistan&apos;s tech future through collaboration,
              mentorship, and innovation. Building bridges between academia and
              industry.
            </p>
          </div>

          <div>
            <h3 className="font-bold mb-6 text-lg">Platform</h3>
            <ul className="space-y-3 text-gray-400">
              <li>
                <Link href="/competitions" className="hover:text-white transition-colors">
                  Competitions
                </Link>
              </li>
              <li>
                <Link href="/#features" className="hover:text-white transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/#roadmap" className="hover:text-white transition-colors">
                  Roadmap
                </Link>
              </li>
              <li>
                <Link href="/#faq" className="hover:text-white transition-colors">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold mb-6 text-lg">Account</h3>
            <ul className="space-y-3 text-gray-400">
              <li>
                <Link href="/sign-in" className="hover:text-white transition-colors">
                  Sign In
                </Link>
              </li>
              <li>
                <Link href="/sign-up" className="hover:text-white transition-colors">
                  Get Started
                </Link>
              </li>
              <li>
                <Link href="/student/dashboard" className="hover:text-white transition-colors">
                  Participant Dashboard
                </Link>
              </li>
              <li>
                <Link href="/sponsor/dashboard" className="hover:text-white transition-colors">
                  Organizer Dashboard
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold mb-6 text-lg">Connect</h3>
            <ul className="space-y-3 text-gray-400">
              <li>
                <Link href="mailto:info@etlonline.org" className="hover:text-white transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/#sponsors" className="hover:text-white transition-colors">
                  For Organizers
                </Link>
              </li>
              <li>
                <Link href="https://www.etlonline.org/" className="hover:text-white transition-colors">
                  ETLOnline.org
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
          <p>
            &copy; {new Date().getFullYear()} Competition Spark. Built with ❤️ for
            Pakistan&apos;s tech community by{" "}
            <Link href="https://www.etlonline.org/" className="font-bold hover:text-white transition-colors">
              ETLOnline.org
            </Link>
            . Made by{" "}
            <span className="font-bold text-primary">Ibrahim Samad</span>.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden">
      <Navbar />
      <main className="flex-1 pt-24">
        <PageFadeIn>{children}</PageFadeIn>
      </main>
      <Footer />
    </div>
  );
}
