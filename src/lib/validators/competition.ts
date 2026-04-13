import { z } from "zod/v4";

export const judgingCriterionSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  weight: z.number().min(0).max(100),
  maxScore: z.number().min(1).max(100),
});

export const prizeSchema = z.object({
  position: z.number().min(1),
  title: z.string().min(1),
  amount: z.number().min(0),
  currency: z.string().default("PKR"),
  description: z.string().optional(),
});

export const targetParticipantOptions = [
  "university_students",
  "developers",
  "researchers",
  "designers",
  "data_scientists",
  "entrepreneurs",
  "all",
] as const;

export const customSubmissionFieldSchema = z.object({
  id: z.string(),
  label: z.string().min(1),
  type: z.enum(["text", "url", "textarea", "select", "number"]),
  required: z.boolean().default(false),
  placeholder: z.string().optional(),
  options: z.array(z.string()).optional(),
});

export const submissionRequirementsSchema = z.object({
  githubRequired: z.boolean().default(true),
  videoRequired: z.boolean().default(true),
  deployedUrlRequired: z.boolean().default(false),
  pitchDeckRequired: z.boolean().default(false),
  maxScreenshots: z.number().min(0).max(20).default(5),
  screenshotsRequired: z.boolean().default(false),
});

export const contributionTypes = [
  "monetary",
  "tech_credits",
  "mentorship",
  "internships",
  "prizes_inkind",
  "cloud_services",
  "api_credits",
  "other",
] as const;

export const sponsorTiers = [
  "title",
  "gold",
  "silver",
  "bronze",
  "partner",
] as const;

export const competitionSponsorSchema = z.object({
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
  logoUrl: z.string().optional(),
  website: z.string().optional(),
  contributionType: z.enum(contributionTypes),
  contributionTitle: z.string().max(100).optional(),
  contributionDescription: z.string().optional(),
  contributionAmount: z.number().min(0).optional(),
  contactPersonName: z.string().optional(),
  contactPersonEmail: z.string().optional(),
  contactPersonPhone: z.string().optional(),
  sponsorTier: z.enum(sponsorTiers),
  featured: z.boolean().default(false),
});

export type CompetitionSponsorInput = z.infer<typeof competitionSponsorSchema>;

export const competitionCreateSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100),
  tagline: z.string().max(150).optional(),
  description: z.string().min(50, "Description must be at least 50 characters"),
  category: z.string().optional(),
  tags: z.array(
    z.string().trim().max(30, "Each tag must be 30 characters or less").transform(s => s.toLowerCase())
  ).max(10, "Maximum 10 tags allowed").default([]),
  coverImageUrl: z.string().optional(),
  logoUrl: z.string().optional(),
  challengeStatement: z.string().optional(),
  requirements: z.string().optional(),
  resources: z.array(z.object({ title: z.string(), url: z.string() })).default([]),
  minTeamSize: z.number().min(1).max(50).default(1),
  maxTeamSize: z.number().min(1).max(50).default(4),
  maxParticipants: z.number().min(1).optional(),
  allowSoloParticipation: z.boolean().default(true),
  eligibilityCriteria: z.string().optional(),
  targetParticipants: z.array(z.enum(targetParticipantOptions)).default(["all"]),
  registrationStart: z.string().optional(),
  registrationEnd: z.string().optional(),
  submissionStart: z.string().optional(),
  submissionEnd: z.string().optional(),
  judgingStart: z.string().optional(),
  judgingEnd: z.string().optional(),
  resultsDate: z.string().optional(),
  prizes: z.array(prizeSchema).default([]),
  totalPrizePool: z.number().default(0),
  judgingCriteria: z.array(judgingCriterionSchema).default([]),
  aiJudgingWeight: z.number().min(0).max(100).default(30),
  humanJudgingWeight: z.number().min(0).max(100).default(70),
  finalistCount: z.number().min(1).default(10),
  submissionRequirements: submissionRequirementsSchema.optional(),
  customSubmissionFields: z.array(customSubmissionFieldSchema).max(10).default([]),
  prizeConfirmed: z.boolean().default(false),
  visibility: z.enum(["public", "private"]).default("public"),
  accessCode: z.string().optional(),
  sponsors: z.array(competitionSponsorSchema).default([]),
});

export type CompetitionCreateInput = z.infer<typeof competitionCreateSchema>;

// Per-step validation schemas — only validates fields relevant to each step
export const stepSchemas: Partial<Record<string, z.ZodTypeAny>> = {
  "basic-info": z.object({
    title: z.string().min(3, "Title must be at least 3 characters").max(100, "Title must be 100 characters or less"),
    description: z.string().min(50, "Description must be at least 50 characters"),
  }),

  "participation-rules": z
    .object({
      minTeamSize: z.number().min(1, "Min team size must be at least 1").max(50, "Max team size is 50"),
      maxTeamSize: z.number().min(1, "Max team size must be at least 1").max(50, "Max team size is 50"),
    })
    .refine((d) => d.maxTeamSize >= d.minTeamSize, {
      message: "Max team size must be ≥ min team size",
      path: ["maxTeamSize"],
    }),

  timeline: z
    .object({
      registrationStart: z.string().min(1, "Registration start is required"),
      registrationEnd: z.string().min(1, "Registration end is required"),
      submissionStart: z.string().min(1, "Submission start is required"),
      submissionEnd: z.string().min(1, "Submission end is required"),
      judgingStart: z.string().min(1, "Judging start is required"),
      judgingEnd: z.string().min(1, "Judging end is required"),
      resultsDate: z.string().optional(),
    })
    .refine(
      (d) => !d.registrationEnd || !d.registrationStart || d.registrationEnd > d.registrationStart,
      { message: "Registration end must be after registration start", path: ["registrationEnd"] }
    )
    .refine(
      (d) => !d.submissionStart || !d.registrationEnd || d.submissionStart >= d.registrationEnd,
      { message: "Submission start must be after registration ends", path: ["submissionStart"] }
    )
    .refine(
      (d) => !d.submissionEnd || !d.submissionStart || d.submissionEnd > d.submissionStart,
      { message: "Submission end must be after submission start", path: ["submissionEnd"] }
    )
    .refine(
      (d) => !d.judgingStart || !d.submissionEnd || d.judgingStart >= d.submissionEnd,
      { message: "Judging cannot start before submission closes", path: ["judgingStart"] }
    )
    .refine(
      (d) => !d.judgingEnd || !d.judgingStart || d.judgingEnd > d.judgingStart,
      { message: "Judging end must be after judging start", path: ["judgingEnd"] }
    )
    .refine(
      (d) => !d.resultsDate || !d.judgingEnd || d.resultsDate > d.judgingEnd,
      { message: "Results date must be after judging ends", path: ["resultsDate"] }
    ),

  "judging-config": z
    .object({
      aiJudgingWeight: z.number().min(0).max(100),
      humanJudgingWeight: z.number().min(0).max(100),
      finalistCount: z.number().min(1, "Must have at least 1 finalist"),
      maxParticipants: z.number().min(1).optional(),
    })
    .refine((d) => d.aiJudgingWeight + d.humanJudgingWeight === 100, {
      message: "AI and human weights must sum to 100%",
      path: ["aiJudgingWeight"],
    })
    .refine((d) => !d.maxParticipants || d.finalistCount <= d.maxParticipants, {
      message: "Number of finalists cannot exceed maximum participants",
      path: ["finalistCount"],
    }),
};
