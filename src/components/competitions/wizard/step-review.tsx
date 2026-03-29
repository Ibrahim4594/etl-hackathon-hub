"use client";

import { useState } from "react";
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
      const payload = {
        ...formData,
        totalPrizePool,
      };

      const response = await fetch("/api/competitions", {
        method: "POST",
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
      reset();
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
          <h2 className="mt-4 text-xl font-semibold">Competition Created!</h2>
          <p className="mt-2 text-sm text-muted-foreground text-center max-w-md">
            Your competition has been submitted for review. You will be notified
            once it is approved and published.
          </p>
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

          <Separator />

          {/* Timeline */}
          <div>
            <SectionHeader icon={Calendar} title="Timeline" />
            <div className="rounded-lg border p-3 space-y-0.5">
              <Field label="Registration" value={
                formData.registrationStart && formData.registrationEnd
                  ? `${formatDate(formData.registrationStart)} - ${formatDate(formData.registrationEnd)}`
                  : null
              } />
              <Field label="Submission" value={
                formData.submissionStart && formData.submissionEnd
                  ? `${formatDate(formData.submissionStart)} - ${formatDate(formData.submissionEnd)}`
                  : null
              } />
              <Field label="Judging" value={
                formData.judgingStart && formData.judgingEnd
                  ? `${formatDate(formData.judgingStart)} - ${formatDate(formData.judgingEnd)}`
                  : null
              } />
              <Field label="Results" value={formatDate(formData.resultsDate)} />
            </div>
          </div>

          <Separator />

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

          {/* Sponsors */}
          <div>
            <SectionHeader icon={Building2} title="Sponsors" />
            <div className="rounded-lg border p-3 space-y-0.5">
              <Field
                label="Count"
                value={
                  formData.sponsors.length > 0
                    ? `${formData.sponsors.length} sponsor(s) added`
                    : "No additional sponsors"
                }
              />
              {formData.sponsors.map((s, i) => (
                <Field
                  key={i}
                  label={s.companyName || `Sponsor ${i + 1}`}
                  value={
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="secondary" className="text-[10px]">
                        {s.sponsorTier.charAt(0).toUpperCase() + s.sponsorTier.slice(1)}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {s.contributionType.replace(/_/g, " ")}
                      </Badge>
                      {s.contributionAmount ? (
                        <span className="text-xs font-medium text-primary">
                          {formatCurrency(s.contributionAmount)}
                        </span>
                      ) : null}
                    </div>
                  }
                />
              ))}
            </div>
          </div>

          <Separator />

          {/* Judging */}
          <div>
            <SectionHeader icon={Scale} title="Judging Configuration" />
            <div className="rounded-lg border p-3 space-y-0.5">
              <Field
                label="AI Weight"
                value={`${formData.aiJudgingWeight}%`}
              />
              <Field
                label="Human Weight"
                value={`${formData.humanJudgingWeight}%`}
              />
              <Field label="Finalists" value={formData.finalistCount} />
              <Field
                label="Criteria"
                value={
                  formData.judgingCriteria.length > 0
                    ? formData.judgingCriteria.map((c) => c.name || "Unnamed").join(", ")
                    : null
                }
              />
            </div>
          </div>

          <Separator />

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

          {/* Custom Submission Fields */}
          {formData.customSubmissionFields && formData.customSubmissionFields.length > 0 && (
            <>
              <Separator />
              <div>
                <SectionHeader icon={GripVertical} title="Custom Submission Fields" />
                <div className="rounded-lg border p-3 space-y-0.5">
                  <Field
                    label="Count"
                    value={`${formData.customSubmissionFields.length} field(s)`}
                  />
                  {formData.customSubmissionFields.map((f, i) => (
                    <Field
                      key={f.id}
                      label={f.label || `Field ${i + 1}`}
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
          )}

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
                Submitting...
              </>
            ) : (
              <>
                <Send className="size-4" />
                Submit Competition for Review
              </>
            )}
          </Button>

          <p className="mt-3 text-center text-xs text-muted-foreground">
            Your competition will be submitted as a draft and reviewed by an admin
            before going live.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
