import { create } from "zustand";
import type { CompetitionCreateInput } from "@/lib/validators/competition";
import { stepSchemas } from "@/lib/validators/competition";

export const WIZARD_STEPS = [
  "basic-info",
  "challenge-details",
  "participation-rules",
  "submission-requirements",
  "timeline",
  "prizes",
  "sponsors",
  "judging-config",
  "media",
  "review",
] as const;

export type WizardStep = (typeof WIZARD_STEPS)[number];

export const STEP_TITLES: Record<WizardStep, string> = {
  "basic-info": "Basic Info",
  "challenge-details": "Challenge Details",
  "participation-rules": "Participation",
  "submission-requirements": "Submissions",
  timeline: "Timeline",
  prizes: "Prizes",
  sponsors: "Sponsors",
  "judging-config": "Judging",
  media: "Media",
  review: "Review",
};

const initialFormData: CompetitionCreateInput = {
  title: "",
  tagline: "",
  description: "",
  category: "",
  tags: [],
  challengeStatement: "",
  requirements: "",
  resources: [],
  minTeamSize: 1,
  maxTeamSize: 4,
  maxParticipants: undefined,
  allowSoloParticipation: true,
  eligibilityCriteria: "",
  targetParticipants: ["all"],
  registrationStart: "",
  registrationEnd: "",
  submissionStart: "",
  submissionEnd: "",
  judgingStart: "",
  judgingEnd: "",
  resultsDate: "",
  prizes: [],
  totalPrizePool: 0,
  judgingCriteria: [],
  aiJudgingWeight: 0,
  humanJudgingWeight: 100,
  finalistCount: 10,
  submissionRequirements: {
    githubRequired: true,
    videoRequired: true,
    deployedUrlRequired: false,
    pitchDeckRequired: false,
    maxScreenshots: 5,
    screenshotsRequired: false,
  },
  customSubmissionFields: [],
  prizeConfirmed: false,
  visibility: "public" as const,
  accessCode: "",
  sponsors: [],
};

interface CompetitionFormState {
  currentStep: number;
  formData: CompetitionCreateInput;
  stepErrors: Record<string, string>;
  hasAttemptedNext: boolean;
  setStep: (step: number) => void;
  updateFormData: (data: Partial<CompetitionCreateInput>) => void;
  validateStep: () => boolean;
  revalidateIfAttempted: () => void;
  reset: () => void;
}

function runStepValidation(
  currentStep: number,
  formData: CompetitionCreateInput
): { ok: true } | { ok: false; errors: Record<string, string> } {
  const stepName = WIZARD_STEPS[currentStep];
  const schema = stepSchemas[stepName];
  if (!schema) return { ok: true };
  const result = schema.safeParse(formData);
  if (result.success) return { ok: true };
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.length > 0 ? String(issue.path.join(".")) : "_form";
    if (!errors[key]) errors[key] = issue.message;
  }
  return { ok: false, errors };
}

export const useCompetitionForm = create<CompetitionFormState>((set, get) => ({
  currentStep: 0,
  formData: { ...initialFormData },
  stepErrors: {},
  hasAttemptedNext: false,
  setStep: (step) =>
    set({
      currentStep: Math.max(0, Math.min(step, WIZARD_STEPS.length - 1)),
      stepErrors: {},
      hasAttemptedNext: false,
    }),
  updateFormData: (data) =>
    set((state) => {
      const newFormData = { ...state.formData, ...data };
      // Don't add new errors mid-typing — that's jarring. Only clear errors
      // for fields the user just made valid. New errors surface on blur or
      // when the user clicks Next.
      if (!state.hasAttemptedNext) {
        return { formData: newFormData };
      }
      const result = runStepValidation(state.currentStep, newFormData);
      const fieldsWithNewError = result.ok ? new Set<string>() : new Set(Object.keys(result.errors));
      const nextErrors: Record<string, string> = {};
      for (const [k, msg] of Object.entries(state.stepErrors)) {
        // Keep an existing error only if the field is still failing
        if (fieldsWithNewError.has(k)) nextErrors[k] = msg;
      }
      return {
        formData: newFormData,
        stepErrors: nextErrors,
      };
    }),
  validateStep: () => {
    const { currentStep, formData } = get();
    const result = runStepValidation(currentStep, formData);
    if (result.ok) {
      set({ stepErrors: {}, hasAttemptedNext: true });
      return true;
    }
    set({ stepErrors: result.errors, hasAttemptedNext: true });
    return false;
  },
  // Runs validation on blur, but only surfaces errors after the user's
  // first Next-click attempt. Before that, blur is silent.
  revalidateIfAttempted: () => {
    const { currentStep, formData, hasAttemptedNext } = get();
    if (!hasAttemptedNext) return;
    const result = runStepValidation(currentStep, formData);
    set({ stepErrors: result.ok ? {} : result.errors });
  },
  reset: () =>
    set({
      currentStep: 0,
      formData: { ...initialFormData },
      stepErrors: {},
      hasAttemptedNext: false,
    }),
}));
