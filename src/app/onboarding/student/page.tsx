"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { studentOnboardingSchema, type StudentOnboardingInput } from "@/lib/validators/auth";
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
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { ModeToggle } from "@/components/shared/mode-toggle";

const SKILL_OPTIONS = [
  "JavaScript", "TypeScript", "Python", "React", "Next.js", "Node.js",
  "Flutter", "React Native", "Machine Learning", "AI/LLMs", "Data Science",
  "Blockchain", "Cloud/DevOps", "UI/UX Design", "Mobile Dev", "Game Dev",
  "Cybersecurity", "IoT", "AR/VR", "Backend",
];

export default function StudentOnboardingPage() {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded || !user) return;
    const meta = user.publicMetadata as { role?: string; onboardingComplete?: boolean };
    if (meta.role && meta.onboardingComplete) {
      window.location.href = `/${meta.role}/dashboard`;
    } else if (meta.role && meta.role !== "student") {
      window.location.href = `/onboarding/${meta.role}`;
    }
  }, [isLoaded, user]);

  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<StudentOnboardingInput>({
    resolver: zodResolver(studentOnboardingSchema),
    defaultValues: {
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
      skills: [],
    },
  });

  // Pre-fill name from Google account
  useEffect(() => {
    if (user?.firstName) setValue("firstName", user.firstName);
    if (user?.lastName) setValue("lastName", user.lastName);
  }, [user, setValue]);

  const toggleSkill = (skill: string) => {
    const updated = selectedSkills.includes(skill)
      ? selectedSkills.filter((s) => s !== skill)
      : [...selectedSkills, skill];
    setSelectedSkills(updated);
    setValue("skills", updated, { shouldValidate: true });
  };

  const onSubmit = async (data: StudentOnboardingInput) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/onboarding/student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to save profile");
      toast.success("Profile complete! Welcome to Competition Spark.");
      window.location.href = "/student/dashboard";
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
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Complete Your Profile</h1>
            <p className="mt-1 text-sm text-muted-foreground">Tell us about yourself to get matched with the best competitions</p>
          </div>
        </div>

        {/* Form */}
        <div className="rounded-2xl border border-border/60 bg-card/50 p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Name row */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" placeholder="e.g. Ahmed" {...register("firstName")} />
                {errors.firstName && <p className="text-xs text-destructive mt-1">{errors.firstName.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" placeholder="e.g. Khan" {...register("lastName")} />
                {errors.lastName && <p className="text-xs text-destructive mt-1">{errors.lastName.message}</p>}
              </div>
            </div>

            {/* University + Year */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="university">University</Label>
                <Input id="university" placeholder="e.g. LUMS, NUST, FAST" {...register("university")} />
                {errors.university && <p className="text-xs text-destructive mt-1">{errors.university.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="yearOfStudy">Year of Study</Label>
                <Select onValueChange={(val: string | null) => val && setValue("yearOfStudy", val)}>
                  <SelectTrigger className="rounded-xl h-10">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1st Year">1st Year</SelectItem>
                    <SelectItem value="2nd Year">2nd Year</SelectItem>
                    <SelectItem value="3rd Year">3rd Year</SelectItem>
                    <SelectItem value="4th Year">4th Year</SelectItem>
                    <SelectItem value="5th Year+">5th Year+</SelectItem>
                    <SelectItem value="Masters">Masters</SelectItem>
                    <SelectItem value="PhD">PhD</SelectItem>
                    <SelectItem value="Graduate">Graduate</SelectItem>
                  </SelectContent>
                </Select>
                {errors.yearOfStudy && <p className="text-xs text-destructive mt-1">{errors.yearOfStudy.message}</p>}
              </div>
            </div>

            {/* WhatsApp */}
            <div className="space-y-1.5">
              <Label htmlFor="whatsapp">WhatsApp Number</Label>
              <Input id="whatsapp" placeholder="+92 300 1234567" {...register("whatsapp")} />
              {errors.whatsapp && <p className="text-xs text-destructive mt-1">{errors.whatsapp.message}</p>}
            </div>

            {/* Skills */}
            <div className="space-y-2">
              <Label>Skills <span className="text-muted-foreground/60 font-normal">(select at least one)</span></Label>
              <div className="flex flex-wrap gap-1.5">
                {SKILL_OPTIONS.map((skill) => (
                  <Badge
                    key={skill}
                    variant={selectedSkills.includes(skill) ? "default" : "outline"}
                    className="cursor-pointer text-[11px] transition-all hover:scale-[1.02]"
                    onClick={() => toggleSkill(skill)}
                  >
                    {skill}
                    {selectedSkills.includes(skill) && <X className="ml-1 h-2.5 w-2.5" />}
                  </Badge>
                ))}
              </div>
              {errors.skills && <p className="text-xs text-destructive mt-1">{errors.skills.message}</p>}
            </div>

            {/* Bio */}
            <div className="space-y-1.5">
              <Label htmlFor="bio">Bio <span className="text-muted-foreground/60 font-normal">(optional)</span></Label>
              <Textarea id="bio" placeholder="A few words about yourself..." rows={3} {...register("bio")} />
            </div>

            {/* GitHub + LinkedIn */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="githubUrl">GitHub <span className="text-muted-foreground/60 font-normal">(optional)</span></Label>
                <Input id="githubUrl" placeholder="github.com/username" {...register("githubUrl")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="linkedinUrl">LinkedIn <span className="text-muted-foreground/60 font-normal">(optional)</span></Label>
                <Input id="linkedinUrl" placeholder="linkedin.com/in/username" {...register("linkedinUrl")} />
              </div>
            </div>

            <Button type="submit" className="w-full h-10 rounded-xl mt-2" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Complete Profile
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
