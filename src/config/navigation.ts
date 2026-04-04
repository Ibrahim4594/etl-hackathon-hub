import {
  LayoutDashboard,
  Trophy,
  Users,
  FileText,
  BarChart3,
  Settings,
  Shield,
  Building2,
  Gavel,
  ClipboardList,
  Plus,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
};

export const studentNav: NavItem[] = [
  { title: "Dashboard", href: "/student/dashboard", icon: LayoutDashboard },
  { title: "Competitions", href: "/competitions", icon: Trophy },
  { title: "My Teams", href: "/student/teams", icon: Users },
  { title: "Submissions", href: "/student/submissions", icon: FileText },
  { title: "Profile", href: "/student/profile", icon: Settings },
];

export const sponsorNav: NavItem[] = [
  { title: "Dashboard", href: "/sponsor/dashboard", icon: LayoutDashboard },
  { title: "Hackathon Management", href: "/sponsor/competitions", icon: Trophy },
  { title: "Create New", href: "/sponsor/competitions/new", icon: Plus },
  { title: "Analytics", href: "/sponsor/analytics", icon: BarChart3 },
  { title: "Organization", href: "/sponsor/organization", icon: Building2 },
];

export const judgeNav: NavItem[] = [
  { title: "Dashboard", href: "/judge/dashboard", icon: LayoutDashboard },
  { title: "Assignments", href: "/judge/assignments", icon: ClipboardList },
  { title: "Evaluate", href: "/judge/evaluate", icon: Gavel },
];

export const adminNav: NavItem[] = [
  { title: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { title: "Users", href: "/admin/users", icon: Users },
  { title: "Organizations", href: "/admin/organizations", icon: Building2 },
  { title: "Hackathon Management", href: "/admin/competitions", icon: Trophy },
  { title: "Submissions", href: "/admin/submissions", icon: FileText },
  { title: "Judges", href: "/admin/judges", icon: Gavel },
  { title: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { title: "Settings", href: "/admin/settings", icon: Shield },
];

export function getNavForRole(role: string): NavItem[] {
  switch (role) {
    case "student": return studentNav;
    case "sponsor": return sponsorNav;
    case "judge": return judgeNav;
    case "admin": return adminNav;
    default: return [];
  }
}
