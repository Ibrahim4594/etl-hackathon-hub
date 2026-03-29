# Spark Hackathon Hub — Database Documentation

**Database:** PostgreSQL
**ORM:** Drizzle ORM
**Schema Location:** `src/lib/db/schema/`
**Migrations:** `drizzle/`

---

## Table of Contents

1. [Enums (Custom Types)](#enums)
2. [users](#users)
3. [organizations](#organizations)
4. [competitions](#competitions)
5. [competition_prizes](#competition_prizes)
6. [competition_sponsors](#competition_sponsors)
7. [teams](#teams)
8. [team_members](#team_members)
9. [submissions](#submissions)
10. [submission_validations](#submission_validations)
11. [ai_evaluations](#ai_evaluations)
12. [judge_assignments](#judge_assignments)
13. [judge_invitations](#judge_invitations)
14. [judge_evaluations](#judge_evaluations)
15. [final_rankings](#final_rankings)
16. [notifications](#notifications)
17. [payments](#payments)
18. [audit_logs](#audit_logs)
19. [platform_settings](#platform_settings)
20. [Entity Relationship Diagram](#entity-relationship-diagram)
21. [Common Queries](#common-queries)

---

## Enums

```sql
CREATE TYPE "user_role" AS ENUM('student', 'sponsor', 'judge', 'admin');

CREATE TYPE "hackathon_status" AS ENUM(
  'draft', 'pending_review', 'approved', 'active', 'judging', 'completed', 'cancelled'
);

CREATE TYPE "submission_status" AS ENUM(
  'submitted', 'validating', 'valid', 'invalid', 'flagged',
  'ai_evaluated', 'judged', 'finalist', 'winner'
);

CREATE TYPE "team_role" AS ENUM('lead', 'member');

CREATE TYPE "org_verification" AS ENUM('pending', 'verified', 'rejected');

CREATE TYPE "payment_status" AS ENUM('pending', 'completed', 'failed', 'refunded');

CREATE TYPE "notification_type" AS ENUM(
  'competition_approved', 'competition_rejected', 'team_invite', 'team_joined',
  'submission_valid', 'submission_invalid', 'submission_flagged',
  'ai_evaluation_complete', 'judge_assigned', 'judge_evaluation_complete',
  'finalist_selected', 'winner_announced', 'payment_received', 'general'
);

CREATE TYPE "validation_check" AS ENUM('required_fields', 'github_repo', 'video_link', 'deadline');

CREATE TYPE "validation_result" AS ENUM('pass', 'fail', 'warning');

CREATE TYPE "competition_visibility" AS ENUM('public', 'private');

CREATE TYPE "contribution_type" AS ENUM(
  'monetary', 'tech_credits', 'mentorship', 'internships',
  'prizes_inkind', 'cloud_services', 'api_credits', 'other'
);

CREATE TYPE "sponsor_tier" AS ENUM('title', 'gold', 'silver', 'bronze', 'partner');
```

---

## users

Stores all platform users — students, sponsors (organizers), judges, and admins.

**Schema file:** `src/lib/db/schema/users.ts`

```sql
CREATE TABLE "users" (
  "id"                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "clerk_id"             text NOT NULL UNIQUE,        -- Clerk authentication ID
  "email"                text NOT NULL UNIQUE,
  "first_name"           text,
  "last_name"            text,
  "image_url"            text,                        -- Profile picture from Google
  "role"                 user_role,                    -- student | sponsor | judge | admin
  "onboarding_complete"  boolean DEFAULT false NOT NULL,
  "university"           text,                        -- Student field
  "year_of_study"        text,                        -- Student field (1st Year, 2nd Year, etc.)
  "whatsapp"             text,                        -- Student field
  "skills"               jsonb,                       -- Student field: ["React", "Python", ...]
  "bio"                  text,
  "github_url"           text,
  "linkedin_url"         text,
  "achievements"         jsonb DEFAULT '[]',           -- ["first_submission", "first_win", ...]
  "created_at"           timestamp DEFAULT now() NOT NULL,
  "updated_at"           timestamp DEFAULT now() NOT NULL
);
```

**Foreign keys referencing this table:** organizations, competitions, teams, team_members, submissions, judge_assignments, judge_evaluations, notifications, audit_logs

---

## organizations

Sponsor/organizer organizations that host competitions.

**Schema file:** `src/lib/db/schema/organizations.ts`

```sql
CREATE TABLE "organizations" (
  "id"                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "owner_id"             uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "name"                 text NOT NULL,
  "slug"                 text NOT NULL UNIQUE,         -- URL-friendly name
  "website"              text,
  "description"          text,
  "logo_url"             text,
  "industry"             text,                        -- e.g. "FinTech", "EdTech"
  "contact_email"        text,
  "contact_phone"        text,
  "contact_person_name"  text,                        -- Primary contact name
  "verification"         org_verification DEFAULT 'pending' NOT NULL,
  "rejection_reason"     text,                        -- Admin's reason for rejection
  "created_at"           timestamp DEFAULT now() NOT NULL,
  "updated_at"           timestamp DEFAULT now() NOT NULL
);
```

---

## competitions

Hackathon/competition definitions with all configuration.

**Schema file:** `src/lib/db/schema/competitions.ts`

```sql
CREATE TABLE "competitions" (
  "id"                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id"          uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  "created_by"               uuid NOT NULL REFERENCES users(id),

  -- Basic Info
  "title"                    text NOT NULL,
  "slug"                     text NOT NULL UNIQUE,
  "tagline"                  text,
  "description"              text NOT NULL,
  "category"                 text,                    -- "AI/ML", "Web Dev", etc.
  "tags"                     jsonb DEFAULT '[]',       -- ["Beginner Friendly", "Cash Prizes", ...]
  "cover_image_url"          text,
  "logo_url"                 text,

  -- Challenge Details
  "challenge_statement"      text,
  "requirements"             text,
  "resources"                jsonb DEFAULT '[]',       -- [{title, url}, ...]

  -- Participation Rules
  "max_team_size"            integer DEFAULT 4 NOT NULL,
  "min_team_size"            integer DEFAULT 1 NOT NULL,
  "max_participants"         integer,
  "allow_solo_participation" boolean DEFAULT true NOT NULL,
  "eligibility_criteria"     text,
  "target_participants"      jsonb DEFAULT '["all"]',  -- ["university_students", "developers", ...]

  -- Timeline
  "registration_start"       timestamp,
  "registration_end"         timestamp,
  "submission_start"         timestamp,
  "submission_end"           timestamp,
  "judging_start"            timestamp,
  "judging_end"              timestamp,
  "results_date"             timestamp,

  -- Prizes (stored as JSONB for flexibility)
  "prizes"                   jsonb DEFAULT '[]',       -- [{position, title, amount, currency, description}, ...]
  "total_prize_pool"         integer DEFAULT 0,

  -- Judging Config
  "judging_criteria"         jsonb DEFAULT '[]',       -- [{name, description, weight, maxScore}, ...]
  "ai_judging_weight"        integer DEFAULT 30,       -- AI score weight (%)
  "human_judging_weight"     integer DEFAULT 70,       -- Human score weight (%)
  "finalist_count"           integer DEFAULT 10,

  -- Submission Requirements
  "submission_requirements"  jsonb DEFAULT '{"githubRequired":true,"videoRequired":true,"deployedUrlRequired":false,"pitchDeckRequired":false,"maxScreenshots":5}',
  "custom_submission_fields" jsonb DEFAULT '[]',       -- [{id, label, type, required, placeholder, options}, ...]

  -- Prize Confirmation
  "prize_confirmed"          boolean DEFAULT false NOT NULL,

  -- Status & Visibility
  "status"                   hackathon_status DEFAULT 'draft' NOT NULL,
  "published_at"             timestamp,
  "featured"                 boolean DEFAULT false NOT NULL,
  "visibility"               competition_visibility DEFAULT 'public' NOT NULL,
  "access_code"              text,                    -- For private competitions

  "created_at"               timestamp DEFAULT now() NOT NULL,
  "updated_at"               timestamp DEFAULT now() NOT NULL
);
```

**Status lifecycle:** `draft` → `pending_review` → `approved` → `active` → `judging` → `completed`

---

## competition_prizes

Individual prize tiers for a competition.

**Schema file:** `src/lib/db/schema/competition-prizes.ts`

```sql
CREATE TABLE "competition_prizes" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "competition_id"  uuid NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  "position"        integer NOT NULL,         -- 1st, 2nd, 3rd
  "title"           text NOT NULL,            -- "First Place", "Runner Up"
  "amount"          integer NOT NULL,         -- Prize amount in smallest unit
  "currency"        text DEFAULT 'PKR' NOT NULL,
  "description"     text,
  "created_at"      timestamp DEFAULT now() NOT NULL
);
```

---

## competition_sponsors

Sponsors for each competition (multi-sponsor support with tiers).

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
  "is_organizer"             boolean DEFAULT false,   -- Auto-added for the hosting org
  "created_at"               timestamp DEFAULT now(),
  "updated_at"               timestamp DEFAULT now()
);
```

---

## teams

Participant teams for each competition.

**Schema file:** `src/lib/db/schema/teams.ts`

```sql
CREATE TABLE "teams" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "competition_id"  uuid NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  "name"            text NOT NULL,
  "invite_code"     text NOT NULL UNIQUE,     -- 8-char code for team invites
  "lead_id"         uuid NOT NULL REFERENCES users(id),
  "created_at"      timestamp DEFAULT now() NOT NULL,
  "updated_at"      timestamp DEFAULT now() NOT NULL
);
```

---

## team_members

Members of each team (including the lead).

**Schema file:** `src/lib/db/schema/team-members.ts`

```sql
CREATE TABLE "team_members" (
  "id"        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "team_id"   uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  "user_id"   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "role"      team_role DEFAULT 'member' NOT NULL,  -- 'lead' or 'member'
  "joined_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "team_user_unique" UNIQUE("team_id", "user_id")
);
```

---

## submissions

Project submissions by teams.

**Schema file:** `src/lib/db/schema/submissions.ts`

```sql
CREATE TABLE "submissions" (
  "id"                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "competition_id"         uuid NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  "team_id"                uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  "submitted_by"           uuid NOT NULL REFERENCES users(id),
  "title"                  text NOT NULL,
  "description"            text NOT NULL,
  "tech_stack"             jsonb DEFAULT '[]',       -- ["React", "Python", ...]
  "github_url"             text,
  "video_url"              text,
  "deployed_url"           text,
  "pitch_deck_url"         text,
  "cover_image_url"        text,
  "screenshots"            jsonb DEFAULT '[]',       -- ["url1", "url2", ...]
  "custom_field_responses"  jsonb,                   -- {fieldId: "response", ...}
  "status"                 submission_status DEFAULT 'submitted' NOT NULL,
  "ai_score"               real,                     -- AI Judge composite score (0-10)
  "human_score"            real,                     -- Human Judge composite score (0-10)
  "final_score"            real,                     -- Weighted: AI*0.3 + Human*0.7
  "rank"                   integer,
  "created_at"             timestamp DEFAULT now() NOT NULL,
  "updated_at"             timestamp DEFAULT now() NOT NULL
);
```

**Status lifecycle:** `submitted` → `validating` → `valid`/`invalid`/`flagged` → `ai_evaluated` → `judged` → `finalist` → `winner`

---

## submission_validations

Automated validation check results for each submission.

**Schema file:** `src/lib/db/schema/submission-validations.ts`

```sql
CREATE TABLE "submission_validations" (
  "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "submission_id"  uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  "check"          validation_check NOT NULL,   -- 'required_fields', 'github_repo', 'video_link', 'deadline'
  "result"         validation_result NOT NULL,  -- 'pass', 'fail', 'warning'
  "message"        text,                        -- Human-readable result
  "details"        text,                        -- Technical details
  "created_at"     timestamp DEFAULT now() NOT NULL
);
```

---

## ai_evaluations

GPT-4o AI Judge evaluation results.

**Schema file:** `src/lib/db/schema/ai-evaluations.ts`

```sql
CREATE TABLE "ai_evaluations" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "submission_id"   uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  "summary"         text,                        -- AI-generated project summary
  "scores"          jsonb,                       -- {innovation, technical, impact, design} (1-10 each)
  "composite_score" real,                        -- Average of 4 scores
  "flags"           jsonb DEFAULT '[]',          -- ["plagiarism_suspected", "missing_demo", ...]
  "model_used"      text DEFAULT 'gpt-4o',
  "raw_response"    text,                        -- Full AI response for debugging
  "created_at"      timestamp DEFAULT now() NOT NULL
);
```

---

## judge_assignments

Maps judges to competitions they're assigned to evaluate.

**Schema file:** `src/lib/db/schema/judge-assignments.ts`

```sql
CREATE TABLE "judge_assignments" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "judge_id"        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "competition_id"  uuid NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  "expertise"       text,                        -- Judge's area of expertise for this assignment
  "assigned_at"     timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "judge_competition_unique" UNIQUE("judge_id", "competition_id")
);
```

---

## judge_invitations

Pending judge invitations (before the judge has an account).

**Schema file:** `src/lib/db/schema/judge-invitations.ts`

```sql
CREATE TABLE "judge_invitations" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "competition_id"  uuid NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  "judge_name"      text NOT NULL,
  "judge_email"     text NOT NULL,
  "expertise"       text,
  "invited_by"      uuid NOT NULL,              -- User ID of the organizer who invited
  "accepted"        boolean DEFAULT false NOT NULL,
  "accepted_at"     timestamp,
  "created_at"      timestamp DEFAULT now() NOT NULL
);
```

**Flow:** Organizer invites → row created with `accepted=false` → judge signs up → onboarding API matches by email → sets `accepted=true` + creates `judge_assignments` row

---

## judge_evaluations

Human judge scores for each submission.

**Schema file:** `src/lib/db/schema/judge-evaluations.ts`

```sql
CREATE TABLE "judge_evaluations" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "judge_id"        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "submission_id"   uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  "scores"          jsonb,                       -- {innovation, technical, impact, design} (1-10 each)
  "composite_score" real,                        -- Average of 4 scores
  "comments"        text,                        -- Judge's written feedback
  "override_ai"     boolean DEFAULT false,       -- Whether judge overrode AI score
  "created_at"      timestamp DEFAULT now() NOT NULL,
  "updated_at"      timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "judge_submission_unique" UNIQUE("judge_id", "submission_id")
);
```

---

## final_rankings

Aggregated final rankings after judging is complete.

**Schema file:** `src/lib/db/schema/final-rankings.ts`

```sql
CREATE TABLE "final_rankings" (
  "id"                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "competition_id"         uuid NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  "submission_id"          uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  "team_id"                uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  "ai_score"               real,
  "human_score_normalized" real,
  "final_score"            real NOT NULL,        -- Weighted: AI*weight + Human*weight
  "rank"                   integer NOT NULL,
  "is_finalist"            boolean DEFAULT false NOT NULL,
  "is_winner"              boolean DEFAULT false NOT NULL,
  "created_at"             timestamp DEFAULT now() NOT NULL
);
```

---

## notifications

In-app notifications with Pusher real-time delivery.

**Schema file:** `src/lib/db/schema/notifications.ts`

```sql
CREATE TABLE "notifications" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "type"       notification_type NOT NULL,
  "title"      text NOT NULL,
  "message"    text NOT NULL,
  "link"       text,                            -- URL to navigate to on click
  "read"       boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
```

---

## payments

Stripe payment records for competition publishing fees.

**Schema file:** `src/lib/db/schema/payments.ts`

```sql
CREATE TABLE "payments" (
  "id"                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id"             uuid NOT NULL REFERENCES organizations(id),
  "competition_id"              uuid REFERENCES competitions(id),
  "stripe_payment_intent_id"    text UNIQUE,
  "stripe_checkout_session_id"  text UNIQUE,
  "amount"                      integer NOT NULL,    -- In smallest currency unit (paisa)
  "currency"                    text DEFAULT 'usd' NOT NULL,
  "status"                      payment_status DEFAULT 'pending' NOT NULL,
  "description"                 text,
  "created_at"                  timestamp DEFAULT now() NOT NULL,
  "updated_at"                  timestamp DEFAULT now() NOT NULL
);
```

---

## audit_logs

Action audit trail for security and debugging.

**Schema file:** `src/lib/db/schema/audit-logs.ts`

```sql
CREATE TABLE "audit_logs" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"     uuid REFERENCES users(id),
  "action"      text NOT NULL,                   -- "competition.created", "submission.validated", etc.
  "entity_type" text,                            -- "competition", "submission", "user"
  "entity_id"   uuid,
  "metadata"    jsonb,                           -- Additional context
  "ip_address"  text,
  "created_at"  timestamp DEFAULT now() NOT NULL
);
```

---

## platform_settings

Global platform configuration (key-value store).

**Schema file:** `src/lib/db/schema/platform-settings.ts`

```sql
CREATE TABLE "platform_settings" (
  "key"        text PRIMARY KEY,
  "value"      text NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
```

**Default keys:**
| Key | Default | Description |
|-----|---------|-------------|
| `judging.ai_weight` | `30` | AI score weight percentage |
| `judging.human_weight` | `70` | Human score weight percentage |
| `judging.finalist_count` | `10` | Default number of finalists |
| `competition.max_team_size` | `4` | Default max team size |
| `competition.min_team_size` | `1` | Default min team size |
| `competition.max_screenshots` | `5` | Max screenshot uploads |
| `platform.name` | `Competition Spark` | Platform display name |
| `platform.support_email` | `support@competitionspark.com` | Support email |
| `platform.maintenance_mode` | `false` | Maintenance mode flag |

---

## Entity Relationship Diagram

```
users ─────────────────┐
  │                    │
  ├── organizations    │
  │     └── competitions
  │           ├── competition_prizes
  │           ├── competition_sponsors
  │           ├── teams
  │           │     ├── team_members ── users
  │           │     └── submissions
  │           │           ├── submission_validations
  │           │           ├── ai_evaluations
  │           │           └── judge_evaluations ── users (judges)
  │           ├── judge_assignments ── users (judges)
  │           ├── judge_invitations
  │           └── final_rankings
  │
  ├── notifications
  └── audit_logs

platform_settings (standalone key-value store)
payments (links organizations ↔ competitions)
```

---

## Common Queries

### Get all active public competitions
```sql
SELECT c.*, o.name as org_name
FROM competitions c
JOIN organizations o ON c.organization_id = o.id
WHERE c.status = 'active' AND c.visibility = 'public'
ORDER BY c.created_at DESC;
```

### Get a user's team for a competition
```sql
SELECT t.*, tm.role as member_role
FROM teams t
JOIN team_members tm ON tm.team_id = t.id
WHERE tm.user_id = '{user_id}' AND t.competition_id = '{competition_id}';
```

### Get ranked submissions for a competition
```sql
SELECT s.*, t.name as team_name, ae.summary as ai_summary
FROM submissions s
JOIN teams t ON s.team_id = t.id
LEFT JOIN ai_evaluations ae ON ae.submission_id = s.id
WHERE s.competition_id = '{competition_id}' AND s.status != 'invalid'
ORDER BY s.final_score DESC NULLS LAST;
```

### Get judge evaluation progress
```sql
SELECT
  u.first_name, u.last_name, u.email,
  COUNT(je.id) as evaluations_done,
  (SELECT COUNT(*) FROM submissions WHERE competition_id = '{comp_id}') as total_submissions
FROM judge_assignments ja
JOIN users u ON ja.judge_id = u.id
LEFT JOIN judge_evaluations je ON je.judge_id = u.id
WHERE ja.competition_id = '{comp_id}'
GROUP BY u.id;
```

### Platform stats for admin dashboard
```sql
SELECT
  (SELECT COUNT(*) FROM users) as total_users,
  (SELECT COUNT(*) FROM users WHERE role = 'student') as students,
  (SELECT COUNT(*) FROM users WHERE role = 'sponsor') as sponsors,
  (SELECT COUNT(*) FROM competitions WHERE status = 'active') as active_competitions,
  (SELECT COUNT(*) FROM submissions) as total_submissions,
  (SELECT COUNT(*) FROM organizations WHERE verification = 'verified') as verified_orgs;
```

---

## Drizzle ORM Usage

All tables are defined in TypeScript at `src/lib/db/schema/`. The Drizzle client is at `src/lib/db/index.ts`.

```typescript
import { db } from "@/lib/db";
import { users, competitions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Query example
const [user] = await db
  .select()
  .from(users)
  .where(eq(users.email, "test@example.com"));
```

### Migration Commands

```bash
# Generate migration from schema changes
npx drizzle-kit generate

# Push schema directly to database (dev)
npx drizzle-kit push

# View current schema
npx drizzle-kit studio
```

---

*Documentation generated for the Spark Hackathon Hub platform. Last updated: March 2026.*
