# Spark Hackathon Hub — Database Documentation

## Introduction

This document describes the complete database schema for the Spark Hackathon Hub platform. The platform uses **PostgreSQL** as its relational database and **Drizzle ORM** as the TypeScript query layer. All schema definitions live in `src/lib/db/schema/` as TypeScript files, and migrations are generated into the `drizzle/` folder.

The database consists of **19 tables** and **10 custom enum types** that together support the full hackathon lifecycle: user management, organization onboarding, competition creation, team formation, project submission, automated validation, AI-powered evaluation, human judging, ranking, and winner announcement.

If you're a new developer joining the project, this document will help you understand what each table stores, how tables relate to each other, and the typical queries used throughout the application.

### How to Run Migrations

```bash
# Generate a new migration after changing schema files
npx drizzle-kit generate

# Push schema directly to database (development)
npx drizzle-kit push

# Open Drizzle Studio to browse data visually
npx drizzle-kit studio
```

### How Tables Connect to the Application

Each table has a corresponding TypeScript schema file in `src/lib/db/schema/`. For example, the `users` table is defined in `users.ts`, and the `competitions` table is defined in `competitions.ts`. All schemas are re-exported from `src/lib/db/schema/index.ts`. The Drizzle client at `src/lib/db/index.ts` connects to PostgreSQL using the `DATABASE_URL` environment variable.

---

## Table of Contents

1. [Custom Enum Types](#1-custom-enum-types)
2. [users](#2-users)
3. [organizations](#3-organizations)
4. [competitions](#4-competitions)
5. [competition_prizes](#5-competition_prizes)
6. [competition_sponsors](#6-competition_sponsors)
7. [teams](#7-teams)
8. [team_members](#8-team_members)
9. [submissions](#9-submissions)
10. [submission_validations](#10-submission_validations)
11. [ai_evaluations](#11-ai_evaluations)
12. [judge_assignments](#12-judge_assignments)
13. [judge_invitations](#13-judge_invitations)
14. [judge_evaluations](#14-judge_evaluations)
15. [final_rankings](#15-final_rankings)
16. [notifications](#16-notifications)
17. [payments](#17-payments)
18. [audit_logs](#18-audit_logs)
19. [platform_settings](#19-platform_settings)
20. [Entity Relationship Diagram](#20-entity-relationship-diagram)
21. [Common Queries](#21-common-queries)

---

## 1. Custom Enum Types

PostgreSQL enums enforce that columns can only contain predefined values. The platform uses 10 enums to ensure data integrity across roles, statuses, and categories. These are defined in `src/lib/db/schema/enums.ts`.

**User roles** — every user on the platform has exactly one role. Students participate in hackathons, sponsors (organizers) host them, judges evaluate submissions, and admins manage the platform.

```sql
CREATE TYPE "user_role" AS ENUM('student', 'sponsor', 'judge', 'admin');
```

**Competition status** — tracks a competition through its lifecycle. A competition starts as a draft, goes through admin review, gets approved, goes live, enters judging, and finally completes. It can be cancelled at any stage.

```sql
CREATE TYPE "hackathon_status" AS ENUM(
  'draft', 'pending_review', 'approved', 'active', 'judging', 'completed', 'cancelled'
);
```

**Submission status** — tracks a project submission through validation, AI evaluation, human judging, and finalist/winner selection.

```sql
CREATE TYPE "submission_status" AS ENUM(
  'submitted', 'validating', 'valid', 'invalid', 'flagged',
  'ai_evaluated', 'judged', 'finalist', 'winner'
);
```

**Other enums** — team roles distinguish the team lead from members. Organization verification tracks admin approval. Payment status tracks Stripe transactions. Notification types categorize alerts. Validation enums track what checks were run and whether they passed.

```sql
CREATE TYPE "team_role" AS ENUM('lead', 'member');
CREATE TYPE "org_verification" AS ENUM('pending', 'verified', 'rejected');
CREATE TYPE "payment_status" AS ENUM('pending', 'completed', 'failed', 'refunded');
CREATE TYPE "competition_visibility" AS ENUM('public', 'private');
CREATE TYPE "contribution_type" AS ENUM(
  'monetary', 'tech_credits', 'mentorship', 'internships',
  'prizes_inkind', 'cloud_services', 'api_credits', 'other'
);
CREATE TYPE "sponsor_tier" AS ENUM('title', 'gold', 'silver', 'bronze', 'partner');
CREATE TYPE "notification_type" AS ENUM(
  'competition_approved', 'competition_rejected', 'team_invite', 'team_joined',
  'submission_valid', 'submission_invalid', 'submission_flagged',
  'ai_evaluation_complete', 'judge_assigned', 'judge_evaluation_complete',
  'finalist_selected', 'winner_announced', 'payment_received', 'general'
);
CREATE TYPE "validation_check" AS ENUM('required_fields', 'github_repo', 'video_link', 'deadline');
CREATE TYPE "validation_result" AS ENUM('pass', 'fail', 'warning');
```

---

## 2. users

The `users` table is the central table of the platform. Every person who signs in — whether a student, organizer, judge, or admin — has a row here. The table stores both authentication data (linked to Clerk via `clerk_id`) and profile information.

Students have additional fields like `university`, `year_of_study`, `whatsapp`, and `skills`. These are nullable because organizers and judges don't need them. The `onboarding_complete` flag determines whether the user has finished setting up their profile — the middleware checks this on every request and redirects incomplete users to the onboarding page.

**Schema file:** `src/lib/db/schema/users.ts`

```sql
CREATE TABLE "users" (
  "id"                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "clerk_id"             text NOT NULL UNIQUE,
  "email"                text NOT NULL UNIQUE,
  "first_name"           text,
  "last_name"            text,
  "image_url"            text,
  "role"                 user_role,
  "onboarding_complete"  boolean DEFAULT false NOT NULL,
  "university"           text,
  "year_of_study"        text,
  "whatsapp"             text,
  "skills"               jsonb,
  "bio"                  text,
  "github_url"           text,
  "linkedin_url"         text,
  "achievements"         jsonb DEFAULT '[]',
  "created_at"           timestamp DEFAULT now() NOT NULL,
  "updated_at"           timestamp DEFAULT now() NOT NULL
);
```

This table is referenced by almost every other table in the database. Deleting a user cascades to their organizations, teams, notifications, and assignments.

---

## 3. organizations

When a user signs up as an organizer (sponsor), they create an organization. This table stores the company details. Each organization belongs to one user (the `owner_id`). The `verification` field tracks whether an admin has approved the organization — new organizations start as `pending`.

**Schema file:** `src/lib/db/schema/organizations.ts`

```sql
CREATE TABLE "organizations" (
  "id"                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "owner_id"             uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "name"                 text NOT NULL,
  "slug"                 text NOT NULL UNIQUE,
  "website"              text,
  "description"          text,
  "logo_url"             text,
  "industry"             text,
  "contact_email"        text,
  "contact_phone"        text,
  "contact_person_name"  text,
  "verification"         org_verification DEFAULT 'pending' NOT NULL,
  "rejection_reason"     text,
  "created_at"           timestamp DEFAULT now() NOT NULL,
  "updated_at"           timestamp DEFAULT now() NOT NULL
);
```

The `slug` is a URL-friendly version of the organization name, generated automatically during onboarding. The `rejection_reason` is set by admins when they reject an organization, giving the organizer actionable feedback.

---

## 4. competitions

This is the largest and most important table. It stores everything about a hackathon — from basic info (title, description) to participation rules, timeline dates, prize structure, judging criteria, and submission requirements. Many columns use JSONB to store flexible, structured data like arrays of prizes, judging criteria, tags, and resources.

The `status` column tracks the competition through its lifecycle: `draft` → `pending_review` → `approved` → `active` → `judging` → `completed`. The `visibility` column determines whether it appears on the public marketplace (`public`) or is only accessible via access code (`private`).

**Schema file:** `src/lib/db/schema/competitions.ts`

```sql
CREATE TABLE "competitions" (
  "id"                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id"          uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  "created_by"               uuid NOT NULL REFERENCES users(id),
  "title"                    text NOT NULL,
  "slug"                     text NOT NULL UNIQUE,
  "tagline"                  text,
  "description"              text NOT NULL,
  "category"                 text,
  "tags"                     jsonb DEFAULT '[]',
  "cover_image_url"          text,
  "logo_url"                 text,
  "challenge_statement"      text,
  "requirements"             text,
  "resources"                jsonb DEFAULT '[]',
  "max_team_size"            integer DEFAULT 4 NOT NULL,
  "min_team_size"            integer DEFAULT 1 NOT NULL,
  "max_participants"         integer,
  "allow_solo_participation" boolean DEFAULT true NOT NULL,
  "eligibility_criteria"     text,
  "target_participants"      jsonb DEFAULT '["all"]',
  "registration_start"       timestamp,
  "registration_end"         timestamp,
  "submission_start"         timestamp,
  "submission_end"           timestamp,
  "judging_start"            timestamp,
  "judging_end"              timestamp,
  "results_date"             timestamp,
  "prizes"                   jsonb DEFAULT '[]',
  "total_prize_pool"         integer DEFAULT 0,
  "judging_criteria"         jsonb DEFAULT '[]',
  "ai_judging_weight"        integer DEFAULT 30,
  "human_judging_weight"     integer DEFAULT 70,
  "finalist_count"           integer DEFAULT 10,
  "submission_requirements"  jsonb DEFAULT '{"githubRequired":true,"videoRequired":true,...}',
  "custom_submission_fields" jsonb DEFAULT '[]',
  "prize_confirmed"          boolean DEFAULT false NOT NULL,
  "status"                   hackathon_status DEFAULT 'draft' NOT NULL,
  "published_at"             timestamp,
  "featured"                 boolean DEFAULT false NOT NULL,
  "visibility"               competition_visibility DEFAULT 'public' NOT NULL,
  "access_code"              text,
  "created_at"               timestamp DEFAULT now() NOT NULL,
  "updated_at"               timestamp DEFAULT now() NOT NULL
);
```

Notable JSONB columns explained:
- `tags` — free-form labels like `["Beginner Friendly", "Cash Prizes", "Remote"]`
- `resources` — helping materials: `[{title: "API Docs", url: "https://..."}, ...]`
- `prizes` — prize tiers: `[{position: 1, title: "First Place", amount: 50000, currency: "PKR"}, ...]`
- `judging_criteria` — what judges score on: `[{name: "Innovation", weight: 25, maxScore: 10}, ...]`
- `submission_requirements` — which fields are required/optional for participants
- `custom_submission_fields` — organizer-defined extra questions: `[{id, label, type, required, placeholder}, ...]`
- `target_participants` — audience filter: `["university_students", "developers"]` or `["all"]`

---

## 5. competition_prizes

While the `competitions` table stores prizes as JSONB for flexibility, this table provides a normalized structure for individual prize tiers when more detailed tracking is needed.

**Schema file:** `src/lib/db/schema/competition-prizes.ts`

```sql
CREATE TABLE "competition_prizes" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "competition_id"  uuid NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  "position"        integer NOT NULL,
  "title"           text NOT NULL,
  "amount"          integer NOT NULL,
  "currency"        text DEFAULT 'PKR' NOT NULL,
  "description"     text,
  "created_at"      timestamp DEFAULT now() NOT NULL
);
```

---

## 6. competition_sponsors

Each competition can have multiple sponsors with different contribution types and tiers. When an organizer creates a competition, they're automatically added as the "title" sponsor with `is_organizer=true`. Additional sponsors can be added through the wizard.

**Schema file:** `src/lib/db/schema/competition-sponsors.ts`

```sql
CREATE TABLE "competition_sponsors" (
  "id"                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "competition_id"           uuid NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  "company_name"             text NOT NULL,
  "logo_url"                 text,
  "website"                  text,
  "contribution_type"        contribution_type DEFAULT 'monetary' NOT NULL,
  "contribution_title"       text NOT NULL,
  "contribution_description" text,
  "contribution_amount"      integer,
  "contribution_currency"    text DEFAULT 'PKR',
  "contact_person_name"      text,
  "contact_person_email"     text,
  "contact_person_phone"     text,
  "sponsor_tier"             sponsor_tier DEFAULT 'partner' NOT NULL,
  "display_order"            integer DEFAULT 0,
  "featured"                 boolean DEFAULT false,
  "is_organizer"             boolean DEFAULT false,
  "created_at"               timestamp DEFAULT now(),
  "updated_at"               timestamp DEFAULT now()
);
```

The `sponsor_tier` determines how prominently the sponsor is displayed on the competition page (title sponsors get the largest placement, partners the smallest). The `display_order` controls the sort order within each tier.

---

## 7. teams

When a student registers for a competition, a team is created automatically (even for solo participants). Other students can join using the `invite_code`, which is an 8-character alphanumeric string. Only the team lead can submit the final project.

**Schema file:** `src/lib/db/schema/teams.ts`

```sql
CREATE TABLE "teams" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "competition_id"  uuid NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  "name"            text NOT NULL,
  "invite_code"     text NOT NULL UNIQUE,
  "lead_id"         uuid NOT NULL REFERENCES users(id),
  "created_at"      timestamp DEFAULT now() NOT NULL,
  "updated_at"      timestamp DEFAULT now() NOT NULL
);
```

---

## 8. team_members

Tracks who belongs to which team. The team lead is also listed here with `role='lead'`. The unique constraint on `(team_id, user_id)` prevents a user from joining the same team twice.

**Schema file:** `src/lib/db/schema/team-members.ts`

```sql
CREATE TABLE "team_members" (
  "id"        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "team_id"   uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  "user_id"   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "role"      team_role DEFAULT 'member' NOT NULL,
  "joined_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "team_user_unique" UNIQUE("team_id", "user_id")
);
```

---

## 9. submissions

When a team submits their project, all the project details are stored here — title, description, links (GitHub, video, deployed URL, pitch deck), screenshots, and tech stack. If the competition has custom submission fields, the participant's responses are stored in `custom_field_responses` as JSONB.

The `status` column tracks the submission through validation, AI evaluation, human judging, and finalist selection. The `ai_score`, `human_score`, and `final_score` columns are updated as the evaluation pipeline progresses. The `rank` is set when the ranking engine runs.

**Schema file:** `src/lib/db/schema/submissions.ts`

```sql
CREATE TABLE "submissions" (
  "id"                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "competition_id"         uuid NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  "team_id"                uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  "submitted_by"           uuid NOT NULL REFERENCES users(id),
  "title"                  text NOT NULL,
  "description"            text NOT NULL,
  "tech_stack"             jsonb DEFAULT '[]',
  "github_url"             text,
  "video_url"              text,
  "deployed_url"           text,
  "pitch_deck_url"         text,
  "cover_image_url"        text,
  "screenshots"            jsonb DEFAULT '[]',
  "custom_field_responses" jsonb,
  "status"                 submission_status DEFAULT 'submitted' NOT NULL,
  "ai_score"               real,
  "human_score"            real,
  "final_score"            real,
  "rank"                   integer,
  "created_at"             timestamp DEFAULT now() NOT NULL,
  "updated_at"             timestamp DEFAULT now() NOT NULL
);
```

The submission status lifecycle: `submitted` → `validating` → `valid`/`invalid`/`flagged` → `ai_evaluated` → `judged` → `finalist` → `winner`

---

## 10. submission_validations

After a submission is created, the validation engine runs automated checks and records each result here. There are 4 check types: required fields, GitHub repo (is it public? does it have commits?), video link (is it accessible?), and deadline (was it submitted on time?).

**Schema file:** `src/lib/db/schema/submission-validations.ts`

```sql
CREATE TABLE "submission_validations" (
  "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "submission_id"  uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  "check"          validation_check NOT NULL,
  "result"         validation_result NOT NULL,
  "message"        text,
  "details"        text,
  "created_at"     timestamp DEFAULT now() NOT NULL
);
```

Each submission typically has 3-4 validation rows — one per check type. If all pass, the submission status is set to `valid`. If any fail hard, it's set to `invalid`. If any produce warnings (like an empty GitHub repo), it's set to `flagged` for manual review.

---

## 11. ai_evaluations

After validation, the AI Judge (powered by GPT-4o) reads the submission's description, GitHub repository, and video link, then generates a project summary and scores on 4 criteria: innovation, technical implementation, impact, and design. Each score is 1-10. The composite score is the average.

The `flags` column stores anomalies the AI detected, like suspected plagiarism or a missing demo. The `raw_response` stores the full GPT response for debugging.

**Schema file:** `src/lib/db/schema/ai-evaluations.ts`

```sql
CREATE TABLE "ai_evaluations" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "submission_id"   uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  "summary"         text,
  "scores"          jsonb,
  "composite_score" real,
  "flags"           jsonb DEFAULT '[]',
  "model_used"      text DEFAULT 'gpt-4o',
  "raw_response"    text,
  "created_at"      timestamp DEFAULT now() NOT NULL
);
```

The `scores` JSONB has this shape: `{innovation: 8, technical: 7, impact: 9, design: 6}`

---

## 12. judge_assignments

Maps which judges are assigned to which competitions. A judge can be assigned to multiple competitions, and a competition can have multiple judges. The unique constraint prevents assigning the same judge to the same competition twice.

**Schema file:** `src/lib/db/schema/judge-assignments.ts`

```sql
CREATE TABLE "judge_assignments" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "judge_id"        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "competition_id"  uuid NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  "expertise"       text,
  "assigned_at"     timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "judge_competition_unique" UNIQUE("judge_id", "competition_id")
);
```

---

## 13. judge_invitations

When an organizer invites a judge who doesn't have a Spark account yet, the invitation is stored here. The judge receives an email with a link to the platform. When they sign up and complete the judge onboarding form, the system automatically matches their email to pending invitations and creates `judge_assignments` rows.

**Schema file:** `src/lib/db/schema/judge-invitations.ts`

```sql
CREATE TABLE "judge_invitations" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "competition_id"  uuid NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  "judge_name"      text NOT NULL,
  "judge_email"     text NOT NULL,
  "expertise"       text,
  "invited_by"      uuid NOT NULL,
  "accepted"        boolean DEFAULT false NOT NULL,
  "accepted_at"     timestamp,
  "created_at"      timestamp DEFAULT now() NOT NULL
);
```

The flow: organizer invites → row created (`accepted=false`) → judge signs up → onboarding API matches email → `accepted` set to `true` + `judge_assignments` row created automatically.

---

## 14. judge_evaluations

Each judge scores each submission independently on 4 criteria (innovation, technical complexity, impact, design) with scores from 1-10. The `composite_score` is the average. Judges can optionally override the AI score by setting `override_ai=true` and leaving a comment explaining why.

The unique constraint ensures a judge can only evaluate a submission once.

**Schema file:** `src/lib/db/schema/judge-evaluations.ts`

```sql
CREATE TABLE "judge_evaluations" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "judge_id"        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "submission_id"   uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  "scores"          jsonb,
  "composite_score" real,
  "comments"        text,
  "override_ai"     boolean DEFAULT false,
  "created_at"      timestamp DEFAULT now() NOT NULL,
  "updated_at"      timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "judge_submission_unique" UNIQUE("judge_id", "submission_id")
);
```

---

## 15. final_rankings

After all judges have scored, the ranking engine aggregates AI scores (default 30% weight) and human scores (default 70% weight) into a final score, then ranks all submissions. The top N submissions (configurable via `finalist_count` on the competition) are marked as finalists, and the organizer can then select winners.

**Schema file:** `src/lib/db/schema/final-rankings.ts`

```sql
CREATE TABLE "final_rankings" (
  "id"                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "competition_id"         uuid NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  "submission_id"          uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  "team_id"                uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  "ai_score"               real,
  "human_score_normalized" real,
  "final_score"            real NOT NULL,
  "rank"                   integer NOT NULL,
  "is_finalist"            boolean DEFAULT false NOT NULL,
  "is_winner"              boolean DEFAULT false NOT NULL,
  "created_at"             timestamp DEFAULT now() NOT NULL
);
```

---

## 16. notifications

In-app notifications delivered in real-time via Pusher WebSockets. When something happens (competition approved, submission validated, judge assigned, winner announced), a row is inserted here AND a Pusher event is fired so the user sees it instantly without refreshing.

**Schema file:** `src/lib/db/schema/notifications.ts`

```sql
CREATE TABLE "notifications" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "type"       notification_type NOT NULL,
  "title"      text NOT NULL,
  "message"    text NOT NULL,
  "link"       text,
  "read"       boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
```

---

## 17. payments

Tracks Stripe payment transactions for competition publishing fees. Each payment links to an organization and optionally to a specific competition. Private competitions are free, so they won't have a payment record.

**Schema file:** `src/lib/db/schema/payments.ts`

```sql
CREATE TABLE "payments" (
  "id"                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id"             uuid NOT NULL REFERENCES organizations(id),
  "competition_id"              uuid REFERENCES competitions(id),
  "stripe_payment_intent_id"    text UNIQUE,
  "stripe_checkout_session_id"  text UNIQUE,
  "amount"                      integer NOT NULL,
  "currency"                    text DEFAULT 'usd' NOT NULL,
  "status"                      payment_status DEFAULT 'pending' NOT NULL,
  "description"                 text,
  "created_at"                  timestamp DEFAULT now() NOT NULL,
  "updated_at"                  timestamp DEFAULT now() NOT NULL
);
```

---

## 18. audit_logs

Records important actions for security and debugging. Who did what, when, and to which entity. The `metadata` JSONB stores additional context specific to each action.

**Schema file:** `src/lib/db/schema/audit-logs.ts`

```sql
CREATE TABLE "audit_logs" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"     uuid REFERENCES users(id),
  "action"      text NOT NULL,
  "entity_type" text,
  "entity_id"   uuid,
  "metadata"    jsonb,
  "ip_address"  text,
  "created_at"  timestamp DEFAULT now() NOT NULL
);
```

---

## 19. platform_settings

A simple key-value store for global platform configuration. Managed by admins through the Settings page. These values provide defaults that can be overridden per competition.

**Schema file:** `src/lib/db/schema/platform-settings.ts`

```sql
CREATE TABLE "platform_settings" (
  "key"        text PRIMARY KEY,
  "value"      text NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
```

**Current settings:**

| Key | Default Value | What It Controls |
|-----|--------------|------------------|
| `judging.ai_weight` | `30` | AI score weight in final ranking (%) |
| `judging.human_weight` | `70` | Human score weight in final ranking (%) |
| `judging.finalist_count` | `10` | How many top submissions become finalists |
| `competition.max_team_size` | `4` | Default maximum team members |
| `competition.min_team_size` | `1` | Default minimum (1 = solo allowed) |
| `competition.max_screenshots` | `5` | Max screenshot uploads per submission |
| `platform.name` | `Competition Spark` | Platform display name |
| `platform.support_email` | `support@competitionspark.com` | Support email address |
| `platform.maintenance_mode` | `false` | When true, only admins can access |

---

## 20. Entity Relationship Diagram

This diagram shows how all 19 tables relate to each other. Arrows indicate foreign key relationships, with the arrow pointing from the child table to the parent.

```
users (central table)
  │
  ├─→ organizations (owner_id → users.id)
  │     │
  │     ├─→ competitions (organization_id → organizations.id)
  │     │     │
  │     │     ├─→ competition_prizes (competition_id → competitions.id)
  │     │     ├─→ competition_sponsors (competition_id → competitions.id)
  │     │     ├─→ judge_assignments (competition_id → competitions.id)
  │     │     ├─→ judge_invitations (competition_id → competitions.id)
  │     │     │
  │     │     ├─→ teams (competition_id → competitions.id)
  │     │     │     │
  │     │     │     ├─→ team_members (team_id → teams.id, user_id → users.id)
  │     │     │     │
  │     │     │     └─→ submissions (team_id → teams.id)
  │     │     │           │
  │     │     │           ├─→ submission_validations (submission_id)
  │     │     │           ├─→ ai_evaluations (submission_id)
  │     │     │           ├─→ judge_evaluations (submission_id, judge_id → users.id)
  │     │     │           └─→ final_rankings (submission_id, team_id, competition_id)
  │     │     │
  │     │     └─→ payments (competition_id → competitions.id)
  │     │
  │     └─→ payments (organization_id → organizations.id)
  │
  ├─→ notifications (user_id → users.id)
  └─→ audit_logs (user_id → users.id)

platform_settings (standalone — no foreign keys)
```

---

## 21. Common Queries

These are the most frequently used queries in the application, written in both raw SQL and Drizzle ORM syntax for reference.

### Get all active public competitions

This is the query behind the marketplace page at `/competitions`.

```sql
SELECT c.*, o.name AS org_name, o.logo_url AS org_logo
FROM competitions c
JOIN organizations o ON c.organization_id = o.id
WHERE c.status = 'active' AND c.visibility = 'public'
ORDER BY c.created_at DESC
LIMIT 12 OFFSET 0;
```

```typescript
// Drizzle ORM equivalent
const items = await db
  .select({ ...competitions, orgName: organizations.name })
  .from(competitions)
  .innerJoin(organizations, eq(competitions.organizationId, organizations.id))
  .where(and(eq(competitions.status, "active"), eq(competitions.visibility, "public")))
  .orderBy(desc(competitions.createdAt))
  .limit(12);
```

### Get a user's team for a specific competition

Used when a student visits a competition they've registered for.

```sql
SELECT t.*, tm.role AS member_role
FROM teams t
JOIN team_members tm ON tm.team_id = t.id
WHERE tm.user_id = '{user_id}' AND t.competition_id = '{competition_id}';
```

```typescript
const [membership] = await db
  .select({ team: teams, role: teamMembers.role })
  .from(teamMembers)
  .innerJoin(teams, eq(teamMembers.teamId, teams.id))
  .where(and(eq(teamMembers.userId, dbUser.id), eq(teams.competitionId, compId)));
```

### Get ranked submissions for a competition leaderboard

Fetches all scored submissions ordered by final score, with team names and AI summaries.

```sql
SELECT s.*, t.name AS team_name, ae.summary AS ai_summary, ae.composite_score AS ai_score
FROM submissions s
JOIN teams t ON s.team_id = t.id
LEFT JOIN ai_evaluations ae ON ae.submission_id = s.id
WHERE s.competition_id = '{comp_id}' AND s.status NOT IN ('submitted', 'validating', 'invalid')
ORDER BY s.final_score DESC NULLS LAST;
```

### Get judge evaluation progress for a competition

Shows how many submissions each judge has evaluated out of the total.

```sql
SELECT
  u.first_name, u.last_name, u.email,
  COUNT(je.id) AS evaluations_done,
  (SELECT COUNT(*) FROM submissions WHERE competition_id = '{comp_id}') AS total_subs
FROM judge_assignments ja
JOIN users u ON ja.judge_id = u.id
LEFT JOIN judge_evaluations je ON je.judge_id = u.id
  AND je.submission_id IN (SELECT id FROM submissions WHERE competition_id = '{comp_id}')
WHERE ja.competition_id = '{comp_id}'
GROUP BY u.id, u.first_name, u.last_name, u.email;
```

### Platform-wide stats for admin dashboard

A single query that returns all key metrics for the admin command center.

```sql
SELECT
  (SELECT COUNT(*) FROM users) AS total_users,
  (SELECT COUNT(*) FROM users WHERE role = 'student') AS students,
  (SELECT COUNT(*) FROM users WHERE role = 'sponsor') AS sponsors,
  (SELECT COUNT(*) FROM users WHERE role = 'judge') AS judges,
  (SELECT COUNT(*) FROM competitions) AS total_competitions,
  (SELECT COUNT(*) FROM competitions WHERE status = 'active') AS active_competitions,
  (SELECT COUNT(*) FROM submissions) AS total_submissions,
  (SELECT COUNT(*) FROM organizations WHERE verification = 'verified') AS verified_orgs;
```

---

## Notes for New Developers

1. **Never modify migration files** in the `drizzle/` folder directly. Always change the TypeScript schema files in `src/lib/db/schema/` and run `npx drizzle-kit generate` to create a new migration.

2. **JSONB columns** are used extensively for flexible data (prizes, tags, criteria, custom fields). Drizzle provides `.$type<T>()` for TypeScript type safety on these columns.

3. **UUID primary keys** are used everywhere instead of auto-incrementing integers. This prevents ID enumeration attacks and works well with distributed systems.

4. **Cascade deletes** — most foreign keys use `ON DELETE CASCADE`, meaning if you delete a competition, all its teams, submissions, evaluations, and rankings are automatically cleaned up. Be careful with user deletion — it cascades to organizations which cascades to everything.

5. **The `updated_at` column** is NOT automatically updated by PostgreSQL. The application code must set it manually in every UPDATE query: `.set({ ..., updatedAt: new Date() })`.

6. **Enum changes** require a new migration. You cannot add values to a PostgreSQL enum without running an ALTER TYPE command via a migration.

---

*Database documentation for the Spark Hackathon Hub platform.*
*Schema: 19 tables, 10 enums, PostgreSQL + Drizzle ORM.*
*Last updated: March 2026.*
