"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/shared/mode-toggle";

interface MobileNavProps {
  userId: string | null;
  dashboardHref: string;
}

export function MobileNav({ userId, dashboardHref }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={<Button variant="ghost" size="icon" className="h-9 w-9" />}
        >
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="right" className="w-72 p-6">
          <nav className="flex flex-col gap-4 mt-8">
            <Link
              href="/competitions"
              onClick={() => setOpen(false)}
              className="text-foreground hover:text-primary transition-colors font-medium py-2"
            >
              Competitions
            </Link>
            <Link
              href="/#features"
              onClick={() => setOpen(false)}
              className="text-foreground hover:text-primary transition-colors font-medium py-2"
            >
              Features
            </Link>
            <Link
              href="/#sponsors"
              onClick={() => setOpen(false)}
              className="text-foreground hover:text-primary transition-colors font-medium py-2"
            >
              For Organizers
            </Link>

            <div className="border-t pt-4 mt-2">
              {!userId ? (
                <div className="flex flex-col gap-3">
                  <Link href="/sign-in" onClick={() => setOpen(false)}>
                    <Button variant="outline" className="w-full">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/sign-up" onClick={() => setOpen(false)}>
                    <Button className="w-full">Join SPARK</Button>
                  </Link>
                </div>
              ) : (
                <Link href={dashboardHref} onClick={() => setOpen(false)}>
                  <Button className="w-full">Dashboard</Button>
                </Link>
              )}
            </div>

            <div className="border-t pt-4">
              <ModeToggle />
            </div>
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}
