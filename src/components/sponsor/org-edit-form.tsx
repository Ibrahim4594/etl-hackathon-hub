"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, X, Pencil } from "lucide-react";
import { toast } from "sonner";
import { ImageUpload } from "@/components/shared/image-upload";

const orgSchema = z.object({
  name: z.string().min(2, "Organization name is required"),
  industry: z.string().optional(),
  website: z.union([
    z.literal(""),
    z.string().url("Enter a valid URL (https://...)"),
  ]),
  contactPersonName: z.string().optional(),
  contactEmail: z.union([
    z.literal(""),
    z.string().email("Enter a valid email address"),
  ]),
  contactPhone: z.string().optional(),
  description: z.string().optional(),
});

type OrgFormValues = z.infer<typeof orgSchema>;

interface OrgData {
  name: string;
  website: string | null;
  description: string | null;
  industry: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactPersonName: string | null;
  logoUrl: string | null;
}

export function OrgEditForm({ org }: { org: OrgData }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>(org.logoUrl ?? "");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OrgFormValues>({
    resolver: zodResolver(orgSchema),
    defaultValues: {
      name: org.name,
      website: org.website ?? "",
      description: org.description ?? "",
      industry: org.industry ?? "",
      contactEmail: org.contactEmail ?? "",
      contactPhone: org.contactPhone ?? "",
      contactPersonName: org.contactPersonName ?? "",
    },
  });

  const onSubmit = async (values: OrgFormValues) => {
    setLoading(true);
    try {
      const res = await fetch("/api/sponsor/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, logoUrl: logoUrl || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");
      toast.success("Organization updated successfully");
      setEditing(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setLoading(false);
    }
  };

  if (!editing) {
    return (
      <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
        <Pencil className="mr-1.5 h-3.5 w-3.5" />
        Edit Organization
      </Button>
    );
  }

  return (
    <Card className="border-primary/20 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Edit Organization</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => { setEditing(false); reset(); }}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Organization Logo</Label>
            <p className="text-xs text-muted-foreground">
              Recommended size: 200x200px. Square format works best.
            </p>
            <ImageUpload
              value={logoUrl}
              onChange={setLogoUrl}
              label="Upload Logo"
              aspect="square"
              placeholder={org.name}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="org-name">Organization Name</Label>
              <Input id="org-name" {...register("name")} />
              {errors.name && (
                <p className="text-xs text-destructive mt-1">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-industry">Industry</Label>
              <Input
                id="org-industry"
                placeholder="e.g., Technology, Finance"
                {...register("industry")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-website">Website</Label>
              <Input
                id="org-website"
                placeholder="https://example.com"
                {...register("website")}
              />
              {errors.website && (
                <p className="text-xs text-destructive mt-1">{errors.website.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-contact-person">Contact Person Name</Label>
              <Input
                id="org-contact-person"
                placeholder="Full name of primary contact"
                {...register("contactPersonName")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-email">Contact Email</Label>
              <Input id="org-email" {...register("contactEmail")} />
              {errors.contactEmail && (
                <p className="text-xs text-destructive mt-1">{errors.contactEmail.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-phone">Contact Phone</Label>
              <Input
                id="org-phone"
                placeholder="+92 300 1234567"
                {...register("contactPhone")}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-description">Description</Label>
            <Textarea
              id="org-description"
              rows={3}
              placeholder="Tell us about your organization..."
              {...register("description")}
            />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-1.5 h-4 w-4" />
              )}
              Save Changes
            </Button>
            <Button type="button" variant="ghost" onClick={() => { setEditing(false); reset(); }}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
