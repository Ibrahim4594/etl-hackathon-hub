"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  submissionCreateSchema,
  type SubmissionCreateInput,
} from "@/lib/validators/submission";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  X,
  Github,
  Video,
  Globe,
  FileText,
  ImagePlus,
  Plus,
  Trash2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

interface CustomSubmissionField {
  id: string;
  label: string;
  type: "text" | "url" | "textarea" | "select" | "number";
  required: boolean;
  placeholder?: string;
  options?: string[];
}

const TECH_OPTIONS = [
  "JavaScript",
  "TypeScript",
  "Python",
  "React",
  "Next.js",
  "Node.js",
  "Express",
  "FastAPI",
  "Django",
  "Flutter",
  "React Native",
  "Swift",
  "Kotlin",
  "Machine Learning",
  "AI/LLMs",
  "TensorFlow",
  "PyTorch",
  "OpenAI API",
  "LangChain",
  "Data Science",
  "Blockchain",
  "Solidity",
  "AWS",
  "GCP",
  "Azure",
  "Docker",
  "Kubernetes",
  "PostgreSQL",
  "MongoDB",
  "Redis",
  "Firebase",
  "Supabase",
  "GraphQL",
  "REST API",
  "WebSockets",
  "Tailwind CSS",
  "Three.js",
  "Unity",
  "Figma",
  "IoT",
  "AR/VR",
];

interface SubmissionFormProps {
  competitionId: string;
  teamId: string;
}

interface SubmissionRequirements {
  githubRequired: boolean;
  videoRequired: boolean;
  deployedUrlRequired: boolean;
  pitchDeckRequired: boolean;
  maxScreenshots: number;
}

const DEFAULT_REQUIREMENTS: SubmissionRequirements = {
  githubRequired: true,
  videoRequired: true,
  deployedUrlRequired: false,
  pitchDeckRequired: false,
  maxScreenshots: 5,
};

// Deadline banner severity
type DeadlineStatus = "passed" | "urgent" | "warning" | "ok";

// URL validation status
type UrlValidation = "idle" | "checking" | "valid" | "invalid" | "warning";

const VALID_VIDEO_HOSTS = [
  "youtube.com",
  "youtu.be",
  "loom.com",
  "drive.google.com",
  "vimeo.com",
];

function getDeadlineStatus(submissionEnd: string | null): { status: DeadlineStatus; hoursLeft: number } {
  if (!submissionEnd) return { status: "ok", hoursLeft: Infinity };
  const end = new Date(submissionEnd);
  const now = new Date();
  const msLeft = end.getTime() - now.getTime();
  const hoursLeft = msLeft / (1000 * 60 * 60);

  if (msLeft <= 0) return { status: "passed", hoursLeft: 0 };
  if (hoursLeft <= 1) return { status: "urgent", hoursLeft };
  if (hoursLeft <= 24) return { status: "warning", hoursLeft };
  return { status: "ok", hoursLeft };
}

function formatDeadline(date: string): string {
  return new Date(date).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SubmissionForm({ competitionId, teamId }: SubmissionFormProps) {
  const router = useRouter();
  const [selectedTech, setSelectedTech] = useState<string[]>([]);
  const [screenshotUrls, setScreenshotUrls] = useState<string[]>([""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customFields, setCustomFields] = useState<CustomSubmissionField[]>([]);
  const [customResponses, setCustomResponses] = useState<Record<string, string | number>>({});
  const [requirements, setRequirements] = useState<SubmissionRequirements>(DEFAULT_REQUIREMENTS);

  // Feature 1: Deadline tracking
  const [submissionEnd, setSubmissionEnd] = useState<string | null>(null);
  const [deadlineStatus, setDeadlineStatus] = useState<DeadlineStatus>("ok");
  const [hoursLeft, setHoursLeft] = useState<number>(Infinity);
  const [countdownText, setCountdownText] = useState("");

  // Feature 5: URL validation
  const [githubValidation, setGithubValidation] = useState<UrlValidation>("idle");
  const [githubMessage, setGithubMessage] = useState("");
  const [videoValidation, setVideoValidation] = useState<UrlValidation>("idle");
  const [videoMessage, setVideoMessage] = useState("");
  const githubTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function fetchCompetitionConfig() {
      try {
        const res = await fetch(`/api/competitions/${competitionId}/custom-fields`);
        if (res.ok) {
          const data = await res.json();
          setCustomFields(data.fields ?? []);
          if (data.requirements) {
            setRequirements(data.requirements);
          }
          if (data.submissionEnd) {
            setSubmissionEnd(data.submissionEnd);
          }
        }
      } catch {
        // Fail silently
      }
    }
    fetchCompetitionConfig();
  }, [competitionId]);

  // Feature 1: Update deadline status every second for urgent countdown
  useEffect(() => {
    if (!submissionEnd) return;

    function tick() {
      const { status, hoursLeft: h } = getDeadlineStatus(submissionEnd);
      setDeadlineStatus(status);
      setHoursLeft(h);

      if (status === "urgent") {
        const end = new Date(submissionEnd!);
        const msLeft = end.getTime() - Date.now();
        if (msLeft <= 0) {
          setCountdownText("0:00");
        } else {
          const mins = Math.floor(msLeft / 60000);
          const secs = Math.floor((msLeft % 60000) / 1000);
          setCountdownText(`${mins}:${secs.toString().padStart(2, "0")}`);
        }
      }
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [submissionEnd]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(submissionCreateSchema),
    defaultValues: {
      competitionId,
      teamId,
      techStack: [],
      screenshots: [],
    },
  });

  // Feature 5: Watch URL fields for validation
  const githubUrlValue = watch("githubUrl") as string | undefined;
  const videoUrlValue = watch("videoUrl") as string | undefined;

  // Debounced GitHub URL validation
  const validateGithubUrl = useCallback((url: string) => {
    if (githubTimerRef.current) clearTimeout(githubTimerRef.current);

    if (!url || !url.trim()) {
      setGithubValidation("idle");
      setGithubMessage("");
      return;
    }

    setGithubValidation("checking");
    setGithubMessage("");

    githubTimerRef.current = setTimeout(async () => {
      try {
        // Extract owner/repo from GitHub URL
        const match = url.match(/github\.com\/([^/]+)\/([^/\s?#]+)/);
        if (!match) {
          setGithubValidation("invalid");
          setGithubMessage("Not a valid GitHub repository URL");
          return;
        }
        const [, owner, repo] = match;
        const cleanRepo = repo.replace(/\.git$/, "");
        const res = await fetch(`https://api.github.com/repos/${owner}/${cleanRepo}`, {
          headers: { Accept: "application/vnd.github.v3+json" },
        });
        if (res.ok) {
          setGithubValidation("valid");
          setGithubMessage("Repository found");
        } else if (res.status === 404) {
          setGithubValidation("invalid");
          setGithubMessage("Repository not found or not public");
        } else {
          setGithubValidation("warning");
          setGithubMessage("Could not verify repository");
        }
      } catch {
        setGithubValidation("warning");
        setGithubMessage("Could not verify repository");
      }
    }, 1000);
  }, []);

  // Debounced video URL validation
  const validateVideoUrl = useCallback((url: string) => {
    if (videoTimerRef.current) clearTimeout(videoTimerRef.current);

    if (!url || !url.trim()) {
      setVideoValidation("idle");
      setVideoMessage("");
      return;
    }

    setVideoValidation("checking");
    setVideoMessage("");

    videoTimerRef.current = setTimeout(() => {
      try {
        const parsed = new URL(url);
        const isHttps = parsed.protocol === "https:" || parsed.protocol === "http:";
        const isValidHost = VALID_VIDEO_HOSTS.some((host) => parsed.hostname.includes(host));

        if (isHttps && isValidHost) {
          setVideoValidation("valid");
          setVideoMessage("Video link looks good");
        } else if (isHttps) {
          setVideoValidation("warning");
          setVideoMessage("Video link may not be valid. Supported: YouTube, Loom, Vimeo, Google Drive");
        } else {
          setVideoValidation("invalid");
          setVideoMessage("URL must start with http:// or https://");
        }
      } catch {
        setVideoValidation("invalid");
        setVideoMessage("Not a valid URL");
      }
    }, 1000);
  }, []);

  useEffect(() => {
    validateGithubUrl(githubUrlValue ?? "");
  }, [githubUrlValue, validateGithubUrl]);

  useEffect(() => {
    validateVideoUrl(videoUrlValue ?? "");
  }, [videoUrlValue, validateVideoUrl]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (githubTimerRef.current) clearTimeout(githubTimerRef.current);
      if (videoTimerRef.current) clearTimeout(videoTimerRef.current);
    };
  }, []);

  const toggleTech = (tech: string) => {
    const updated = selectedTech.includes(tech)
      ? selectedTech.filter((t) => t !== tech)
      : [...selectedTech, tech];
    setSelectedTech(updated);
    setValue("techStack", updated, { shouldValidate: true });
  };

  const addScreenshotField = () => {
    if (screenshotUrls.length >= 5) {
      toast.error("Maximum 5 screenshots allowed");
      return;
    }
    setScreenshotUrls([...screenshotUrls, ""]);
  };

  const removeScreenshotField = (index: number) => {
    const updated = screenshotUrls.filter((_, i) => i !== index);
    setScreenshotUrls(updated.length === 0 ? [""] : updated);
    const filtered = updated.filter((url) => url.trim() !== "");
    setValue("screenshots", filtered, { shouldValidate: true });
  };

  const updateScreenshotUrl = (index: number, value: string) => {
    const updated = [...screenshotUrls];
    updated[index] = value;
    setScreenshotUrls(updated);
    const filtered = updated.filter((url) => url.trim() !== "");
    setValue("screenshots", filtered, { shouldValidate: true });
  };

  const onSubmit = async (data: Record<string, unknown>) => {
    setIsSubmitting(true);

    try {
      const payload = {
        ...data,
        customFieldResponses: Object.keys(customResponses).length > 0 ? customResponses : undefined,
      };

      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error ?? "Failed to create submission");
        return;
      }

      toast.success("Submission created successfully!");
      router.push("/student/submissions");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDeadlinePassed = deadlineStatus === "passed";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Hidden fields */}
      <input type="hidden" {...register("competitionId")} />
      <input type="hidden" {...register("teamId")} />

      {/* Feature 1: Deadline warning banners */}
      {deadlineStatus === "passed" && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <XCircle className="h-5 w-5 shrink-0 text-destructive" />
          <p className="text-sm font-medium text-destructive">
            Submission deadline has passed. Your submission will not be accepted.
          </p>
        </div>
      )}

      {deadlineStatus === "urgent" && submissionEnd && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <Clock className="h-5 w-5 shrink-0 text-destructive" />
          <p className="text-sm font-medium text-destructive">
            Deadline in {countdownText} — submit now! Closes {formatDeadline(submissionEnd)}.
          </p>
        </div>
      )}

      {deadlineStatus === "warning" && submissionEnd && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
            Deadline is in {Math.floor(hoursLeft)} hour{Math.floor(hoursLeft) !== 1 ? "s" : ""}. Submit before {formatDeadline(submissionEnd)}.
          </p>
        </div>
      )}

      {/* Project Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Project Details</CardTitle>
          <CardDescription>
            Tell us about your project and what you built
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Project Title *</Label>
            <Input
              id="title"
              placeholder="e.g. EcoTrack - Sustainable Living App"
              {...register("title")}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe your project, the problem it solves, and how it works..."
              rows={5}
              {...register("description")}
            />
            {errors.description && (
              <p className="text-sm text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>
              Tech Stack *{" "}
              <span className="text-muted-foreground text-xs">
                (select technologies used)
              </span>
            </Label>
            <div className="flex flex-wrap gap-2">
              {TECH_OPTIONS.map((tech) => (
                <Badge
                  key={tech}
                  variant={selectedTech.includes(tech) ? "default" : "outline"}
                  className="cursor-pointer transition-colors"
                  onClick={() => toggleTech(tech)}
                >
                  {tech}
                  {selectedTech.includes(tech) && (
                    <X className="ml-1 h-3 w-3" />
                  )}
                </Badge>
              ))}
            </div>
            {errors.techStack && (
              <p className="text-sm text-destructive">
                {errors.techStack.message}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Links — respects competition's submission requirements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Project Links</CardTitle>
          <CardDescription>
            Share links to your code, demo, and presentation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* GitHub */}
          <div className="space-y-2">
            <Label htmlFor="githubUrl" className="flex items-center gap-2">
              <Github className="h-4 w-4" />
              GitHub Repository
              {requirements.githubRequired ? (
                <span className="text-[10px] font-medium text-destructive">Required</span>
              ) : (
                <span className="text-[10px] font-medium text-muted-foreground">Optional</span>
              )}
            </Label>
            <div className="relative">
              <Input
                id="githubUrl"
                placeholder="https://github.com/your-team/project"
                {...register("githubUrl")}
                className="pr-9"
              />
              {githubValidation === "checking" && (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
              {githubValidation === "valid" && (
                <CheckCircle2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600 dark:text-emerald-400" />
              )}
              {githubValidation === "invalid" && (
                <XCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-destructive" />
              )}
            </div>
            {githubValidation === "valid" && githubMessage && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400">{githubMessage}</p>
            )}
            {githubValidation === "invalid" && githubMessage && (
              <p className="text-xs text-destructive">{githubMessage}</p>
            )}
            {githubValidation === "warning" && githubMessage && (
              <p className="text-xs text-amber-600 dark:text-amber-400">{githubMessage}</p>
            )}
            {errors.githubUrl && (
              <p className="text-sm text-destructive">{errors.githubUrl.message}</p>
            )}
          </div>

          {/* Video */}
          <div className="space-y-2">
            <Label htmlFor="videoUrl" className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              Demo Video URL
              {requirements.videoRequired ? (
                <span className="text-[10px] font-medium text-destructive">Required</span>
              ) : (
                <span className="text-[10px] font-medium text-muted-foreground">Optional</span>
              )}
            </Label>
            <div className="relative">
              <Input
                id="videoUrl"
                placeholder="https://youtube.com/watch?v=... or https://loom.com/..."
                {...register("videoUrl")}
                className="pr-9"
              />
              {videoValidation === "checking" && (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
              {videoValidation === "valid" && (
                <CheckCircle2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600 dark:text-emerald-400" />
              )}
              {videoValidation === "invalid" && (
                <XCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-destructive" />
              )}
            </div>
            {videoValidation === "valid" && videoMessage && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400">{videoMessage}</p>
            )}
            {videoValidation === "invalid" && videoMessage && (
              <p className="text-xs text-destructive">{videoMessage}</p>
            )}
            {videoValidation === "warning" && videoMessage && (
              <p className="text-xs text-amber-600 dark:text-amber-400">{videoMessage}</p>
            )}
            {errors.videoUrl && (
              <p className="text-sm text-destructive">{errors.videoUrl.message}</p>
            )}
          </div>

          <Separator />

          {/* Deployed URL */}
          <div className="space-y-2">
            <Label htmlFor="deployedUrl" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Deployed URL
              {requirements.deployedUrlRequired ? (
                <span className="text-[10px] font-medium text-destructive">Required</span>
              ) : (
                <span className="text-[10px] font-medium text-muted-foreground">Optional</span>
              )}
            </Label>
            <Input
              id="deployedUrl"
              placeholder="https://your-project.vercel.app"
              {...register("deployedUrl")}
            />
            {errors.deployedUrl && (
              <p className="text-sm text-destructive">{errors.deployedUrl.message}</p>
            )}
          </div>

          {/* Pitch Deck */}
          <div className="space-y-2">
            <Label htmlFor="pitchDeckUrl" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Pitch Deck URL
              {requirements.pitchDeckRequired ? (
                <span className="text-[10px] font-medium text-destructive">Required</span>
              ) : (
                <span className="text-[10px] font-medium text-muted-foreground">Optional</span>
              )}
            </Label>
            <Input
              id="pitchDeckUrl"
              placeholder="https://docs.google.com/presentation/... or https://canva.com/..."
              {...register("pitchDeckUrl")}
            />
            {errors.pitchDeckUrl && (
              <p className="text-sm text-destructive">{errors.pitchDeckUrl.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Screenshots */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ImagePlus className="h-5 w-5" />
            Screenshots
          </CardTitle>
          <CardDescription>
            Add up to 5 screenshot URLs of your project (optional)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {screenshotUrls.map((url, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                placeholder={`Screenshot URL ${index + 1}`}
                value={url}
                onChange={(e) => updateScreenshotUrl(index, e.target.value)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => removeScreenshotField(index)}
              >
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          ))}
          {screenshotUrls.length < 5 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addScreenshotField}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add Screenshot
            </Button>
          )}
          {errors.screenshots && (
            <p className="text-sm text-destructive">
              {errors.screenshots.message}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Custom Fields */}
      {customFields.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Additional Information</CardTitle>
            <CardDescription>
              Fill in the custom fields required by the competition organizer
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {customFields.map((field) => (
              <div key={field.id} className="space-y-2">
                <Label htmlFor={`custom-${field.id}`}>
                  {field.label}{" "}
                  {field.required && <span className="text-destructive">*</span>}
                </Label>
                {field.type === "textarea" ? (
                  <Textarea
                    id={`custom-${field.id}`}
                    placeholder={field.placeholder ?? ""}
                    value={(customResponses[field.id] as string) ?? ""}
                    onChange={(e) =>
                      setCustomResponses((prev) => ({
                        ...prev,
                        [field.id]: e.target.value,
                      }))
                    }
                    rows={3}
                  />
                ) : field.type === "select" ? (
                  <Select
                    value={(customResponses[field.id] as string) ?? ""}
                    onValueChange={(val) =>
                      setCustomResponses((prev) => {
                        const next: Record<string, string | number> = { ...prev };
                        next[field.id] = val ?? "";
                        return next;
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={field.placeholder ?? "Select an option"} />
                    </SelectTrigger>
                    <SelectContent>
                      {(field.options ?? []).map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={`custom-${field.id}`}
                    type={field.type === "number" ? "number" : field.type === "url" ? "url" : "text"}
                    placeholder={field.placeholder ?? ""}
                    value={(customResponses[field.id] as string) ?? ""}
                    onChange={(e) =>
                      setCustomResponses((prev) => ({
                        ...prev,
                        [field.id]: field.type === "number" ? Number(e.target.value) : e.target.value,
                      }))
                    }
                  />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || isDeadlinePassed}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit Project
        </Button>
      </div>
    </form>
  );
}
