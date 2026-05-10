"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useCompetitionForm } from "@/hooks/use-competition-form";
import { pktLocalToUtcIso } from "@/lib/utils/timezone";
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
  const { formData, reset, setStep } = useCompetitionForm();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [issueGroups, setIssueGroups] = useState<
    Array<{ stepIdx: number; stepLabel: string; messages: string[] }>
  >([]);
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

  // Map root field name → wizard step index + friendly step label.
  // Used to group validation errors and offer "Jump to step" buttons.
  const fieldToStep: Record<string, { idx: number; label: string }> = {
    title: { idx: 0, label: "Basic Info" },
    tagline: { idx: 0, label: "Basic Info" },
    description: { idx: 0, label: "Basic Info" },
    category: { idx: 0, label: "Basic Info" },
    tags: { idx: 0, label: "Basic Info" },
    challengeStatement: { idx: 1, label: "Challenge Details" },
    requirements: { idx: 1, label: "Challenge Details" },
    resources: { idx: 1, label: "Challenge Details" },
    minTeamSize: { idx: 2, label: "Participation Rules" },
    maxTeamSize: { idx: 2, label: "Participation Rules" },
    maxParticipants: { idx: 2, label: "Participation Rules" },
    allowSoloParticipation: { idx: 2, label: "Participation Rules" },
    eligibilityCriteria: { idx: 2, label: "Participation Rules" },
    targetParticipants: { idx: 2, label: "Participation Rules" },
    submissionRequirements: { idx: 3, label: "Submission Requirements" },
    customSubmissionFields: { idx: 3, label: "Submission Requirements" },
    registrationStart: { idx: 4, label: "Timeline" },
    registrationEnd: { idx: 4, label: "Timeline" },
    submissionStart: { idx: 4, label: "Timeline" },
    submissionEnd: { idx: 4, label: "Timeline" },
    judgingStart: { idx: 4, label: "Timeline" },
    judgingEnd: { idx: 4, label: "Timeline" },
    resultsDate: { idx: 4, label: "Timeline" },
    prizes: { idx: 5, label: "Prizes" },
    totalPrizePool: { idx: 5, label: "Prizes" },
    prizeConfirmed: { idx: 5, label: "Prizes" },
    sponsors: { idx: 6, label: "Sponsors" },
    finalistCount: { idx: 7, label: "Judging Config" },
    judgingCriteria: { idx: 7, label: "Judging Config" },
    coverImageUrl: { idx: 8, label: "Media" },
    logoUrl: { idx: 8, label: "Media" },
  };

  const friendlyFieldLabel: Record<string, string> = {
    title: "Title",
    tagline: "Tagline",
    description: "Description",
    category: "Category",
    tags: "Tags",
    challengeStatement: "Challenge statement",
    requirements: "Requirements",
    resources: "Resources",
    minTeamSize: "Min team size",
    maxTeamSize: "Max team size",
    maxParticipants: "Max participants",
    allowSoloParticipation: "Solo participation",
    eligibilityCriteria: "Eligibility criteria",
    targetParticipants: "Target participants",
    submissionRequirements: "Submission requirements",
    customSubmissionFields: "Custom submission fields",
    registrationStart: "Registration start",
    registrationEnd: "Registration end",
    submissionStart: "Submission start",
    submissionEnd: "Submission deadline",
    judgingStart: "Judging start",
    judgingEnd: "Judging end",
    resultsDate: "Results date",
    prizes: "Prizes",
    totalPrizePool: "Total prize pool",
    prizeConfirmed: "Prize confirmation",
    sponsors: "Sponsors",
    finalistCount: "Finalist count",
    judgingCriteria: "Judging criteria",
    coverImageUrl: "Cover image",
    logoUrl: "Logo",
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    setIssueGroups([]);

    try {
      // Strip empty custom submission fields (user added rows but left labels blank)
      const cleanedCustomFields = (formData.customSubmissionFields ?? []).filter(
        (f) => f.label.trim()
      );

      // Convert PKT-local datetime-local strings into UTC ISO for storage.
      // Organizers enter times as Pakistan wall-clock; the server stores UTC.
      const payload = {
        ...formData,
        customSubmissionFields: cleanedCustomFields,
        totalPrizePool,
        registrationStart: pktLocalToUtcIso(formData.registrationStart) ?? formData.registrationStart,
        registrationEnd: pktLocalToUtcIso(formData.registrationEnd) ?? formData.registrationEnd,
        submissionStart: pktLocalToUtcIso(formData.submissionStart) ?? formData.submissionStart,
        submissionEnd: pktLocalToUtcIso(formData.submissionEnd) ?? formData.submissionEnd,
        judgingStart: pktLocalToUtcIso(formData.judgingStart) ?? formData.judgingStart,
        judgingEnd: pktLocalToUtcIso(formData.judgingEnd) ?? formData.judgingEnd,
        resultsDate: pktLocalToUtcIso(formData.resultsDate) ?? formData.resultsDate,
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
        // Convert raw zod issues into grouped, jumpable errors per wizard step.
        if (data.issues && Array.isArray(data.issues)) {
          const issues = data.issues as { path?: (string | number)[]; message?: string }[];
          const grouped = new Map<number, { stepIdx: number; stepLabel: string; messages: string[] }>();
          const ungrouped: string[] = [];

          for (const issue of issues) {
            const rootField = String(issue.path?.[0] ?? "");
            const stepInfo = fieldToStep[rootField];
            const fieldLabel = friendlyFieldLabel[rootField] ?? rootField;
            const msg = `${fieldLabel}: ${issue.message || "Invalid value"}`;

            if (stepInfo) {
              const existing = grouped.get(stepInfo.idx);
              if (existing) {
                existing.messages.push(msg);
              } else {
                grouped.set(stepInfo.idx, {
                  stepIdx: stepInfo.idx,
                  stepLabel: stepInfo.label,
                  messages: [msg],
                });
              }
            } else {
              ungrouped.push(msg);
            }
          }

          const groupsArr = Array.from(grouped.values()).sort((a, b) => a.stepIdx - b.stepIdx);
          if (ungrouped.length > 0) {
            groupsArr.push({ stepIdx: -1, stepLabel: "General", messages: ungrouped });
          }

          setIssueGroups(groupsArr);
          throw new Error("Some fields need attention. Click a step below to fix.");
        }
        throw new Error(data.error || "Something went wrong. Please review your details and try again.");
      }

      toast.success(
        editId
          ? "Changes saved!"
          : "Competition sent for review! An admin will approve it shortly."
      );
      setSubmitSuccess(true);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return <SuccessCard editId={editId} reset={reset} router={router} />;
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

          {submitError && issueGroups.length === 0 && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <pre className="whitespace-pre-wrap font-sans">{submitError}</pre>
            </div>
          )}

          {issueGroups.length > 0 && (
            <div className="mb-4 space-y-3 rounded-lg border border-destructive/50 bg-destructive/5 p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="size-5 shrink-0 mt-0.5 text-destructive" />
                <div>
                  <p className="text-sm font-semibold text-destructive">
                    Some fields need attention
                  </p>
                  <p className="mt-0.5 text-xs text-destructive/80">
                    Click a step to jump there and fix the issue.
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {issueGroups.map((g) => (
                  <div
                    key={g.stepIdx}
                    className="rounded-md border border-destructive/30 bg-background/50 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{g.stepLabel}</p>
                      {g.stepIdx >= 0 && (
                        <button
                          type="button"
                          onClick={() => setStep(g.stepIdx)}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          Fix in {g.stepLabel} →
                        </button>
                      )}
                    </div>
                    <ul className="mt-1.5 space-y-0.5">
                      {g.messages.map((m, i) => (
                        <li key={i} className="text-xs text-muted-foreground">
                          • {m}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
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

function SuccessCard({
  editId,
  reset,
  router,
}: {
  editId: string | null;
  reset: () => void;
  router: ReturnType<typeof useRouter>;
}) {
  const [secondsLeft, setSecondsLeft] = useState(3);

  useEffect(() => {
    const tick = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    const redirect = setTimeout(() => {
      reset();
      router.push("/organizer/competitions");
    }, 3000);
    return () => {
      clearInterval(tick);
      clearTimeout(redirect);
    };
  }, [reset, router]);

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
        <p className="mt-4 text-xs text-muted-foreground">
          Redirecting to Hackathon Management in {secondsLeft}s…
        </p>
        <Button
          className="mt-4"
          onClick={() => { reset(); router.push("/organizer/competitions"); }}
        >
          Go to Hackathon Management Now
        </Button>
      </CardContent>
    </Card>
  );
}
