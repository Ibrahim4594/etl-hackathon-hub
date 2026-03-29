"use client";

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

export default function NewCompetitionPage() {
  const { currentStep } = useCompetitionForm();
  const currentStepKey = WIZARD_STEPS[currentStep];
  const StepComponent = STEP_COMPONENTS[currentStepKey];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Create Competition"
        description="Set up a new hackathon or competition in a few steps"
      />

      <WizardShell>
        <StepComponent />
      </WizardShell>
    </div>
  );
}
