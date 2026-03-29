import { pgTable, uuid, text, integer, timestamp } from "drizzle-orm/pg-core";
import { competitions } from "./competitions";

export const competitionPrizes = pgTable("competition_prizes", {
  id: uuid("id").defaultRandom().primaryKey(),
  competitionId: uuid("competition_id").notNull().references(() => competitions.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  title: text("title").notNull(),
  amount: integer("amount").notNull(),
  currency: text("currency").default("PKR").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type CompetitionPrize = typeof competitionPrizes.$inferSelect;
export type NewCompetitionPrize = typeof competitionPrizes.$inferInsert;
