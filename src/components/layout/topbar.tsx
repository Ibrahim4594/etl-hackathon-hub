"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { NotificationBell } from "@/components/shared/notification-bell";
import { ChevronRight } from "lucide-react";
import { ModeToggle } from "@/components/shared/mode-toggle";

// UUID pattern to detect IDs in breadcrumbs
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SEGMENT_LABELS: Record<string, string> = {
  sponsor: "Organizer",
  organizer: "Organizer",
};

function formatSegment(seg: string): string {
  // Hide UUIDs — they'll be shown as "Details"
  if (UUID_RE.test(seg)) return "Details";
  if (SEGMENT_LABELS[seg]) return SEGMENT_LABELS[seg];
  return seg
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  // Build cumulative paths so each crumb links to its parent route.
  const crumbs = segments.map((seg, i) => ({
    label: formatSegment(seg),
    href: "/" + segments.slice(0, i + 1).join("/"),
    isUuid: UUID_RE.test(seg),
  }));

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        // Last crumb is non-clickable (current page).
        // UUID segments are not navigable on their own.
        const clickable = !isLast && !crumb.isUuid;
        return (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
            )}
            {clickable ? (
              <Link
                href={crumb.href}
                className="text-muted-foreground transition-colors hover:text-primary hover:underline"
              >
                {crumb.label}
              </Link>
            ) : (
              <span
                className={
                  isLast
                    ? "font-medium text-foreground"
                    : "text-muted-foreground"
                }
              >
                {crumb.label}
              </span>
            )}
          </span>
        );
      })}
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
