"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Building2, Mail, Phone, Globe, User, Calendar, Briefcase } from "lucide-react";

interface OrgDetailsDialogProps {
  org: {
    id: string;
    name: string;
    slug: string;
    website: string | null;
    industry: string | null;
    description: string | null;
    contactEmail: string | null;
    contactPersonName: string | null;
    contactPhone: string | null;
    verification: string;
    rejectionReason: string | null;
    logoUrl: string | null;
    createdAt: Date | null;
    ownerFirstName: string | null;
    ownerLastName: string | null;
    ownerEmail: string;
  };
}

function fmtDate(d: Date | null): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-PK", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(d));
}

const verificationColor: Record<string, string> = {
  verified: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  rejected: "bg-red-500/10 text-red-400 border-red-500/20",
  pending: "bg-amber-500/10 text-amber-500 border-amber-500/20",
};

export function OrgDetailsDialog({ org }: OrgDetailsDialogProps) {
  const [open, setOpen] = useState(false);
  const ownerName = [org.ownerFirstName, org.ownerLastName].filter(Boolean).join(" ") || "—";

  return (
    <>
      <Button variant="ghost" size="sm" className="gap-1" onClick={() => setOpen(true)}>
        <Eye className="h-3.5 w-3.5" />
        View
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-card">
              {org.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={org.logoUrl} alt={org.name} className="h-full w-full object-cover" />
              ) : (
                <Building2 className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <DialogTitle className="text-lg">{org.name}</DialogTitle>
              <DialogDescription className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={verificationColor[org.verification] ?? ""}
                >
                  {org.verification.charAt(0).toUpperCase() + org.verification.slice(1)}
                </Badge>
                <span className="text-xs text-muted-foreground">@{org.slug}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {org.description && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                About
              </p>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{org.description}</p>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field icon={Briefcase} label="Industry" value={org.industry ?? "—"} />
            <Field
              icon={Globe}
              label="Website"
              value={
                org.website ? (
                  <a
                    href={org.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {org.website.replace(/^https?:\/\//, "")}
                  </a>
                ) : (
                  "—"
                )
              }
            />
            <Field icon={User} label="Owner" value={ownerName} />
            <Field icon={Mail} label="Owner Email" value={org.ownerEmail} />
            <Field
              icon={User}
              label="Contact Person"
              value={org.contactPersonName ?? "—"}
            />
            <Field
              icon={Mail}
              label="Contact Email"
              value={
                org.contactEmail ? (
                  <a href={`mailto:${org.contactEmail}`} className="text-primary hover:underline">
                    {org.contactEmail}
                  </a>
                ) : (
                  "—"
                )
              }
            />
            <Field icon={Phone} label="Contact Phone" value={org.contactPhone ?? "—"} />
            <Field icon={Calendar} label="Registered" value={fmtDate(org.createdAt)} />
          </div>

          {org.rejectionReason && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
              <p className="text-xs font-semibold text-red-400 mb-1">Rejection reason</p>
              <p className="text-sm text-red-400/90">{org.rejectionReason}</p>
            </div>
          )}
        </div>
      </DialogContent>
      </Dialog>
    </>
  );
}

function Field({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="text-sm">{value}</div>
    </div>
  );
}
