import { z } from "zod/v4";

export const submissionCreateSchema = z.object({
  competitionId: z.string().uuid(),
  teamId: z.string().uuid(),
  title: z.string().min(3, "Title must be at least 3 characters").max(100),
  description: z.string().min(20, "Description must be at least 20 characters"),
  techStack: z.array(z.string()).min(1, "Select at least one technology"),
  githubUrl: z.string().optional(),
  videoUrl: z.string().optional(),
  deployedUrl: z.string().optional(),
  pitchDeckUrl: z.string().optional(),
  screenshots: z.array(z.string()).max(5, "Maximum 5 screenshots").default([]),
  customFieldResponses: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
});

export const submissionUpdateSchema = submissionCreateSchema.partial().omit({
  competitionId: true,
  teamId: true,
});

export type SubmissionCreateInput = z.infer<typeof submissionCreateSchema>;
export type SubmissionUpdateInput = z.infer<typeof submissionUpdateSchema>;
