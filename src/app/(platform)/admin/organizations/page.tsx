import { serverAuth } from "@/lib/auth/server-auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { organizations, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
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
import { Building2 } from "lucide-react";
import { AdminOrgActions } from "./actions";

const verificationVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  pending: "outline",
  verified: "default",
  rejected: "destructive",
};

function formatStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatDate(date: Date | null): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export default async function AdminOrganizationsPage() {
  const { userId } = await serverAuth();
  if (!userId) redirect("/sign-in");

  const dbUser = await resolveOnboardingUser(userId);
  if (!dbUser || !dbUser.onboardingComplete) redirect("/onboarding");
  if (dbUser.role !== "admin") {
    redirect(dbUser.role ? `/${dbUser.role}/dashboard` : "/onboarding");
  }

  const allOrgs = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      website: organizations.website,
      industry: organizations.industry,
      contactEmail: organizations.contactEmail,
      contactPersonName: organizations.contactPersonName,
      verification: organizations.verification,
      rejectionReason: organizations.rejectionReason,
      createdAt: organizations.createdAt,
      ownerFirstName: users.firstName,
      ownerLastName: users.lastName,
      ownerEmail: users.email,
    })
    .from(organizations)
    .innerJoin(users, eq(organizations.ownerId, users.id))
    .orderBy(desc(organizations.createdAt));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Organizations"
        description="Review and manage organization verifications"
      />

      {allOrgs.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No organizations"
          description="No organizations have registered yet."
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Contact Person</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allOrgs.map((org) => (
                <TableRow key={org.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{org.name}</p>
                      {org.website && (
                        <p className="text-xs text-muted-foreground">{org.website}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">
                        {org.ownerFirstName} {org.ownerLastName}
                      </p>
                      <p className="text-xs text-muted-foreground">{org.ownerEmail}</p>
                    </div>
                  </TableCell>
                  <TableCell>{org.contactPersonName || "-"}</TableCell>
                  <TableCell>{org.industry || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={verificationVariant[org.verification] || "secondary"}>
                      {formatStatus(org.verification)}
                    </Badge>
                    {org.rejectionReason && (
                      <p className="mt-1 text-xs text-destructive">{org.rejectionReason}</p>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(org.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <AdminOrgActions
                      organizationId={org.id}
                      currentStatus={org.verification}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
