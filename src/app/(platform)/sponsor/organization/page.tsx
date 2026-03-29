import { serverAuth } from "@/lib/auth/server-auth";
import { db } from "@/lib/db";
import { organizations, competitions } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";
import { redirect } from "next/navigation";
import { resolveOnboardingUser } from "@/lib/auth/resolve-onboarding-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { OrgEditForm } from "@/components/sponsor/org-edit-form";
import {
  Building2,
  Globe,
  Mail,
  Phone,
  Briefcase,
  ShieldCheck,
  Trophy,
  Calendar,
  User,
} from "lucide-react";
import { format } from "date-fns";

export default async function SponsorOrganizationPage() {
  const { userId } = await serverAuth();
  if (!userId) redirect("/sign-in");

  const dbUser = await resolveOnboardingUser(userId);
  if (!dbUser || !dbUser.onboardingComplete) redirect("/onboarding");
  if (dbUser.role !== "sponsor" && dbUser.role !== "admin") {
    redirect(dbUser.role ? `/${dbUser.role}/dashboard` : "/onboarding");
  }

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.ownerId, dbUser.id));

  if (!org) {
    return (
      <div className="space-y-8">
        <EmptyState
          icon={Building2}
          title="No organization found"
          description="Complete your organizer onboarding to create an organization."
        />
      </div>
    );
  }

  // Stats
  const [compCount] = await db
    .select({ count: count() })
    .from(competitions)
    .where(eq(competitions.organizationId, org.id));

  const verificationConfig =
    org.verification === "verified"
      ? { class: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", label: "Verified", icon: "✓" }
      : org.verification === "rejected"
        ? { class: "bg-red-500/10 text-red-400 border-red-500/20", label: "Rejected", icon: "✗" }
        : { class: "bg-amber-500/10 text-amber-400 border-amber-500/20", label: "Pending Review", icon: "◷" };

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="rounded-2xl border border-border/50 bg-gradient-to-b from-muted/40 to-muted/20 p-6 md:p-8">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/60 shadow-md">
              {org.logoUrl ? (
                <img
                  src={org.logoUrl}
                  alt={org.name}
                  className="h-16 w-16 rounded-2xl object-cover"
                />
              ) : (
                <Building2 className="h-8 w-8 text-primary-foreground" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{org.name}</h1>
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${verificationConfig.class}`}
                >
                  {verificationConfig.label}
                </span>
              </div>
              {org.description && (
                <p className="mt-1 max-w-xl text-sm text-muted-foreground line-clamp-2">
                  {org.description}
                </p>
              )}
              <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Trophy className="h-3 w-3 text-primary" />
                  {compCount?.count ?? 0} competition{(compCount?.count ?? 0) !== 1 ? "s" : ""}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Joined {format(new Date(org.createdAt), "MMM yyyy")}
                </span>
              </div>
            </div>
          </div>

          <OrgEditForm
            org={{
              name: org.name,
              website: org.website,
              description: org.description,
              industry: org.industry,
              contactEmail: org.contactEmail,
              contactPhone: org.contactPhone,
              contactPersonName: org.contactPersonName,
            }}
          />
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
                <Briefcase className="h-4 w-4 text-primary" />
              </div>
              Organization Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { icon: Briefcase, label: "Industry", value: org.industry },
              {
                icon: Globe,
                label: "Website",
                value: org.website,
                isLink: true,
              },
              { icon: ShieldCheck, label: "Verification", badge: verificationConfig },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </span>
                {item.badge ? (
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${item.badge.class}`}
                  >
                    {item.badge.label}
                  </span>
                ) : item.isLink && item.value ? (
                  <a
                    href={item.value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {item.value.replace(/^https?:\/\//, "")}
                  </a>
                ) : (
                  <span className="text-sm font-medium">{item.value || "—"}</span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-500/5">
                <Mail className="h-4 w-4 text-blue-400" />
              </div>
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <User className="h-3.5 w-3.5" /> Contact Person
              </span>
              <span className="text-sm font-medium">
                {org.contactPersonName || "—"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5" /> Email
              </span>
              <span className="text-sm font-medium">
                {org.contactEmail || "—"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Phone className="h-3.5 w-3.5" /> Phone
              </span>
              <span className="text-sm font-medium">
                {org.contactPhone || "—"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* About */}
      {org.description && (
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-500/5">
                <Building2 className="h-4 w-4 text-purple-400" />
              </div>
              About
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {org.description}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
