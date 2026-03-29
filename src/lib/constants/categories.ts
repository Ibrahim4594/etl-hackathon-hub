/**
 * Competition categories used across the platform.
 */
export const COMPETITION_CATEGORIES = [
  "AI/ML",
  "Web Dev",
  "Mobile",
  "IoT",
  "Blockchain",
  "FinTech",
  "HealthTech",
  "EdTech",
  "Social Impact",
  "Open Innovation",
] as const;

export type CompetitionCategory = (typeof COMPETITION_CATEGORIES)[number];
