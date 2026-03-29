"use client";

import { useState } from "react";
import { useCompetitionForm } from "@/hooks/use-competition-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Github,
  Video,
  Globe,
  FileText,
  ImageIcon,
  Upload,
  CheckCircle,
  MinusCircle,
  HelpCircle,
  Plus,
  Trash2,
  GripVertical,
} from "lucide-react";

type RequirementLevel = "required" | "optional" | "none";

interface RequirementItem {
  key: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const REQUIREMENTS: RequirementItem[] = [
  {
    key: "github",
    label: "GitHub Repository",
    description: "Public code repository link",
    icon: Github,
  },
  {
    key: "video",
    label: "Demo Video",
    description: "Video presentation or demo (YouTube, Loom, etc.)",
    icon: Video,
  },
  {
    key: "deployedUrl",
    label: "Live Demo / Deployed URL",
    description: "Hosted application or demo link",
    icon: Globe,
  },
  {
    key: "pitchDeck",
    label: "Pitch Deck / Presentation",
    description: "Slide deck or PDF presentation",
    icon: FileText,
  },
];

const LEVEL_CONFIG: Record<
  RequirementLevel,
  { label: string; color: string; icon: React.ComponentType<{ className?: string }> }
> = {
  required: {
    label: "Required",
    color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
    icon: CheckCircle,
  },
  optional: {
    label: "Optional",
    color: "bg-amber-500/10 text-amber-500 border-amber-500/30",
    icon: HelpCircle,
  },
  none: {
    label: "Not Needed",
    color: "bg-muted text-muted-foreground border-border/50",
    icon: MinusCircle,
  },
};

const LEVELS: RequirementLevel[] = ["required", "optional", "none"];

function getLevel(isRequired: boolean | undefined): RequirementLevel {
  if (isRequired === true) return "required";
  if (isRequired === false) return "optional";
  return "none";
}

function toBool(level: RequirementLevel): boolean | undefined {
  if (level === "required") return true;
  if (level === "optional") return false;
  return undefined;
}

export function StepSubmissionRequirements() {
  const { formData, updateFormData } = useCompetitionForm();
  const reqs = formData.submissionRequirements ?? {
    githubRequired: true,
    videoRequired: true,
    deployedUrlRequired: false,
    pitchDeckRequired: false,
    maxScreenshots: 5,
  };

  // Track "none" state separately since DB only stores boolean
  // We use a local state map for the tri-state cycle
  const [noneKeys, setNoneKeys] = useState<Set<string>>(() => {
    const set = new Set<string>();
    // Initialize: if both required=false AND we want to detect "none",
    // start everything as either required or optional based on DB value
    return set;
  });

  function getReqLevel(key: string): RequirementLevel {
    if (noneKeys.has(key)) return "none";
    const fieldMap: Record<string, boolean> = {
      github: reqs.githubRequired,
      video: reqs.videoRequired,
      deployedUrl: reqs.deployedUrlRequired,
      pitchDeck: reqs.pitchDeckRequired,
    };
    return fieldMap[key] ? "required" : "optional";
  }

  function cycleLevel(key: string) {
    const current = getReqLevel(key);
    const nextIdx = (LEVELS.indexOf(current) + 1) % LEVELS.length;
    const next = LEVELS[nextIdx];

    // Update none tracking
    const newNoneKeys = new Set(noneKeys);
    if (next === "none") {
      newNoneKeys.add(key);
    } else {
      newNoneKeys.delete(key);
    }
    setNoneKeys(newNoneKeys);

    const val = next === "required" ? true : false;

    const updated = {
      githubRequired: reqs.githubRequired,
      videoRequired: reqs.videoRequired,
      deployedUrlRequired: reqs.deployedUrlRequired,
      pitchDeckRequired: reqs.pitchDeckRequired,
      maxScreenshots: reqs.maxScreenshots,
    };

    switch (key) {
      case "github":
        updated.githubRequired = val;
        break;
      case "video":
        updated.videoRequired = val;
        break;
      case "deployedUrl":
        updated.deployedUrlRequired = val;
        break;
      case "pitchDeck":
        updated.pitchDeckRequired = val;
        break;
    }
    updateFormData({ submissionRequirements: updated });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Submission Requirements</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose what participants must submit. Click each item to cycle between
          Required, Optional, and Not Needed.
        </p>
      </div>

      {/* Requirement toggles */}
      <div className="grid gap-3 sm:grid-cols-2">
        {REQUIREMENTS.map((req) => {
          const level = getReqLevel(req.key);
          const config = LEVEL_CONFIG[level];
          const StatusIcon = config.icon;

          return (
            <button
              key={req.key}
              type="button"
              onClick={() => cycleLevel(req.key)}
              className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all hover:shadow-md cursor-pointer ${config.color}`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background/80 border border-border/50">
                <req.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{req.label}</p>
                  <div className="flex items-center gap-1 shrink-0">
                    <StatusIcon className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">{config.label}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {req.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Screenshots config */}
      <Card className="rounded-xl border border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ImageIcon className="h-4 w-4 text-primary" />
            Screenshots
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="maxScreenshots" className="text-xs uppercase tracking-wide text-muted-foreground">
                Maximum screenshots allowed
              </Label>
              <Input
                id="maxScreenshots"
                type="number"
                min={0}
                max={20}
                value={reqs.maxScreenshots}
                onChange={(e) =>
                  updateFormData({
                    submissionRequirements: {
                      githubRequired: reqs.githubRequired,
                      videoRequired: reqs.videoRequired,
                      deployedUrlRequired: reqs.deployedUrlRequired,
                      pitchDeckRequired: reqs.pitchDeckRequired,
                      maxScreenshots: Math.max(0, Math.min(20, Number(e.target.value) || 0)),
                    },
                  })
                }
                className="mt-1 w-24 rounded-lg"
              />
            </div>
            <p className="text-xs text-muted-foreground max-w-xs">
              Set to 0 to disable screenshots. Participants can upload up to this
              many images of their project.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Custom Submission Fields */}
      <Card className="rounded-xl border border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <GripVertical className="h-4 w-4 text-primary" />
            Custom Submission Fields
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Add up to 10 custom fields that participants must fill when submitting.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {(formData.customSubmissionFields ?? []).map((field, index) => (
            <div
              key={field.id}
              className="rounded-lg border border-border p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Field {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const updated = [...(formData.customSubmissionFields ?? [])];
                    updated.splice(index, 1);
                    updateFormData({ customSubmissionFields: updated });
                  }}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Label</Label>
                  <Input
                    placeholder="e.g., Project Category"
                    value={field.label}
                    onChange={(e) => {
                      const updated = [...(formData.customSubmissionFields ?? [])];
                      updated[index] = { ...updated[index], label: e.target.value };
                      updateFormData({ customSubmissionFields: updated });
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Type</Label>
                  <Select
                    value={field.type}
                    onValueChange={(val) => {
                      const updated = [...(formData.customSubmissionFields ?? [])];
                      updated[index] = {
                        ...updated[index],
                        type: val as "text" | "url" | "textarea" | "select" | "number",
                      };
                      updateFormData({ customSubmissionFields: updated });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="url">URL</SelectItem>
                      <SelectItem value="textarea">Textarea</SelectItem>
                      <SelectItem value="select">Select (Dropdown)</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Placeholder (optional)</Label>
                <Input
                  placeholder="e.g., Enter your project category..."
                  value={field.placeholder ?? ""}
                  onChange={(e) => {
                    const updated = [...(formData.customSubmissionFields ?? [])];
                    updated[index] = { ...updated[index], placeholder: e.target.value };
                    updateFormData({ customSubmissionFields: updated });
                  }}
                />
              </div>

              {field.type === "select" && (
                <div className="space-y-1">
                  <Label className="text-xs">Options (comma-separated)</Label>
                  <Input
                    placeholder="e.g., Option A, Option B, Option C"
                    value={(field.options ?? []).join(", ")}
                    onChange={(e) => {
                      const updated = [...(formData.customSubmissionFields ?? [])];
                      updated[index] = {
                        ...updated[index],
                        options: e.target.value.split(",").map((o) => o.trim()).filter(Boolean),
                      };
                      updateFormData({ customSubmissionFields: updated });
                    }}
                  />
                </div>
              )}

              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label className="text-xs cursor-pointer">Required field</Label>
                <button
                  type="button"
                  role="switch"
                  aria-checked={field.required}
                  onClick={() => {
                    const updated = [...(formData.customSubmissionFields ?? [])];
                    updated[index] = { ...updated[index], required: !updated[index].required };
                    updateFormData({ customSubmissionFields: updated });
                  }}
                  className={`
                    relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent
                    transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                    ${field.required ? "bg-primary" : "bg-muted-foreground/30"}
                  `}
                >
                  <span
                    className={`
                      pointer-events-none inline-block size-4 rounded-full bg-background shadow-lg ring-0 transition-transform
                      ${field.required ? "translate-x-4" : "translate-x-0"}
                    `}
                  />
                </button>
              </div>
            </div>
          ))}

          {(formData.customSubmissionFields ?? []).length < 10 && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                const newField = {
                  id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
                  label: "",
                  type: "text" as const,
                  required: false,
                  placeholder: "",
                  options: [],
                };
                updateFormData({
                  customSubmissionFields: [...(formData.customSubmissionFields ?? []), newField],
                });
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Field ({(formData.customSubmissionFields ?? []).length}/10)
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Preview */}
      <Card className="rounded-xl border border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-primary flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Participant Submission Form Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground mb-3">
              Participants will see these fields when submitting:
            </p>
            {/* Always shown */}
            <PreviewField label="Project Title" required />
            <PreviewField label="Description" required />
            <PreviewField label="Tech Stack" required />
            {/* Dynamic */}
            {getReqLevel("github") !== "none" && (
              <PreviewField
                label="GitHub Repository"
                required={getReqLevel("github") === "required"}
              />
            )}
            {getReqLevel("video") !== "none" && (
              <PreviewField
                label="Demo Video URL"
                required={getReqLevel("video") === "required"}
              />
            )}
            {getReqLevel("deployedUrl") !== "none" && (
              <PreviewField
                label="Live Demo URL"
                required={getReqLevel("deployedUrl") === "required"}
              />
            )}
            {getReqLevel("pitchDeck") !== "none" && (
              <PreviewField
                label="Pitch Deck URL"
                required={getReqLevel("pitchDeck") === "required"}
              />
            )}
            {reqs.maxScreenshots > 0 && (
              <PreviewField
                label={`Screenshots (max ${reqs.maxScreenshots})`}
                required={false}
              />
            )}
            {/* Custom fields preview */}
            {(formData.customSubmissionFields ?? [])
              .filter((f) => f.label)
              .map((f) => (
                <PreviewField
                  key={f.id}
                  label={`${f.label} (${f.type})`}
                  required={f.required}
                />
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PreviewField({
  label,
  required,
}: {
  label: string;
  required: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-background/60 border border-border/30 px-3 py-2">
      <span className="text-xs font-medium">{label}</span>
      <span
        className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
          required
            ? "bg-emerald-500/10 text-emerald-500"
            : "bg-amber-500/10 text-amber-500"
        }`}
      >
        {required ? "Required" : "Optional"}
      </span>
    </div>
  );
}
