import { pgTable, uuid, text, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./users";
import { hackathonStatusEnum, competitionVisibilityEnum } from "./enums";

export const competitions = pgTable("competitions", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  createdBy: uuid("created_by").notNull().references(() => users.id),

  // Basic info
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  tagline: text("tagline"),
  description: text("description").notNull(),
  category: text("category"),
  tags: jsonb("tags").$type<string[]>().default([]),
  coverImageUrl: text("cover_image_url"),
  logoUrl: text("logo_url"),

  // Challenge details
  challengeStatement: text("challenge_statement"),
  requirements: text("requirements"),
  resources: jsonb("resources").$type<{ title: string; url: string }[]>().default([]),

  // Participation rules
  maxTeamSize: integer("max_team_size").default(4).notNull(),
  minTeamSize: integer("min_team_size").default(1).notNull(),
  maxParticipants: integer("max_participants"),
  allowSoloParticipation: boolean("allow_solo_participation").default(true).notNull(),
  eligibilityCriteria: text("eligibility_criteria"),
  targetParticipants: jsonb("target_participants").$type<string[]>().default(["all"]),

  // Timeline
  registrationStart: timestamp("registration_start"),
  registrationEnd: timestamp("registration_end"),
  submissionStart: timestamp("submission_start"),
  submissionEnd: timestamp("submission_end"),
  judgingStart: timestamp("judging_start"),
  judgingEnd: timestamp("judging_end"),
  resultsDate: timestamp("results_date"),

  // Prizes (stored as JSON for flexibility)
  prizes: jsonb("prizes").$type<{
    position: number;
    title: string;
    amount: number;
    currency: string;
    description?: string;
  }[]>().default([]),
  totalPrizePool: integer("total_prize_pool").default(0),

  // Judging config
  judgingCriteria: jsonb("judging_criteria").$type<{
    name: string;
    description: string;
    weight: number;
    maxScore: number;
  }[]>().default([]),
  aiJudgingWeight: integer("ai_judging_weight").default(30),
  humanJudgingWeight: integer("human_judging_weight").default(70),
  finalistCount: integer("finalist_count").default(10),

  // Submission requirements
  submissionRequirements: jsonb("submission_requirements").$type<{
    githubRequired: boolean;
    videoRequired: boolean;
    deployedUrlRequired: boolean;
    pitchDeckRequired: boolean;
    maxScreenshots: number;
  }>().default({
    githubRequired: true,
    videoRequired: true,
    deployedUrlRequired: false,
    pitchDeckRequired: false,
    maxScreenshots: 5,
  }),
  customSubmissionFields: jsonb("custom_submission_fields").$type<{
    id: string;
    label: string;
    type: "text" | "url" | "textarea" | "select" | "number";
    required: boolean;
    placeholder?: string;
    options?: string[];
  }[]>().default([]),

  // Prize confirmation
  prizeConfirmed: boolean("prize_confirmed").default(false).notNull(),

  // Status
  status: hackathonStatusEnum("status").default("draft").notNull(),
  publishedAt: timestamp("published_at"),
  featured: boolean("featured").default(false).notNull(),
  visibility: competitionVisibilityEnum("visibility").default("public").notNull(),
  accessCode: text("access_code"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Competition = typeof competitions.$inferSelect;
export type NewCompetition = typeof competitions.$inferInsert;
