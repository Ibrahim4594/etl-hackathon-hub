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
  aiJudgingWeight: 30,
  humanJudgingWeight: 70,
  finalistCount: 10,
  submissionRequirements: {
    githubRequired: true,
    videoRequired: true,
    deployedUrlRequired: false,
    pitchDeckRequired: false,
    maxScreenshots: 5,
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
  setStep: (step: number) => void;
  updateFormData: (data: Partial<CompetitionCreateInput>) => void;
  validateStep: () => boolean;
  reset: () => void;
}

export const useCompetitionForm = create<CompetitionFormState>((set, get) => ({
  currentStep: 0,
  formData: { ...initialFormData },
  stepErrors: {},
  setStep: (step) =>
    set({ currentStep: Math.max(0, Math.min(step, WIZARD_STEPS.length - 1)), stepErrors: {} }),
  updateFormData: (data) =>
    set((state) => {
      const updatedErrors = { ...state.stepErrors };
      for (const key of Object.keys(data)) {
        delete updatedErrors[key];
      }
      return {
        formData: { ...state.formData, ...data },
        stepErrors: updatedErrors,
      };
    }),
  validateStep: () => {
    const { currentStep, formData } = get();
    const stepName = WIZARD_STEPS[currentStep];
    const schema = stepSchemas[stepName];
    if (!schema) {
      set({ stepErrors: {} });
      return true;
    }
    const result = schema.safeParse(formData);
    if (result.success) {
      set({ stepErrors: {} });
      return true;
    }
    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.length > 0 ? String(issue.path.join(".")) : "_form";
      if (!errors[key]) errors[key] = issue.message;
    }
    set({ stepErrors: errors });
    return false;
  },
  reset: () => set({ currentStep: 0, formData: { ...initialFormData }, stepErrors: {} }),
}));
