import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { competitions } from "./competitions";
import { users } from "./users";

export const teams = pgTable("teams", {
  id: uuid("id").defaultRandom().primaryKey(),
  competitionId: uuid("competition_id").notNull().references(() => competitions.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  inviteCode: text("invite_code").notNull().unique(),
  leadId: uuid("lead_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
