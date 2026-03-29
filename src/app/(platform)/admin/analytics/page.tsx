import { serverAuth } from "@/lib/auth/server-auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users, competitions, submissions } from "@/lib/db/schema";
import { eq, sql, count, sum } from "drizzle-orm";
import { resolveOnboardingUser } from "@/lib/auth/resolve-onboarding-user";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  Trophy,
  FileText,
  DollarSign,
  GraduationCap,
  Building2,
  Gavel,
  ShieldCheck,
} from "lucide-react";

export default async function AdminAnalyticsPage() {
  const { userId } = await serverAuth();
  if (!userId) redirect("/sign-in");

  const dbUser = await resolveOnboardingUser(userId);
  if (!dbUser || !dbUser.onboardingComplete) redirect("/onboarding");
  if (dbUser.role !== "admin") {
    redirect(dbUser.role ? `/${dbUser.role}/dashboard` : "/onboarding");
  }

  // Fetch aggregate stats in parallel
  const [
    totalUsersResult,
    usersByRoleResult,
    totalCompetitionsResult,
    competitionsByStatusResult,
    totalSubmissionsResult,
    totalPrizePoolResult,
  ] = await Promise.all([
    // Total users
    db.select({ count: count() }).from(users),

    // Users by role
    db
      .select({
        role: users.role,
        count: count(),
      })
      .from(users)
      .groupBy(users.role),

    // Total competitions
    db.select({ count: count() }).from(competitions),

    // Competitions by status
    db
      .select({
        status: competitions.status,
        count: count(),
      })
      .from(competitions)
      .groupBy(competitions.status),

    // Total submissions
    db.select({ count: count() }).from(submissions),

    // Total prize pool
    db
      .select({
        total: sum(competitions.totalPrizePool),
      })
      .from(competitions),
  ]);

  const totalUsers = totalUsersResult[0]?.count ?? 0;
  const totalCompetitions = totalCompetitionsResult[0]?.count ?? 0;
  const totalSubmissions = totalSubmissionsResult[0]?.count ?? 0;
  const totalPrizePool = Number(totalPrizePoolResult[0]?.total ?? 0);

  // Extract role counts
  const roleMap: Record<string, number> = {};
  for (const row of usersByRoleResult) {
    roleMap[row.role ?? "unassigned"] = row.count;
  }

  // Extract status counts
  const statusMap: Record<string, number> = {};
  for (const row of competitionsByStatusResult) {
    statusMap[row.status] = row.count;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Platform Analytics"
        description="Overview of platform-wide statistics and metrics"
      />

      {/* Top-level stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Users" value={totalUsers} icon={Users} />
        <StatCard
          title="Total Competitions"
          value={totalCompetitions}
          icon={Trophy}
        />
        <StatCard
          title="Total Submissions"
          value={totalSubmissions}
          icon={FileText}
        />
        <StatCard
          title="Total Prize Pool"
          value={`PKR ${totalPrizePool.toLocaleString()}`}
          icon={DollarSign}
        />
      </div>

      {/* Users by role */}
      <Card>
        <CardHeader>
          <CardTitle>Users by Role</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Participants"
              value={roleMap["student"] ?? 0}
              icon={GraduationCap}
            />
            <StatCard
              title="Organizers"
              value={roleMap["sponsor"] ?? 0}
              icon={Building2}
            />
            <StatCard
              title="Judges"
              value={roleMap["judge"] ?? 0}
              icon={Gavel}
            />
            <StatCard
              title="Admins"
              value={roleMap["admin"] ?? 0}
              icon={ShieldCheck}
            />
          </div>
        </CardContent>
      </Card>

      {/* Competitions by status */}
      <Card>
        <CardHeader>
          <CardTitle>Competitions by Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Draft"
              value={statusMap["draft"] ?? 0}
              icon={FileText}
            />
            <StatCard
              title="Pending Review"
              value={statusMap["pending_review"] ?? 0}
              icon={Trophy}
            />
            <StatCard
              title="Active"
              value={statusMap["active"] ?? 0}
              icon={Trophy}
            />
            <StatCard
              title="Completed"
              value={statusMap["completed"] ?? 0}
              icon={Trophy}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
