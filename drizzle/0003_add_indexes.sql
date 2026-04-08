CREATE INDEX IF NOT EXISTS "users_clerk_id_idx" ON "users" ("clerk_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "competitions_status_idx" ON "competitions" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "competitions_organization_id_idx" ON "competitions" ("organization_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "competitions_slug_idx" ON "competitions" ("slug");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "submissions_competition_id_idx" ON "submissions" ("competition_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "submissions_submitted_by_idx" ON "submissions" ("submitted_by");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_members_user_id_idx" ON "team_members" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "judge_assignments_judge_id_idx" ON "judge_assignments" ("judge_id");
