import { pgTable, uuid, text, real, timestamp, jsonb } from "drizzle-orm/pg-core";
import { submissions } from "./submissions";

export const aiEvaluations = pgTable("ai_evaluations", {
  id: uuid("id").defaultRandom().primaryKey(),
  submissionId: uuid("submission_id").notNull().references(() => submissions.id, { onDelete: "cascade" }),
  summary: text("summary"),
  scores: jsonb("scores").$type<{
    innovation: number;
    technical: number;
    impact: number;
    design: number;
  }>(),
  compositeScore: real("composite_score"),
  flags: jsonb("flags").$type<string[]>().default([]),
  modelUsed: text("model_used").default("gpt-4o"),
  rawResponse: text("raw_response"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AiEvaluation = typeof aiEvaluations.$inferSelect;
export type NewAiEvaluation = typeof aiEvaluations.$inferInsert;
