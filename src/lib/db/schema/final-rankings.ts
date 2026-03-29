import { pgTable, uuid, real, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { competitions } from "./competitions";
import { submissions } from "./submissions";
import { teams } from "./teams";

export const finalRankings = pgTable("final_rankings", {
  id: uuid("id").defaultRandom().primaryKey(),
  competitionId: uuid("competition_id").notNull().references(() => competitions.id, { onDelete: "cascade" }),
  submissionId: uuid("submission_id").notNull().references(() => submissions.id, { onDelete: "cascade" }),
  teamId: uuid("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  aiScore: real("ai_score"),
  humanScoreNormalized: real("human_score_normalized"),
  finalScore: real("final_score").notNull(),
  rank: integer("rank").notNull(),
  isFinalist: boolean("is_finalist").default(false).notNull(),
  isWinner: boolean("is_winner").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type FinalRanking = typeof finalRankings.$inferSelect;
export type NewFinalRanking = typeof finalRankings.$inferInsert;
