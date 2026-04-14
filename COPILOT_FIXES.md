# Master Fix Prompt — 46 Findings

Fix ALL issues below. Each fix is surgical. Do NOT refactor unrelated code. Run `npx tsc --noEmit` and `npm run build` after all changes.

---

## CRITICAL (12 fixes)

### C1: Register migration 0003 in Drizzle journal
The file `drizzle/0003_add_indexes.sql` exists but is not listed in `drizzle/meta/_journal.json`. Add this entry to the `entries` array in `_journal.json`:
```json
{
  "idx": 3,
  "version": "7",
  "when": 1712534400000,
  "tag": "0003_add_indexes",
  "breakpoints": true
}
```
Then run `npx drizzle-kit push` to apply the indexes to the production database.

### C2: Add Zod validation to PATCH /api/competitions/[id]
In `src/app/api/competitions/[id]/route.ts`, the PATCH handler reads `req.json()` with zero validation. Create a partial update schema and validate the body:

```ts
import { z } from "zod";

const competitionUpdateSchema = z.object({
  title: z.string().max(100).optional(),
  tagline: z.string().max(150).optional(),
  description: z.string().max(10000).optional(),
  category: z.string().max(50).optional(),
  tags: z.array(z.string().trim().max(30).transform(s => s.toLowerCase())).max(10).optional(),
  maxTeamSize: z.number().int().min(1).max(20).optional(),
  minTeamSize: z.number().int().min(1).max(20).optional(),
  registrationEnd: z.string().optional(),
  submissionStart: z.string().optional(),
  submissionEnd: z.string().optional(),
  judgingEnd: z.string().optional(),
  coverImageUrl: z.string().url().optional().or(z.literal("")),
  logoUrl: z.string().url().optional().or(z.literal("")),
  visibility: z.enum(["public", "private", "invite_only"]).optional(),
  accessCode: z.string().max(50).optional().nullable(),
}).strict();
```

Use `competitionUpdateSchema.safeParse(body)` before building the update object. Return 400 on validation failure. For the `sponsors` array in the same handler, validate each sponsor object with a schema too.

### C3: Add auth + status filter to GET /api/competitions/[id]/custom-fields
In `src/app/api/competitions/[id]/custom-fields/route.ts`, add auth and block access to draft/pending_review competitions for non-owners:

```ts
import { serverAuth } from "@/lib/auth/server-auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Inside GET handler, before returning data:
const { userId } = await serverAuth();
// Fetch competition status
const [competition] = await db.select({ status: competitions.status, createdBy: competitions.createdBy })
  .from(competitions).where(eq(competitions.id, id));
if (!competition) return NextResponse.json({ error: "Not found" }, { status: 404 });

if (competition.status === "draft" || competition.status === "pending_review") {
  if (!userId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const [dbUser] = await db.select({ role: users.role, id: users.id }).from(users).where(eq(users.clerkId, userId));
  if (!dbUser || (dbUser.role !== "admin" && competition.createdBy !== dbUser.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
```

### C4: Add auth + column filtering to GET /api/competitions/[id]/sponsors
In `src/app/api/competitions/[id]/sponsors/route.ts`, replace `db.select()` in the GET handler with an explicit projection that excludes PII:

```ts
const sponsors = await db.select({
  id: competitionSponsors.id,
  competitionId: competitionSponsors.competitionId,
  companyName: competitionSponsors.companyName,
  logoUrl: competitionSponsors.logoUrl,
  website: competitionSponsors.website,
  sponsorTier: competitionSponsors.sponsorTier,
  contributionType: competitionSponsors.contributionType,
  isOrganizer: competitionSponsors.isOrganizer,
}).from(competitionSponsors).where(eq(competitionSponsors.competitionId, id));
```

Do NOT include `contactPersonName`, `contactPersonEmail`, `contactPersonPhone`, or `contributionAmount`.

### C5: Add membership/role check to GET /api/teams/[id] and GET /api/teams/[id]/members
In both `src/app/api/teams/[id]/route.ts` and `src/app/api/teams/[id]/members/route.ts`, after the `serverAuth()` call, resolve the DB user and verify they are either:
- A member of the team (query `teamMembers` for `userId`)
- The organizer of the team's competition (`competitions.createdBy`)
- An admin

Return 403 if none of these conditions are met.

### C6: Add DB-level pagination to 3 admin pages
In these 3 files, replace the full table scan + JS-side filtering with DB-level `WHERE` + `LIMIT`/`OFFSET`:

**`src/app/(platform)/admin/submissions/page.tsx`**: Move the status filter into the SQL `WHERE` clause. Add `.limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE)` to the query. Add a separate `count(*)` query for total pages.

**`src/app/(platform)/admin/users/page.tsx`**: Add `.limit(50).offset((page - 1) * 50)` to the users query. Read `page` from searchParams. Add a count query.

**`src/app/(platform)/admin/competitions/page.tsx`**: Same pattern — push status filter into SQL, add LIMIT/OFFSET, add count query.

### C7: Add `onDelete` to 5 FK columns
In the Drizzle schema files, add `onDelete` actions:

**`src/lib/db/schema/competitions.ts`**:
```ts
createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
```
Change `createdBy` from `.notNull()` to nullable.

**`src/lib/db/schema/teams.ts`**:
```ts
leadId: uuid("lead_id").references(() => users.id, { onDelete: "set null" }),
```
Change `leadId` from `.notNull()` to nullable.

**`src/lib/db/schema/submissions.ts`**:
```ts
submittedBy: uuid("submitted_by").references(() => users.id, { onDelete: "set null" }),
```
Change `submittedBy` from `.notNull()` to nullable.

**`src/lib/db/schema/payments.ts`**:
```ts
organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "restrict" }),
competitionId: uuid("competition_id").references(() => competitions.id, { onDelete: "set null" }),
```

**`src/lib/db/schema/audit-logs.ts`**:
```ts
userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
```

Generate a new migration with `npx drizzle-kit generate` and then push with `npx drizzle-kit push`.

### C8: Fix announce route — only allow `judging` status, not `active`
In `src/app/api/competitions/[id]/announce/route.ts`, change:
```ts
if (competition.status !== "judging" && competition.status !== "active") {
```
To:
```ts
if (competition.status !== "judging") {
  return NextResponse.json({ error: "Competition must be in judging phase to announce winners" }, { status: 400 });
}
```

### C9: Wrap winner announcement in a transaction
In `src/app/api/competitions/[id]/announce/route.ts`, wrap the winner/finalist UPDATE loop AND the competition status update in `db.transaction()`:

```ts
await db.transaction(async (tx) => {
  for (const [index, winner] of winners.entries()) {
    await tx.update(submissions).set({
      status: "winner",
      finalRanking: index + 1,
    }).where(eq(submissions.id, winner.id));
  }
  // ... finalists loop with tx
  await tx.update(competitions).set({
    status: "completed",
    updatedAt: new Date(),
  }).where(eq(competitions.id, id));
});
```

### C10: Prevent duplicate org creation in sponsor onboarding
In `src/app/api/onboarding/sponsor/route.ts`, before the transaction that creates an org, check if the user already owns one:

```ts
const [existingOrg] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.ownerId, dbUser.id));
if (existingOrg) {
  // User already has an org — just update their profile, don't create a new org
  await db.update(users).set({ role: "sponsor", onboardingComplete: true, ...profileFields, updatedAt: new Date() }).where(eq(users.id, dbUser.id));
  // Skip org creation, go straight to Clerk metadata update
} else {
  // Existing transaction logic for new org creation
}
```

### C11: Add `active → judging` transition route
Create `src/app/api/competitions/[id]/start-judging/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { serverAuth } from "@/lib/auth/server-auth";
import { db } from "@/lib/db";
import { competitions, users, organizations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { apiError } from "@/lib/api-error";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { userId } = await serverAuth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [dbUser] = await db.select().from(users).where(eq(users.clerkId, userId));
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (dbUser.role !== "sponsor" && dbUser.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [competition] = await db.select().from(competitions).where(eq(competitions.id, id));
    if (!competition) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (competition.status !== "active") {
      return NextResponse.json({ error: "Only active competitions can move to judging" }, { status: 400 });
    }

    if (dbUser.role === "sponsor" && competition.createdBy !== dbUser.id) {
      return NextResponse.json({ error: "You do not own this competition" }, { status: 403 });
    }

    const [updated] = await db.update(competitions)
      .set({ status: "judging", updatedAt: new Date() })
      .where(eq(competitions.id, id))
      .returning();

    return NextResponse.json({ competition: updated });
  } catch (error) {
    return apiError(error, "Failed to start judging");
  }
}
```

### C12: Guard Stripe webhook competition status update
In `src/lib/services/stripe.ts`, inside the `checkout.session.completed` transaction, add a status guard before updating competition:

```ts
if (competitionId) {
  await tx.update(competitions)
    .set({ status: "pending_review", updatedAt: new Date() })
    .where(and(
      eq(competitions.id, competitionId),
      eq(competitions.status, "draft")  // Only update if still draft
    ));
}
```

---

## HIGH (15 fixes)

### H1: Filter soft-deleted users in all lookups
In `src/lib/auth/resolve-onboarding-user.ts`, add `isNull(users.deletedAt)` to the clerkId lookup:
```ts
const [byClerkId] = await db.select().from(users).where(
  and(eq(users.clerkId, clerkId), isNull(users.deletedAt))
);
```
Import `isNull` from `drizzle-orm`. Apply the same filter to the email lookup in the same file.

### H2: Add try-catch to middleware Clerk BAPI call
In `src/middleware.ts`, wrap the slow-path Clerk call in try-catch:
```ts
if (role === undefined) {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    role = (user.publicMetadata as { role?: string })?.role;
    onboardingComplete = (user.publicMetadata as { onboardingComplete?: boolean })?.onboardingComplete;
  } catch (err) {
    console.error("Middleware: Clerk BAPI fallback failed", err);
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }
}
```

### H3: Add Zod validation to PATCH /api/student/profile
In `src/app/api/student/profile/route.ts`, replace the manual allowed-fields loop with a Zod schema:
```ts
const profileUpdateSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  university: z.string().max(100).optional(),
  whatsapp: z.string().max(20).optional(),
  bio: z.string().max(500).optional(),
  githubUrl: z.string().url().or(z.literal("")).optional(),
  linkedinUrl: z.string().url().or(z.literal("")).optional(),
  skills: z.array(z.string().max(30)).max(20).optional(),
});

const parsed = profileUpdateSchema.safeParse(body);
if (!parsed.success) {
  return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
}
// Use parsed.data to build the update object
```

### H4: Add Zod validation to POST /api/judge/invite + escape HTML in email
In `src/app/api/judge/invite/route.ts`, add:
```ts
const inviteSchema = z.object({
  email: z.string().email().max(255),
  name: z.string().min(1).max(200).trim(),
  competitionId: z.string().uuid(),
  expertise: z.string().max(500).trim().optional(),
});
```
Use `inviteSchema.safeParse(body)`. Also, before interpolating `name` and `expertise` into the HTML email template, escape HTML entities:
```ts
function escapeHtml(str: string) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
// Then: <strong>${escapeHtml(name)}</strong>
```

### H5: Remove SVG from allowed upload types
In `src/app/api/upload/route.ts`, remove `"image/svg+xml"` from the `ALLOWED_TYPES` array. SVG files can contain embedded JavaScript.

### H6: This is a longer-term fix (rate limiting with @upstash/ratelimit) — skip for now. Add a TODO comment at the top of `src/app/api/onboarding/admin/route.ts`, `src/app/api/judge/invite/route.ts`, and `src/app/api/upload/route.ts`:
```ts
// TODO: Add rate limiting (@upstash/ratelimit) — currently unprotected
```

### H7: Wrap useSearchParams components in Suspense
In these 3 files, wrap the filter component usage in `<Suspense>`:

**`src/app/competitions/page.tsx`**: Wrap `<CompetitionFilters>` in `<Suspense fallback={null}>`.
**`src/app/(platform)/admin/competitions/page.tsx`**: Wrap `<CompetitionStatusFilter>` in `<Suspense fallback={null}>`.
**`src/app/(platform)/admin/submissions/page.tsx`**: Wrap `<SubmissionStatusFilter>` in `<Suspense fallback={null}>`.

Import `Suspense` from `react`.

### H8: Add `asChild` to DialogTrigger in 4 components
In these 4 files, add `asChild` to `<DialogTrigger>` that wraps a `<Button>`:
- `src/components/teams/team-invite-dialog.tsx`
- `src/components/teams/team-create-dialog.tsx`
- `src/components/judge/invite-judge-dialog.tsx`
- `src/components/competitions/announce-winners-dialog.tsx`

Change `<DialogTrigger>` to `<DialogTrigger asChild>` in each.

### H9: Add duplicate check before inserting judge invitation
In `src/app/api/judge/invite/route.ts`, before inserting into `judgeInvitations`, check for existing invitation:
```ts
const [existingInvite] = await db.select({ id: judgeInvitations.id })
  .from(judgeInvitations)
  .where(and(
    eq(judgeInvitations.competitionId, competitionId),
    eq(judgeInvitations.judgeEmail, email.trim().toLowerCase())
  ));
if (existingInvite) {
  return NextResponse.json({ error: "Judge already invited" }, { status: 409 });
}
```

### H10: Add idempotency check before AI evaluation
In `src/lib/services/ai-judge.ts`, at the top of `evaluateSubmission()`, check for existing evaluation:
```ts
const [existing] = await db.select({ id: aiEvaluations.id })
  .from(aiEvaluations)
  .where(eq(aiEvaluations.submissionId, submissionId));
if (existing) {
  return; // Already evaluated
}
```

### H11: Add timeout to OpenAI fetch in AI judge
In `src/lib/services/ai-judge.ts`, add an AbortController timeout to the OpenAI API call:
```ts
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 55000); // 55s to fit in 60s Vercel limit
try {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    ...existingOptions,
    signal: controller.signal,
  });
} finally {
  clearTimeout(timeout);
}
```

### H12: Validate OpenAI response shape with Zod
In `src/lib/services/ai-judge.ts`, after `JSON.parse(rawContent)`, validate with Zod:
```ts
const aiResponseSchema = z.object({
  scores: z.object({
    innovation: z.number().min(1).max(10),
    technical: z.number().min(1).max(10),
    impact: z.number().min(1).max(10),
    design: z.number().min(1).max(10),
  }),
  summary: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
});

const parsed = aiResponseSchema.safeParse(JSON.parse(rawContent));
if (!parsed.success) {
  throw new Error("Invalid AI response shape");
}
const { scores, summary, strengths, weaknesses } = parsed.data;
```

### H13: Reduce postgres.js pool to max 1 for serverless
In `src/lib/db/index.ts`, change `max: 5` to `max: 1`:
```ts
const client = postgres(process.env.DATABASE_URL!, {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
});
```

### H14: Fix judge onboarding role guard
In `src/app/api/onboarding/judge/route.ts`, change:
```ts
if (dbUser.onboardingComplete && dbUser.role && dbUser.role !== "judge") {
```
To:
```ts
if (dbUser.role && dbUser.role !== "judge") {
```
Remove the `onboardingComplete &&` prefix to match the student/sponsor pattern.

### H15: Await triggerEvent in admin/competitions
In `src/app/api/admin/competitions/route.ts`, add `await` before the `triggerEvent()` call (around line 84):
```ts
await triggerEvent(channels.organizer(org.id), EVENTS.ORG_COMPETITION_STATUS, { ... });
```

---

## MEDIUM (14 fixes)

### M1: Create global-error.tsx
Create `src/app/global-error.tsx`:
```tsx
"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div style={{ padding: "2rem", textAlign: "center" }}>
          <h2>Something went wrong</h2>
          <p>{error.message || "An unexpected error occurred"}</p>
          <button onClick={reset}>Try again</button>
        </div>
      </body>
    </html>
  );
}
```

### M2: Move inline status colors to centralized file
In `src/lib/constants/status-colors.ts`, add exports for the additional status config shapes used across the 5 violating files (competition-card, competition detail page, competition-detail-tabs, sponsor competitions page, judge evaluate page). Then update those 5 files to import from the centralized file instead of defining inline.

### M3: Add aria-label to icon-only buttons
In these files, add `aria-label` to icon-only buttons:
- `src/app/(platform)/sponsor/competitions/[id]/submissions/page.tsx` — `aria-label="Go back"`
- `src/app/(platform)/sponsor/competitions/[id]/judges/page.tsx` — `aria-label="Go back"`
- `src/app/(platform)/judge/assignments/[assignmentId]/submissions/page.tsx` — `aria-label="Go back"`
- `src/components/submissions/submission-form.tsx` — `aria-label="Remove screenshot"` on Trash2 buttons
- `src/components/competitions/wizard/step-challenge-details.tsx` — `aria-label="Remove resource"` on Trash2 buttons

### M4: Replace bare `<img>` with `next/image`
In these 3 files, replace `<img>` with `<Image>` from `next/image`:
- `src/app/(platform)/sponsor/organization/page.tsx`
- `src/components/shared/image-upload.tsx`
- `src/app/(platform)/student/submissions/[id]/page.tsx`

### M5: Parallelize student dashboard queries
In `src/app/(platform)/student/dashboard/page.tsx`, wrap the 4 independent queries (recentSubmissions, total count, wins count, submissionsByComp) in `Promise.all`.

### M6: Parallelize judge dashboard queries
In `src/app/(platform)/judge/dashboard/page.tsx`, wrap the 2 independent count queries + recentEvals in `Promise.all`.

### M7: Move 3 sequential queries into admin dashboard Promise.all
In `src/app/(platform)/admin/dashboard/page.tsx`, move the `recentCompetitions`, `recentSubmissions`, and `pendingOrgsList` queries into the existing `Promise.all` block.

### M8: Add unique constraint on submissions(team_id, competition_id)
In `src/lib/db/schema/submissions.ts`, add after the table definition:
```ts
// In the table indexes/constraints:
teamCompetitionUnique: unique("team_competition_unique").on(submissions.teamId, submissions.competitionId),
```
Generate and push migration.

### M9: Add FK constraint to judgeInvitations.invitedBy
In `src/lib/db/schema/judge-invitations.ts`, change:
```ts
invitedBy: uuid("invited_by").notNull(),
```
To:
```ts
invitedBy: uuid("invited_by").notNull().references(() => users.id, { onDelete: "set null" }),
```
Make it nullable if using `set null`. Generate and push migration.

### M10: Make competitionSponsors timestamps notNull
In `src/lib/db/schema/competition-sponsors.ts`, change:
```ts
createdAt: timestamp("created_at").defaultNow(),
updatedAt: timestamp("updated_at").defaultNow(),
```
To:
```ts
createdAt: timestamp("created_at").defaultNow().notNull(),
updatedAt: timestamp("updated_at").defaultNow().notNull(),
```

### M11: Remove duplicate framer-motion package
In `package.json`, remove `"framer-motion"` from dependencies. Keep only `"motion"`. Then in all 13 files that import from `"framer-motion"`, change the import to `"motion"`:
```ts
// Change: import { motion } from "framer-motion";
// To:     import { motion } from "motion/react";
```

### M12: Move shadcn to devDependencies
In `package.json`, move `"shadcn"` from `dependencies` to `devDependencies`.

### M13: Replace raw db.select in admin routes with resolveOnboardingUser
In `src/app/api/admin/organizations/route.ts` and `src/app/api/admin/competitions/route.ts`, replace:
```ts
const [dbUser] = await db.select().from(users).where(eq(users.clerkId, userId));
```
With:
```ts
import { resolveOnboardingUser } from "@/lib/auth/resolve-onboarding-user";
const dbUser = await resolveOnboardingUser(userId);
```

### M14: Use shared Stripe client in webhook
In `src/app/api/webhooks/stripe/route.ts`, replace:
```ts
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
```
With:
```ts
import { getStripeClient } from "@/lib/services/stripe";
const stripe = getStripeClient();
```
This ensures consistent API version.

---

## LOW (5 fixes)

### L1: Delete dead ensure-db-user.ts
Delete `src/lib/auth/ensure-db-user.ts`. It has zero imports anywhere.

### L2: Type Pusher callbacks properly
In `src/hooks/use-realtime.ts` and `src/hooks/use-realtime-channel.ts`, remove the `eslint-disable @typescript-eslint/no-explicit-any` comments and type the callback parameters using the event payload types from `src/lib/services/pusher-channels.ts`.

### L3: Extract typed tag query helper
Create a helper function to replace the `as unknown as Array<{ tag: string }>` pattern in `src/app/api/competitions/tags/route.ts` and `src/app/competitions/page.tsx`.

### L4: Add revalidate to dashboard pages
Add `export const revalidate = 60;` to:
- `src/app/(platform)/student/dashboard/page.tsx`
- `src/app/(platform)/admin/dashboard/page.tsx`
- `src/app/(platform)/judge/dashboard/page.tsx`
- `src/app/(platform)/sponsor/competitions/page.tsx`

### L5: This is a longer-term fix (private Pusher channels + auth endpoint) — skip for now. Add a TODO comment at the top of `src/lib/services/pusher-channels.ts`:
```ts
// TODO: Prefix sensitive channels with "private-" and implement /api/pusher/auth endpoint
```

---

## Post-fix checklist
1. `npx tsc --noEmit` — zero errors
2. `npm run build` — clean build
3. `npx drizzle-kit push` — apply any new migrations
4. Do NOT touch files not mentioned above
5. Do NOT add features or refactor unrelated code
