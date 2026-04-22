"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCompetitionForm } from "@/hooks/use-competition-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  CheckCircle,
  Lightbulb,
  FileText,
  Users,
  Calendar,
  Trophy,
  Scale,
  Image,
  Send,
  Loader2,
  AlertCircle,
  ShieldCheck,
  ShieldX,
  Building2,
  Upload,
  Target,
  GripVertical,
  Globe,
  Lock,
} from "lucide-react";
import { targetParticipantOptions } from "@/lib/validators/competition";

function SectionHeader({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 pb-2">
      <Icon className="size-4 text-primary" />
      <h3 className="text-sm font-semibold">{title}</h3>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="col-span-2 text-sm">{value || <span className="text-muted-foreground/50">Not set</span>}</span>
    </div>
  );
}

export function StepReview() {
  const { formData, reset } = useCompetitionForm();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleString("en-PK", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return dateStr;
    }
  };

  const totalPrizePool = formData.prizes.reduce(
    (sum, p) => sum + (p.amount || 0),
    0
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Strip empty custom submission fields (user added rows but left labels blank)
      const cleanedCustomFields = (formData.customSubmissionFields ?? []).filter(
        (f) => f.label.trim()
      );

      const payload = {
        ...formData,
        customSubmissionFields: cleanedCustomFields,
        totalPrizePool,
      };

      const url = editId ? `/api/competitions/${editId}` : "/api/competitions";
      const method = editId ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        // Show field-level validation errors if available
        if (data.issues && Array.isArray(data.issues)) {
          const fieldErrors = data.issues
            .map((issue: { path?: (string | number)[]; message?: string }) =>
              `${issue.path?.join(".") || "unknown"}: ${issue.message || "invalid"}`
            )
            .join("\n");
          throw new Error(`Validation failed:\n${fieldErrors}`);
        }
        throw new Error(data.error || `Request failed with status ${response.status}`);
      }

      setSubmitSuccess(true);
      if (!editId) reset();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <CheckCircle className="size-16 text-primary" />
          <h2 className="mt-4 text-xl font-semibold">
            {editId ? "Competition Updated!" : "Competition Sent for Review!"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground text-center max-w-md">
            {editId
              ? "Your changes have been saved successfully."
              : "Your competition has been submitted for review. An admin will review and approve it before it goes live. You will be notified once it is approved."}
          </p>
          <Button
            className="mt-6"
            onClick={() => router.push("/organizer/competitions")}
          >
            Go to Hackathon Management
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="size-5 text-primary" />
            Review Your Competition
          </CardTitle>
          <CardDescription>
            Review all details before submitting. You can go back to any step to
            make changes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Info */}
          <div>
            <SectionHeader icon={Lightbulb} title="Basic Information" />
            <div className="rounded-lg border p-3 space-y-0.5">
              <Field label="Title" value={formData.title} />
              <Field label="Tagline" value={formData.tagline} />
              <Field
                label="Description"
                value={
                  formData.description
                    ? formData.description.length > 150
                      ? formData.description.slice(0, 150) + "..."
                      : formData.description
                    : null
                }
              />
              <Field label="Category" value={formData.category} />
              <Field
                label="Tags"
                value={
                  formData.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {formData.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  ) : null
                }
              />
            </div>
          </div>

          <Separator />

          {/* Challenge Details */}
          <div>
            <SectionHeader icon={FileText} title="Challenge Details" />
            <div className="rounded-lg border p-3 space-y-0.5">
              <Field
                label="Challenge"
                value={
                  formData.challengeStatement
                    ? formData.challengeStatement.length > 150
                      ? formData.challengeStatement.slice(0, 150) + "..."
                      : formData.challengeStatement
                    : null
                }
              />
              <Field
                label="Requirements"
                value={
                  formData.requirements
                    ? formData.requirements.length > 150
                      ? formData.requirements.slice(0, 150) + "..."
                      : formData.requirements
                    : null
                }
              />
              <Field
                label="Resources"
                value={
                  formData.resources.length > 0
                    ? `${formData.resources.length} resource(s) added`
                    : null
                }
              />
            </div>
          </div>

          <Separator />

          {/* Participation */}
          <div>
            <SectionHeader icon={Users} title="Participation Rules" />
            <div className="rounded-lg border p-3 space-y-0.5">
              <Field
                label="Team Size"
                value={`${formData.minTeamSize} - ${formData.maxTeamSize} members`}
              />
              <Field
                label="Max Participants"
                value={formData.maxParticipants ?? "Unlimited"}
              />
              <Field
                label="Solo Participation"
                value={formData.allowSoloParticipation ? "Allowed" : "Not allowed"}
              />
              <Field
                label="Eligibility"
                value={
                  formData.eligibilityCriteria
                    ? formData.eligibilityCriteria.length > 100
                      ? formData.eligibilityCriteria.slice(0, 100) + "..."
                      : formData.eligibilityCriteria
                    : null
                }
              />
              <Field
                label="Target Audience"
                value={
                  formData.targetParticipants && formData.targetParticipants.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {formData.targetParticipants.map((tp) => (
                        <Badge key={tp} variant="secondary" className="text-xs">
                          {tp.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                        </Badge>
                      ))}
                    </div>
                  ) : null
                }
              />
            </div>
          </div>

          {/* Timeline section removed for organizer flow */}

          {/* Prizes */}
          <div>
            <SectionHeader icon={Trophy} title="Prizes" />
            <div className="rounded-lg border p-3 space-y-2">
              <Field label="Total Pool" value={formatCurrency(totalPrizePool)} />
              {formData.prizes.map((prize, i) => (
                <Field
                  key={i}
                  label={`#${prize.position}`}
                  value={`${prize.title} - ${formatCurrency(prize.amount)} ${prize.currency}`}
                />
              ))}
              {formData.prizes.length === 0 && (
                <Field label="Prizes" value={null} />
              )}
              <Field
                label="Confirmed"
                value={
                  formData.prizeConfirmed ? (
                    <span className="inline-flex items-center gap-1 text-emerald-500 font-medium">
                      <ShieldCheck className="size-3.5" />
                      Prizes confirmed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-red-500 font-medium">
                      <ShieldX className="size-3.5" />
                      Not confirmed
                    </span>
                  )
                }
              />
            </div>
          </div>

          <Separator />

          {/* Sponsors section removed for organizer flow */}

          {/* Judging section removed for organizer flow */}

          {/* Submission Requirements */}
          <div>
            <SectionHeader icon={Upload} title="Submission Requirements" />
            <div className="rounded-lg border p-3 space-y-0.5">
              <Field
                label="GitHub Repo"
                value={formData.submissionRequirements?.githubRequired ? "Required" : "Optional"}
              />
              <Field
                label="Demo Video"
                value={formData.submissionRequirements?.videoRequired ? "Required" : "Optional"}
              />
              <Field
                label="Live Demo URL"
                value={formData.submissionRequirements?.deployedUrlRequired ? "Required" : "Optional"}
              />
              <Field
                label="Pitch Deck"
                value={formData.submissionRequirements?.pitchDeckRequired ? "Required" : "Optional"}
              />
              <Field
                label="Screenshots"
                value={
                  (formData.submissionRequirements?.maxScreenshots ?? 5) > 0
                    ? `Up to ${formData.submissionRequirements?.maxScreenshots ?? 5}`
                    : "Disabled"
                }
              />
            </div>
          </div>

          {/* Custom Submission Fields — only show fields with a label */}
          {(() => {
            const validFields = (formData.customSubmissionFields ?? []).filter(f => f.label.trim());
            if (validFields.length === 0) return null;
            return (
              <>
                <Separator />
                <div>
                  <SectionHeader icon={GripVertical} title="Custom Submission Fields" />
                  <div className="rounded-lg border p-3 space-y-0.5">
                    <Field
                      label="Count"
                      value={`${validFields.length} field${validFields.length !== 1 ? "s" : ""}`}
                    />
                    {validFields.map((f) => (
                      <Field
                        key={f.id}
                        label={f.label}
                        value={
                          <div className="flex items-center gap-1.5">
                            <Badge variant="secondary" className="text-[10px]">{f.type}</Badge>
                            {f.required && (
                              <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px]">
                                Required
                              </Badge>
                            )}
                          </div>
                        }
                      />
                    ))}
                  </div>
                </div>
              </>
            );
          })()}

          <Separator />

          {/* Visibility */}
          <div>
            <SectionHeader icon={formData.visibility === "private" ? Lock : Globe} title="Visibility" />
            <div className="rounded-lg border p-3 space-y-0.5">
              <Field
                label="Visibility"
                value={
                  formData.visibility === "private" ? (
                    <span className="inline-flex items-center gap-1">
                      <Lock className="size-3" />
                      Private
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <Globe className="size-3" />
                      Public
                    </span>
                  )
                }
              />
              {formData.visibility === "private" && formData.accessCode && (
                <Field
                  label="Access Code"
                  value={
                    <span className="font-mono font-bold text-primary">
                      {formData.accessCode}
                    </span>
                  }
                />
              )}
            </div>
          </div>

          <Separator />

          {/* Media */}
          <div>
            <SectionHeader icon={Image} title="Media" />
            <div className="rounded-lg border p-3 space-y-0.5">
              <Field
                label="Cover Image"
                value={formData.coverImageUrl ? "Provided" : null}
              />
              <Field
                label="Logo"
                value={formData.logoUrl ? "Provided" : null}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <Card>
        <CardContent className="pt-6">
          {!formData.prizeConfirmed && formData.visibility !== "private" && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-500">
              <ShieldX className="size-4 shrink-0" />
              You must confirm prize availability in the Prizes step before submitting.
            </div>
          )}

          {submitError && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <pre className="whitespace-pre-wrap font-sans">{submitError}</pre>
            </div>
          )}

          <Button
            className="w-full"
            size="lg"
            onClick={handleSubmit}
            disabled={isSubmitting || (!formData.prizeConfirmed && formData.visibility !== "private")}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {editId ? "Saving..." : "Submitting..."}
              </>
            ) : (
              <>
                <Send className="size-4" />
                {editId ? "Save Changes" : "Submit Competition for Review"}
              </>
            )}
          </Button>

          <p className="mt-3 text-center text-xs text-muted-foreground">
            Your competition will be submitted for review. An admin will review
            and approve it before it goes live.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
