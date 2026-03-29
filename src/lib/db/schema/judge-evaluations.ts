import { pgTable, uuid, text, real, timestamp, jsonb, boolean, unique } from "drizzle-orm/pg-core";
import { users } from "./users";
import { submissions } from "./submissions";

export const judgeEvaluations = pgTable("judge_evaluations", {
  id: uuid("id").defaultRandom().primaryKey(),
  judgeId: uuid("judge_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  submissionId: uuid("submission_id").notNull().references(() => submissions.id, { onDelete: "cascade" }),
  scores: jsonb("scores").$type<{
    innovation: number;
    technical: number;
    impact: number;
    design: number;
  }>(),
  compositeScore: real("composite_score"),
  comments: text("comments"),
  overrideAi: boolean("override_ai").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  unique("judge_submission_unique").on(table.judgeId, table.submissionId),
]);

export type JudgeEvaluation = typeof judgeEvaluations.$inferSelect;
export type NewJudgeEvaluation = typeof judgeEvaluations.$inferInsert;
