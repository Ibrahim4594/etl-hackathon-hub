import { pgTable, uuid, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { competitions } from "./competitions";

export const judgeInvitations = pgTable("judge_invitations", {
  id: uuid("id").defaultRandom().primaryKey(),
  competitionId: uuid("competition_id").notNull().references(() => competitions.id, { onDelete: "cascade" }),
  judgeName: text("judge_name").notNull(),
  judgeEmail: text("judge_email").notNull(),
  expertise: text("expertise"),
  invitedBy: uuid("invited_by").notNull(),
  accepted: boolean("accepted").default(false).notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type JudgeInvitation = typeof judgeInvitations.$inferSelect;
