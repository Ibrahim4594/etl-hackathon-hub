import Link from "next/link";
import Image from "next/image";
import { LogIn, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { serverAuth } from "@/lib/auth/server-auth";
import { ModeToggle } from "@/components/shared/mode-toggle";

async function Navbar() {
  const { userId } = await serverAuth();

  return (
    <nav className="fixed top-0 w-full bg-background/95 border-b border-border z-50 shadow-sm">
      <div className="container mx-auto px-2 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1">
            <Image
              src="/logo/spark-logo-animated-themed.gif"
              alt="Spark logo"
              width={40}
              height={30}
              unoptimized
            />
            <span className="text-xl font-bold bg-gradient-to-r from-primary via-primary-hover to-foreground bg-clip-text text-transparent">
              SPARK
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <ModeToggle />
            </div>
            {!userId ? (
              <>
                <SignInButton>
                  <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
                    <span className="hidden sm:inline">Sign In</span>
                    <LogIn className="w-4 h-4" />
                  </button>
                </SignInButton>
                <div className="hidden sm:block">
                  <SignUpButton>
                    <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors h-9 px-4 py-2 bg-gradient-to-r from-primary to-accent hover:from-primary-hover hover:to-accent text-primary-foreground shadow-lg">
                      Join SPARK
                      <Sparkles className="w-4 h-4" />
                    </button>
                  </SignUpButton>
                </div>
              </>
            ) : (
              <>
                <Link href="/student/dashboard">
                  <Button size="sm" variant="ghost">Dashboard</Button>
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
      <main className="flex-1">{children}</main>
    </div>
  );
}
