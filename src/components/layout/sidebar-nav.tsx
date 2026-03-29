"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useUser, SignOutButton } from "@clerk/nextjs";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { getNavForRole } from "@/config/navigation";
import { LogOut } from "lucide-react";

export function SidebarNav() {
  const pathname = usePathname();
  const { user } = useUser();

  // Derive role from URL path first (reliable), fallback to Clerk metadata (can be stale)
  const pathSegment = pathname.split("/")[1]; // "student", "sponsor", "judge", "admin"
  const pathRole = ["student", "sponsor", "judge", "admin"].includes(pathSegment) ? pathSegment : null;
  const clerkRole = (user?.publicMetadata as { role?: string })?.role;
  const role = pathRole ?? clerkRole ?? "student";
  const navItems = getNavForRole(role);

  const name = user?.fullName || user?.firstName || "User";
  const email = user?.primaryEmailAddress?.emailAddress || "";
  const imageUrl = user?.imageUrl;

  return (
    <Sidebar>
      {/* ── Logo ── */}
      <SidebarHeader className="border-b border-sidebar-border px-5 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/logo/spark-logo-animated-themed.gif"
            alt="Spark Logo"
            width={32}
            height={32}
            unoptimized
            className="h-8 w-8 logo-glow"
          />
          <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            SPARK
          </span>
        </Link>
      </SidebarHeader>

      {/* ── Navigation links (scrollable) ── */}
      <SidebarContent className="px-2 pt-5">
        <SidebarGroup>
          <SidebarGroupLabel className="mb-2 px-3 text-[10px] font-medium uppercase tracking-widest text-muted-foreground/50">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/competitions" &&
                    item.href !== "/" &&
                    pathname.startsWith(item.href));

                return (
                  <SidebarMenuItem key={item.href}>
                    <Link href={item.href}>
                      <SidebarMenuButton
                        isActive={isActive}
                        className={
                          isActive
                            ? "border-l-[3px] border-l-primary bg-sidebar-accent font-semibold text-sidebar-accent-foreground [&_svg]:text-primary transition-all duration-200"
                            : "border-l-[3px] border-l-transparent text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground [&_svg]:text-sidebar-foreground/60 hover:[&_svg]:text-primary/70 transition-all duration-200"
                        }
                      >
                        <item.icon className="h-4 w-4 shrink-0 transition-colors" />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* ── User card + Sign Out (pinned to bottom) ── */}
      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={name}
              width={32}
              height={32}
              className="h-8 w-8 shrink-0 rounded-full object-cover ring-2 ring-border"
            />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
              {name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {name}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {email}
            </p>
          </div>
        </div>
        <SignOutButton>
          <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive cursor-pointer">
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </SignOutButton>
      </SidebarFooter>
    </Sidebar>
  );
}
