import { create } from "zustand";
import type { CompetitionCreateInput } from "@/lib/validators/competition";

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
  setStep: (step: number) => void;
  updateFormData: (data: Partial<CompetitionCreateInput>) => void;
  reset: () => void;
}

export const useCompetitionForm = create<CompetitionFormState>((set) => ({
  currentStep: 0,
  formData: { ...initialFormData },
  setStep: (step) =>
    set({ currentStep: Math.max(0, Math.min(step, WIZARD_STEPS.length - 1)) }),
  updateFormData: (data) =>
    set((state) => ({
      formData: { ...state.formData, ...data },
    })),
  reset: () => set({ currentStep: 0, formData: { ...initialFormData } }),
}));
