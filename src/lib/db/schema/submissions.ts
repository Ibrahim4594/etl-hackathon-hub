import { pgTable, uuid, text, timestamp, jsonb, real, integer } from "drizzle-orm/pg-core";
import { competitions } from "./competitions";
import { teams } from "./teams";
import { users } from "./users";
import { submissionStatusEnum } from "./enums";

export const submissions = pgTable("submissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  competitionId: uuid("competition_id").notNull().references(() => competitions.id, { onDelete: "cascade" }),
  teamId: uuid("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  submittedBy: uuid("submitted_by").notNull().references(() => users.id),

  // Project details
  title: text("title").notNull(),
  description: text("description").notNull(),
  techStack: jsonb("tech_stack").$type<string[]>().default([]),

  // Links
  githubUrl: text("github_url"),
  videoUrl: text("video_url"),
  deployedUrl: text("deployed_url"),
  pitchDeckUrl: text("pitch_deck_url"),

  // Media
  coverImageUrl: text("cover_image_url"),
  screenshots: jsonb("screenshots").$type<string[]>().default([]),

  // Custom field responses
  customFieldResponses: jsonb("custom_field_responses").$type<Record<string, string | number>>(),

  // Status & scoring
  status: submissionStatusEnum("status").default("submitted").notNull(),
  aiScore: real("ai_score"),
  humanScore: real("human_score"),
  finalScore: real("final_score"),
  rank: integer("rank"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Submission = typeof submissions.$inferSelect;
export type NewSubmission = typeof submissions.$inferInsert;
