"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, X, Pencil } from "lucide-react";
import { toast } from "sonner";

interface OrgData {
  name: string;
  website: string | null;
  description: string | null;
  industry: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactPersonName: string | null;
}

export function OrgEditForm({ org }: { org: OrgData }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: org.name,
    website: org.website ?? "",
    description: org.description ?? "",
    industry: org.industry ?? "",
    contactEmail: org.contactEmail ?? "",
    contactPhone: org.contactPhone ?? "",
    contactPersonName: org.contactPersonName ?? "",
  });

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Organization name is required");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/sponsor/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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
          <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="org-name">Organization Name</Label>
            <Input
              id="org-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-industry">Industry</Label>
            <Input
              id="org-industry"
              value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
              placeholder="e.g., Technology, Finance"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-website">Website</Label>
            <Input
              id="org-website"
              type="url"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              placeholder="https://example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-contact-person">Contact Person Name</Label>
            <Input
              id="org-contact-person"
              value={form.contactPersonName}
              onChange={(e) => setForm({ ...form, contactPersonName: e.target.value })}
              placeholder="Full name of primary contact"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-email">Contact Email</Label>
            <Input
              id="org-email"
              type="email"
              value={form.contactEmail}
              onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-phone">Contact Phone</Label>
            <Input
              id="org-phone"
              value={form.contactPhone}
              onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
              placeholder="+92 300 1234567"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="org-description">Description</Label>
          <Textarea
            id="org-description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            placeholder="Tell us about your organization..."
          />
        </div>
        <div className="flex items-center gap-2 pt-2">
          <Button onClick={handleSave} disabled={loading}>
            {loading ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-4 w-4" />
            )}
            Save Changes
          </Button>
          <Button variant="ghost" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
