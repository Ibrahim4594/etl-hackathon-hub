export const ROLES = {
  STUDENT: "student",
  SPONSOR: "sponsor",
  JUDGE: "judge",
  ADMIN: "admin",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<Role, string> = {
  student: "Participant",
  sponsor: "Organizer",
  judge: "Judge",
  admin: "Admin",
};

export const ROLE_ROUTES: Record<Role, string> = {
  student: "/student/dashboard",
  sponsor: "/sponsor/dashboard",
  judge: "/judge/dashboard",
  admin: "/admin/dashboard",
};

export function isValidRole(role: string): role is Role {
  return Object.values(ROLES).includes(role as Role);
}

export function getDashboardRoute(role: Role): string {
  return ROLE_ROUTES[role];
}

export const PUBLIC_ROUTES = [
  "/",
  "/competitions",
  "/sign-in",
  "/sign-up",
  "/api/webhooks/(.*)",
];

export const ROLE_ROUTE_MAP: Record<string, Role[]> = {
  "/student": ["student"],
  "/sponsor": ["sponsor"],
  "/judge": ["judge"],
  "/admin": ["admin"],
};
