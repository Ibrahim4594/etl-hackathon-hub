"use client";

import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { NotificationBell } from "@/components/shared/notification-bell";
import { ChevronRight } from "lucide-react";
import { ModeToggle } from "@/components/shared/mode-toggle";

// UUID pattern to detect IDs in breadcrumbs
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function formatSegment(seg: string): string {
  // Hide UUIDs — they'll be shown as "Details"
  if (UUID_RE.test(seg)) return "Details";
  return seg
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  const crumbs = segments.map(formatSegment);

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
          )}
          <span
            className={
              i === crumbs.length - 1
                ? "font-medium text-foreground"
                : "text-muted-foreground"
            }
          >
            {crumb}
          </span>
        </span>
      ))}
    </nav>
  );
}

export function Topbar({ userId }: { userId?: string }) {
  return (
    <header className="sticky top-0 z-50 flex h-14 items-center gap-3 border-b border-border/30 bg-background/80 px-4 backdrop-blur-md">
      <SidebarTrigger className="h-8 w-8 text-foreground" />
      <Separator orientation="vertical" className="h-5" />
      <Breadcrumbs />
      <div className="flex-1" />
      <ModeToggle />
      <NotificationBell userId={userId} />
      <Separator orientation="vertical" className="h-5" />
      <UserButton
        appearance={{
          elements: {
            avatarBox: "h-8 w-8 ring-2 ring-primary/20",
          },
        }}
      />
    </header>
  );
}
