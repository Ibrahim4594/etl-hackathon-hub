import { serverAuth } from "@/lib/auth/server-auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users, organizations } from "@/lib/db/schema";
import { desc, sql, count } from "drizzle-orm";
import { resolveOnboardingUser } from "@/lib/auth/resolve-onboarding-user";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users } from "lucide-react";
import { UserRoleSelect } from "./user-role-select";
import Link from "next/link";

const roleVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  admin: "destructive",
  sponsor: "default",
  judge: "outline",
  student: "secondary",
};

function formatDate(date: Date | null): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

const roleDisplayName: Record<string, string> = {
  student: "Participant",
  sponsor: "Organizer",
  judge: "Judge",
  admin: "Admin",
};

function formatRole(role: string | null): string {
  if (!role) return "Unassigned";
  return roleDisplayName[role] ?? role.charAt(0).toUpperCase() + role.slice(1);
}

const PAGE_SIZE = 50;

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const { userId } = await serverAuth();
  if (!userId) redirect("/sign-in");

  const dbUser = await resolveOnboardingUser(userId);
  if (!dbUser || !dbUser.onboardingComplete) redirect("/onboarding");
  if (dbUser.role !== "admin") {
    redirect(dbUser.role ? `/${dbUser.role}/dashboard` : "/onboarding");
  }

  const { page: pageParam } = await searchParams;
  const currentPage = Math.max(1, parseInt(pageParam || "1", 10));
  const offset = (currentPage - 1) * PAGE_SIZE;

  const [[{ total }], pageUsers] = await Promise.all([
    db.select({ total: count() }).from(users),
    db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
        onboardingComplete: users.onboardingComplete,
        university: users.university,
        createdAt: users.createdAt,
        orgName: sql<string | null>`(
          SELECT ${organizations.name}
          FROM ${organizations}
          WHERE ${organizations.ownerId} = ${users.id}
          LIMIT 1
        )`,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset),
  ]);

  const totalCount = Number(total);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

  return (
    <div className="space-y-8">
      <PageHeader
        title="User Management"
        description="View and manage all platform users"
      />

      {totalCount === 0 ? (
        <EmptyState
          icon={Users}
          title="No users"
          description="No users have registered on the platform yet."
        />
      ) : (
        <>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Change Role</TableHead>
                  <TableHead>Onboarding</TableHead>
                  <TableHead>University / Organization</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.firstName || user.lastName
                        ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()
                        : "-"}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={roleVariant[user.role ?? ""] ?? "secondary"}>
                        {formatRole(user.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <UserRoleSelect
                        userId={user.id}
                        currentRole={user.role}
                        isSelf={user.id === dbUser.id}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.onboardingComplete ? "default" : "outline"}>
                        {user.onboardingComplete ? "Complete" : "Incomplete"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.university || user.orgName || "-"}
                    </TableCell>
                    <TableCell>{formatDate(user.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {offset + 1}–{Math.min(safePage * PAGE_SIZE, totalCount)} of{" "}
              {totalCount} user{totalCount !== 1 ? "s" : ""}
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                {safePage > 1 && (
                  <Link
                    href={`?page=${safePage - 1}`}
                    className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
                  >
                    Previous
                  </Link>
                )}
                <span className="text-sm text-muted-foreground">
                  Page {safePage} of {totalPages}
                </span>
                {safePage < totalPages && (
                  <Link
                    href={`?page=${safePage + 1}`}
                    className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
                  >
                    Next
                  </Link>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
