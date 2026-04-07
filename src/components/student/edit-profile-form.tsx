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
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  Save,
  X,
  Pencil,
  Github,
  Linkedin,
  User,
  Code,
  Link2,
} from "lucide-react";
import { toast } from "sonner";

const SKILL_OPTIONS = [
  "JavaScript", "TypeScript", "Python", "React", "Next.js", "Node.js",
  "Flutter", "React Native", "Machine Learning", "AI/LLMs", "Data Science",
  "Blockchain", "Cloud/DevOps", "UI/UX Design", "Mobile Dev", "Game Dev",
  "Cybersecurity", "IoT", "AR/VR", "Backend",
];

const BIO_MAX = 300;

const profileSchema = z.object({
  university: z.string().optional(),
  whatsapp: z.string().optional(),
  bio: z.string().max(BIO_MAX, `Bio must be ${BIO_MAX} characters or less`),
  githubUrl: z.union([
    z.literal(""),
    z.string().url("Enter a valid URL (https://...)"),
  ]),
  linkedinUrl: z.union([
    z.literal(""),
    z.string().url("Enter a valid URL (https://...)"),
  ]),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface EditProfileFormProps {
  user: {
    bio: string | null;
    skills: string[] | null;
    githubUrl: string | null;
    linkedinUrl: string | null;
    whatsapp: string | null;
    university: string | null;
  };
}

export function EditProfileForm({ user }: EditProfileFormProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [skills, setSkills] = useState<string[]>(user.skills ?? []);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      university: user.university ?? "",
      whatsapp: user.whatsapp ?? "",
      bio: user.bio ?? "",
      githubUrl: user.githubUrl ?? "",
      linkedinUrl: user.linkedinUrl ?? "",
    },
  });

  const bioValue = watch("bio") ?? "";

  function toggleSkill(skill: string) {
    setSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  }

  function handleCancel() {
    reset({
      university: user.university ?? "",
      whatsapp: user.whatsapp ?? "",
      bio: user.bio ?? "",
      githubUrl: user.githubUrl ?? "",
      linkedinUrl: user.linkedinUrl ?? "",
    });
    setSkills(user.skills ?? []);
    setEditing(false);
  }

  const onSubmit = async (values: ProfileFormValues) => {
    setSaving(true);
    try {
      const res = await fetch("/api/student/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bio: values.bio || null,
          skills,
          githubUrl: values.githubUrl || null,
          linkedinUrl: values.linkedinUrl || null,
          whatsapp: values.whatsapp || null,
          university: values.university || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update profile");
      }

      toast.success("Profile updated!");
      setEditing(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 rounded-full px-5 shrink-0"
        onClick={() => setEditing(true)}
      >
        <Pencil className="h-3.5 w-3.5" />
        Edit Profile
      </Button>
    );
  }

  return (
    <Card className="rounded-2xl border border-border/50 shadow-lg col-span-full">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10">
            <Pencil className="h-4 w-4 text-primary" />
          </div>
          Edit Profile
        </CardTitle>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="rounded-full"
          onClick={handleCancel}
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* ── Personal Info ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <User className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium uppercase tracking-wide">
                Personal Info
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label
                  htmlFor="university"
                  className="text-xs font-medium uppercase tracking-wide"
                >
                  University
                </Label>
                <Input
                  id="university"
                  placeholder="e.g. LUMS, NUST, FAST"
                  className="rounded-xl border-border/50 bg-background px-4 py-3 focus:ring-2 focus:ring-primary/30 transition-all"
                  {...register("university")}
                />
                {errors.university && (
                  <p className="text-xs text-destructive mt-1">{errors.university.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="whatsapp"
                  className="text-xs font-medium uppercase tracking-wide"
                >
                  WhatsApp Number
                </Label>
                <Input
                  id="whatsapp"
                  placeholder="+92 300 1234567"
                  className="rounded-xl border-border/50 bg-background px-4 py-3 focus:ring-2 focus:ring-primary/30 transition-all"
                  {...register("whatsapp")}
                />
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <Label
                htmlFor="bio"
                className="text-xs font-medium uppercase tracking-wide"
              >
                Bio
              </Label>
              <div className="relative">
                <Textarea
                  id="bio"
                  placeholder="Tell us about yourself, your interests, and what you're building..."
                  rows={4}
                  className="rounded-xl border-border/50 bg-background px-4 py-3 focus:ring-2 focus:ring-primary/30 transition-all resize-none"
                  maxLength={BIO_MAX}
                  {...register("bio")}
                />
                <span className="absolute bottom-2.5 right-3 text-xs text-muted-foreground/50">
                  {bioValue.length}/{BIO_MAX}
                </span>
              </div>
              {errors.bio && (
                <p className="text-xs text-destructive mt-1">{errors.bio.message}</p>
              )}
            </div>
          </div>

          <Separator className="bg-border/30" />

          {/* ── Skills ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Code className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium uppercase tracking-wide">
                Skills & Expertise
              </span>
              <span className="text-xs text-muted-foreground ml-auto">
                {skills.length} selected
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {SKILL_OPTIONS.map((skill) => {
                const selected = skills.includes(skill);
                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    className={`inline-flex items-center rounded-full px-4 py-1.5 text-xs font-medium transition-all cursor-pointer hover:scale-[1.02] ${
                      selected
                        ? "bg-primary/15 border border-primary/30 text-primary"
                        : "bg-muted/50 border border-border/50 text-muted-foreground hover:border-primary/30 hover:bg-primary/5"
                    }`}
                  >
                    {skill}
                    {selected && <X className="ml-1.5 h-3 w-3" />}
                  </button>
                );
              })}
            </div>
          </div>

          <Separator className="bg-border/30" />

          {/* ── Social Links ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Link2 className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium uppercase tracking-wide">
                Social Links
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label
                  htmlFor="githubUrl"
                  className="text-xs font-medium uppercase tracking-wide"
                >
                  GitHub URL
                </Label>
                <div className="relative">
                  <Github className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="githubUrl"
                    placeholder="https://github.com/..."
                    className="rounded-xl border-border/50 bg-background pl-10 pr-4 py-3 focus:ring-2 focus:ring-primary/30 transition-all"
                    {...register("githubUrl")}
                  />
                </div>
                {errors.githubUrl && (
                  <p className="text-xs text-destructive mt-1">{errors.githubUrl.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="linkedinUrl"
                  className="text-xs font-medium uppercase tracking-wide"
                >
                  LinkedIn URL
                </Label>
                <div className="relative">
                  <Linkedin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="linkedinUrl"
                    placeholder="https://linkedin.com/in/..."
                    className="rounded-xl border-border/50 bg-background pl-10 pr-4 py-3 focus:ring-2 focus:ring-primary/30 transition-all"
                    {...register("linkedinUrl")}
                  />
                </div>
                {errors.linkedinUrl && (
                  <p className="text-xs text-destructive mt-1">{errors.linkedinUrl.message}</p>
                )}
              </div>
            </div>
          </div>

          <Separator className="bg-border/30" />

          {/* ── Actions ── */}
          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              disabled={saving}
              className="gap-1.5 rounded-full px-8 py-3 font-bold btn-interact shadow-lg"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Changes
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={handleCancel}
              disabled={saving}
              className="rounded-full px-6"
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
