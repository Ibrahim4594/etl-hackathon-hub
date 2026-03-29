"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Scale, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ModeToggle } from "@/components/shared/mode-toggle";

const judgeOnboardingSchema = z.object({
  expertise: z.string().min(2, "Area of expertise is required"),
  jobTitle: z.string().min(2, "Job title is required"),
  company: z.string().min(2, "Company or organization is required"),
  yearsOfExperience: z.string().min(1, "Years of experience is required"),
  bio: z.string().max(500).optional(),
  linkedinUrl: z.string().optional(),
});

type JudgeOnboardingInput = z.infer<typeof judgeOnboardingSchema>;

export default function JudgeOnboardingPage() {
  const { user, isLoaded } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoaded || !user) return;
    const meta = user.publicMetadata as { role?: string; onboardingComplete?: boolean };
    if (meta.role && meta.onboardingComplete) {
      window.location.href = `/${meta.role}/dashboard`;
    } else if (meta.role && meta.role !== "judge") {
      window.location.href = `/onboarding/${meta.role}`;
    }
  }, [isLoaded, user]);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<JudgeOnboardingInput>({
    resolver: zodResolver(judgeOnboardingSchema),
  });

  const onSubmit = async (data: JudgeOnboardingInput) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/onboarding/judge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to save profile");
      toast.success("Judge profile created! Welcome to Competition Spark.");
      window.location.href = "/judge/dashboard";
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
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Set Up Your Judge Profile</h1>
            <p className="mt-1 text-sm text-muted-foreground">Tell us about your expertise to start evaluating submissions</p>
          </div>
        </div>

        {/* Form */}
        <div className="rounded-2xl border border-border/60 bg-card/50 p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="jobTitle">Job Title</Label>
              <Input id="jobTitle" placeholder="e.g. Senior Software Engineer" {...register("jobTitle")} />
              {errors.jobTitle && <p className="text-xs text-destructive mt-1">{errors.jobTitle.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="company">Company / Organization</Label>
              <Input id="company" placeholder="e.g. TechCorp Pakistan" {...register("company")} />
              {errors.company && <p className="text-xs text-destructive mt-1">{errors.company.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="expertise">Area of Expertise</Label>
              <Input id="expertise" placeholder="e.g. AI/ML, Web Development, Mobile" {...register("expertise")} />
              {errors.expertise && <p className="text-xs text-destructive mt-1">{errors.expertise.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="yearsOfExperience">Years of Experience</Label>
              <Select onValueChange={(val: string | null) => val && setValue("yearsOfExperience", val)}>
                <SelectTrigger className="rounded-xl h-10">
                  <SelectValue placeholder="Select experience level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-2">1-2 years</SelectItem>
                  <SelectItem value="3-5">3-5 years</SelectItem>
                  <SelectItem value="5-10">5-10 years</SelectItem>
                  <SelectItem value="10+">10+ years</SelectItem>
                </SelectContent>
              </Select>
              {errors.yearsOfExperience && <p className="text-xs text-destructive mt-1">{errors.yearsOfExperience.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bio">Short Bio <span className="text-muted-foreground/60 font-normal">(optional)</span></Label>
              <Textarea id="bio" placeholder="A few words about your background..." rows={3} {...register("bio")} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="linkedinUrl">LinkedIn <span className="text-muted-foreground/60 font-normal">(optional)</span></Label>
              <Input id="linkedinUrl" placeholder="linkedin.com/in/yourprofile" {...register("linkedinUrl")} />
            </div>

            <Button type="submit" className="w-full h-10 rounded-xl mt-2" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Complete Judge Profile
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
