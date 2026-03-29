import { pgTable, uuid, text, timestamp, unique } from "drizzle-orm/pg-core";
import { users } from "./users";
import { competitions } from "./competitions";

export const judgeAssignments = pgTable("judge_assignments", {
  id: uuid("id").defaultRandom().primaryKey(),
  judgeId: uuid("judge_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  competitionId: uuid("competition_id").notNull().references(() => competitions.id, { onDelete: "cascade" }),
  expertise: text("expertise"),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
}, (table) => [
  unique("judge_competition_unique").on(table.judgeId, table.competitionId),
]);

export type JudgeAssignment = typeof judgeAssignments.$inferSelect;
export type NewJudgeAssignment = typeof judgeAssignments.$inferInsert;
