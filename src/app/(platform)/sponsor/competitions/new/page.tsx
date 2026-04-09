"use client";

import { useEffect } from "react";
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

  useEffect(() => {
    reset();

    if (!editId) return;

    fetch(`/api/competitions/${editId}`)
      .then((res) => res.json())
      .then(({ competition, sponsors: rawSponsors }) => {
        if (!competition) return;

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
          sponsors,
        });
      })
      .catch(() => {
        /* keep reset state on error */
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  const currentStepKey = WIZARD_STEPS[currentStep];
  const StepComponent = STEP_COMPONENTS[currentStepKey];

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
