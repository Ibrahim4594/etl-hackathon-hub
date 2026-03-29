import { z } from "zod/v4";

export const studentOnboardingSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  university: z.string().min(2, "University is required"),
  yearOfStudy: z.string().min(1, "Year of study is required"),
  whatsapp: z.string().min(10, "Valid WhatsApp number required"),
  skills: z.array(z.string()).min(1, "Select at least one skill"),
  bio: z.string().max(500, "Bio must be under 500 characters").optional(),
  githubUrl: z.string().optional(),
  linkedinUrl: z.string().optional(),
});

export const sponsorOnboardingSchema = z.object({
  orgName: z.string().min(2, "Organization name is required"),
  website: z.string().optional(),
  description: z.string().min(10, "Tell us about your organization"),
  industry: z.string().min(2, "Industry is required"),
  contactPersonName: z.string().min(2, "Contact person name is required"),
  contactEmail: z.string().min(1, "Email is required"),
  contactPhone: z.string().optional(),
});

export type StudentOnboardingInput = z.infer<typeof studentOnboardingSchema>;
export type SponsorOnboardingInput = z.infer<typeof sponsorOnboardingSchema>;
