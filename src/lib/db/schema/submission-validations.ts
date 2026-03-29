import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { submissions } from "./submissions";
import { validationCheckEnum, validationResultEnum } from "./enums";

export const submissionValidations = pgTable("submission_validations", {
  id: uuid("id").defaultRandom().primaryKey(),
  submissionId: uuid("submission_id").notNull().references(() => submissions.id, { onDelete: "cascade" }),
  check: validationCheckEnum("check").notNull(),
  result: validationResultEnum("result").notNull(),
  message: text("message"),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type SubmissionValidation = typeof submissionValidations.$inferSelect;
export type NewSubmissionValidation = typeof submissionValidations.$inferInsert;
