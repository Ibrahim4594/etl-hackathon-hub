"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { sponsorOnboardingSchema, type SponsorOnboardingInput } from "@/lib/validators/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ModeToggle } from "@/components/shared/mode-toggle";

export default function SponsorOnboardingPage() {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded || !user) return;
    const meta = user.publicMetadata as { role?: string; onboardingComplete?: boolean };
    if (meta.role && meta.onboardingComplete) {
      window.location.href = `/${meta.role}/dashboard`;
    } else if (meta.role && meta.role !== "sponsor") {
      window.location.href = `/onboarding/${meta.role}`;
    }
  }, [isLoaded, user]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SponsorOnboardingInput>({
    resolver: zodResolver(sponsorOnboardingSchema),
  });

  const onSubmit = async (data: SponsorOnboardingInput) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/onboarding/sponsor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to save profile");
      toast.success("Organization created! Welcome to Competition Spark.");
      window.location.href = "/sponsor/dashboard";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-6">
      <div className="absolute top-4 right-4 z-50"><ModeToggle /></div>
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Set Up Your Organization</h1>
            <p className="mt-1 text-sm text-muted-foreground">Tell us about your organization to start hosting competitions</p>
          </div>
        </div>

        {/* Form */}
        <div className="rounded-2xl border border-border/60 bg-card/50 p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="orgName">Organization Name</Label>
              <Input id="orgName" placeholder="e.g. TechCorp Pakistan" {...register("orgName")} />
              {errors.orgName && <p className="text-xs text-destructive mt-1">{errors.orgName.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="website">Website <span className="text-muted-foreground/60 font-normal">(optional)</span></Label>
              <Input id="website" placeholder="https://yourcompany.com" {...register("website")} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">About Your Organization</Label>
              <Textarea id="description" placeholder="What does your organization do?" rows={3} {...register("description")} />
              {errors.description && <p className="text-xs text-destructive mt-1">{errors.description.message}</p>}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="industry">Industry</Label>
                <Input id="industry" placeholder="e.g. FinTech, EdTech" {...register("industry")} />
                {errors.industry && <p className="text-xs text-destructive mt-1">{errors.industry.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contactPhone">Phone <span className="text-muted-foreground/60 font-normal">(optional)</span></Label>
                <Input id="contactPhone" placeholder="+92 300 1234567" {...register("contactPhone")} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contactPersonName">Contact Person</Label>
              <Input id="contactPersonName" placeholder="Full name of primary contact" {...register("contactPersonName")} />
              {errors.contactPersonName && <p className="text-xs text-destructive mt-1">{errors.contactPersonName.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input id="contactEmail" type="email" placeholder="contact@company.com" {...register("contactEmail")} />
              {errors.contactEmail && <p className="text-xs text-destructive mt-1">{errors.contactEmail.message}</p>}
            </div>

            <Button type="submit" className="w-full h-10 rounded-xl mt-2" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Organization
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
