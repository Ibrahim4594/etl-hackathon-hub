"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { WizardShell } from "@/components/competitions/wizard/wizard-shell";
import { StepBasicInfo } from "@/components/competitions/wizard/step-basic-info";
import { StepChallengeDetails } from "@/components/competitions/wizard/step-challenge-details";
import { StepParticipationRules } from "@/components/competitions/wizard/step-participation-rules";
import { StepTimeline } from "@/components/competitions/wizard/step-timeline";
import { StepPrizes } from "@/components/competitions/wizard/step-prizes";
import { StepSponsors } from "@/components/competitions/wizard/step-sponsors";
import { StepJudgingConfig } from "@/components/competitions/wizard/step-judging-config";
import { StepSubmissionRequirements } from "@/components/competitions/wizard/step-submission-requirements";
import { StepMedia } from "@/components/competitions/wizard/step-media";
import { StepReview } from "@/components/competitions/wizard/step-review";
import { useCompetitionForm, WIZARD_STEPS } from "@/hooks/use-competition-form";
import type { CompetitionSponsorInput } from "@/lib/validators/competition";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const STEP_COMPONENTS: Record<(typeof WIZARD_STEPS)[number], React.ComponentType> = {
  "basic-info": StepBasicInfo,
  "challenge-details": StepChallengeDetails,
  "participation-rules": StepParticipationRules,
  "submission-requirements": StepSubmissionRequirements,
  timeline: StepTimeline,
  prizes: StepPrizes,
  sponsors: StepSponsors,
  "judging-config": StepJudgingConfig,
  media: StepMedia,
  review: StepReview,
};

function toLocalISO(d: string | null | undefined): string {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "";
  const offset = dt.getTimezoneOffset();
  const local = new Date(dt.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export default function NewCompetitionPage() {
  const { currentStep, reset, updateFormData } = useCompetitionForm();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const [isLoading, setIsLoading] = useState(!!editId);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    reset();

    if (!editId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    fetch(`/api/competitions/${editId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load competition");
        return res.json();
      })
      .then(({ competition, sponsors: rawSponsors }) => {
        if (!competition) throw new Error("Competition not found");

        const sponsors: CompetitionSponsorInput[] = (rawSponsors ?? []).map(
          (s: Record<string, unknown>) => ({
            companyName: String(s.companyName ?? ""),
            logoUrl: (s.logoUrl as string | undefined) ?? "",
            website: (s.website as string | undefined) ?? "",
            contributionType:
              (s.contributionType as CompetitionSponsorInput["contributionType"]) ??
              "monetary",
            contributionTitle: (s.contributionTitle as string | undefined) ?? "",
            contributionDescription:
              (s.contributionDescription as string | undefined) ?? "",
            contributionAmount:
              (s.contributionAmount as number | undefined) ?? undefined,
            contactPersonName: (s.contactPersonName as string | undefined) ?? "",
            contactPersonEmail:
              (s.contactPersonEmail as string | undefined) ?? "",
            contactPersonPhone:
              (s.contactPersonPhone as string | undefined) ?? "",
            sponsorTier:
              (s.sponsorTier as CompetitionSponsorInput["sponsorTier"]) ??
              "partner",
            featured: Boolean(s.featured),
          })
        );

        updateFormData({
          title: String(competition.title ?? ""),
          tagline: String(competition.tagline ?? ""),
          description: String(competition.description ?? ""),
          category: String(competition.category ?? ""),
          tags: (competition.tags as string[]) ?? [],
          coverImageUrl: String(competition.coverImageUrl ?? ""),
          logoUrl: String(competition.logoUrl ?? ""),
          challengeStatement: String(competition.challengeStatement ?? ""),
          requirements: String(competition.requirements ?? ""),
          resources:
            (competition.resources as { title: string; url: string }[]) ?? [],
          minTeamSize: Number(competition.minTeamSize ?? 1),
          maxTeamSize: Number(competition.maxTeamSize ?? 4),
          maxParticipants: competition.maxParticipants
            ? Number(competition.maxParticipants)
            : undefined,
          allowSoloParticipation: Boolean(
            competition.allowSoloParticipation ?? true
          ),
          eligibilityCriteria: String(competition.eligibilityCriteria ?? ""),
          registrationStart: toLocalISO(
            competition.registrationStart as string
          ),
          registrationEnd: toLocalISO(competition.registrationEnd as string),
          submissionStart: toLocalISO(competition.submissionStart as string),
          submissionEnd: toLocalISO(competition.submissionEnd as string),
          judgingStart: toLocalISO(competition.judgingStart as string),
          judgingEnd: toLocalISO(competition.judgingEnd as string),
          resultsDate: toLocalISO(competition.resultsDate as string),
          prizes: (competition.prizes as never[]) ?? [],
          totalPrizePool: Number(competition.totalPrizePool ?? 0),
          judgingCriteria: (competition.judgingCriteria as never[]) ?? [],
          aiJudgingWeight: Number(competition.aiJudgingWeight ?? 30),
          humanJudgingWeight: Number(competition.humanJudgingWeight ?? 70),
          finalistCount: Number(competition.finalistCount ?? 10),
          submissionRequirements:
            (competition.submissionRequirements as never) ?? undefined,
          customSubmissionFields:
            (competition.customSubmissionFields as never[]) ?? [],
          visibility:
            (competition.visibility as "public" | "private") ?? "public",
          accessCode: String(competition.accessCode ?? ""),
          prizeConfirmed: Boolean(competition.prizeConfirmed ?? false),
          targetParticipants:
            (competition.targetParticipants as never[]) ?? ["all"],
          sponsors,
        });
      })
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : "Failed to load competition");
      })
      .finally(() => {
        setIsLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, retryKey]);

  const currentStepKey = WIZARD_STEPS[currentStep];
  const StepComponent = STEP_COMPONENTS[currentStepKey];

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Edit Competition"
          description="Loading competition data..."
        />
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Loader2 className="size-10 animate-spin text-primary" />
            <p className="mt-4 text-sm text-muted-foreground">Loading competition...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Edit Competition"
          description="Something went wrong"
        />
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="size-10 text-destructive" />
            <p className="mt-4 text-sm text-destructive">{loadError}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setRetryKey((k) => k + 1)}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={editId ? "Edit Competition" : "Create Competition"}
        description={
          editId
            ? "Update your competition settings"
            : "Set up a new hackathon or competition in a few steps"
        }
      />

      <WizardShell>
        <StepComponent />
      </WizardShell>
    </div>
  );
}
