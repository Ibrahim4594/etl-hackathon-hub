CREATE TYPE "public"."competition_visibility" AS ENUM('public', 'private');--> statement-breakpoint
CREATE TYPE "public"."contribution_type" AS ENUM('monetary', 'tech_credits', 'mentorship', 'internships', 'prizes_inkind', 'cloud_services', 'api_credits', 'other');--> statement-breakpoint
CREATE TYPE "public"."sponsor_tier" AS ENUM('title', 'gold', 'silver', 'bronze', 'partner');--> statement-breakpoint
CREATE TABLE "competition_sponsors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"competition_id" uuid NOT NULL,
	"company_name" text NOT NULL,
	"logo_url" text,
	"website" text,
	"contribution_type" "contribution_type" DEFAULT 'monetary' NOT NULL,
	"contribution_title" text NOT NULL,
	"contribution_description" text,
	"contribution_amount" integer,
	"contribution_currency" text DEFAULT 'PKR',
	"contact_person_name" text,
	"contact_person_email" text,
	"contact_person_phone" text,
	"sponsor_tier" "sponsor_tier" DEFAULT 'partner' NOT NULL,
	"display_order" integer DEFAULT 0,
	"featured" boolean DEFAULT false,
	"is_organizer" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "contact_person_name" text;--> statement-breakpoint
ALTER TABLE "competitions" ADD COLUMN "target_participants" jsonb DEFAULT '["all"]'::jsonb;--> statement-breakpoint
ALTER TABLE "competitions" ADD COLUMN "custom_submission_fields" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "competitions" ADD COLUMN "visibility" "competition_visibility" DEFAULT 'public' NOT NULL;--> statement-breakpoint
ALTER TABLE "competitions" ADD COLUMN "access_code" text;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "custom_field_responses" jsonb;--> statement-breakpoint
ALTER TABLE "competition_sponsors" ADD CONSTRAINT "competition_sponsors_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE cascade ON UPDATE no action;