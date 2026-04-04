# Spark — Hackathon Marketplace Platform

Built by **Ibrahim Samad**

## What is Spark?
Pakistan's first DevPost-style hackathon marketplace. Organizations host paid competitions, students compete in teams, AI + human judges evaluate submissions, winners get prizes.

**Live:** https://competition-spark.vercel.app
**Repo:** https://github.com/ETLOnline/etl-hackathon-hub

## Tech Stack
- **Framework:** Next.js 16 (App Router), React 19, TypeScript 5
- **Database:** PostgreSQL (Neon) + Drizzle ORM
- **Auth:** Clerk (Google OAuth, webhooks, custom JWT session template)
- **Payments:** Stripe
- **AI:** OpenAI GPT-4o (AI Judge)
- **Real-time:** Pusher (WebSockets)
- **Email:** Resend
- **Storage:** Azure Blob Storage
- **UI:** Tailwind CSS 4, shadcn/ui, Magic UI, GSAP, Framer Motion
- **State:** Zustand
- **Validation:** Zod v4

## Architecture

### Auth Flow
1. User signs in with Google → Clerk creates session
2. Clerk webhook fires → creates DB user (`/api/webhooks/clerk`)
3. Middleware reads role from JWT (`sessionClaims.metadata`) via custom session token template
4. No role → redirect to `/onboarding`
5. Onboarding API uses `resolveOnboardingUser()` (handles webhook race, email conflicts, stale clerkIds)
6. After onboarding → role set in both DB + Clerk metadata

### Key Auth Files
- `src/lib/auth/server-auth.ts` — wrapper around Clerk's `auth()`, used by ALL server components
- `src/lib/auth/resolve-onboarding-user.ts` — robust user resolver (finds by clerkId → email → creates)
- `src/lib/auth/ensure-db-user.ts` — old resolver, ONLY used by webhook
- `src/middleware.ts` — route protection, role-based redirects

### Database (19 tables)
users, organizations, competitions, competition-prizes, competition-sponsors, teams, team-members, submissions, submission-validations, ai-evaluations, judge-assignments, judge-invitations, judge-evaluations, final-rankings, notifications, payments, audit-logs, platform-settings

### API Routes (29 endpoints)
All in `src/app/api/` — every handler has try-catch, proper error messages, Clerk API calls isolated in inner try-catch so DB commits survive Clerk failures.

### 4 Dashboards
- **Student** (`/student/dashboard`) — competitions, submissions, teams, profile
- **Sponsor** (`/sponsor/dashboard`) — org management, competition wizard, judge invites, analytics
- **Judge** (`/judge/dashboard`) — assignments, evaluate submissions, scoring panel, leaderboard
- **Admin** (`/admin/dashboard`) — command center, 8 sub-pages (users, orgs, competitions, submissions, judges, analytics, settings)

### Competition Flow
Draft → Submit for Review → Admin Approves ("approved") → Organizer clicks "Go Live" → Active on marketplace

### Judge Invitation Flow
Organizer enters name + email + expertise → automated email via Resend → judge signs up → picks "Judge" → fills profile → auto-assigned to competition (matched by email)

### Admin Credentials
Email: `admin@spark.com` | Password: `spark@admin2026`

## UI Rules (MUST FOLLOW)

### Colors
- **NEVER** overlap colors. All text must be readable against its background.
- **NEVER** use light text (teal) on light backgrounds.
- Icons: `bg-primary text-primary-foreground` (solid teal bg, dark text) — NOT `bg-primary/10 text-primary` (invisible)
- Status colors: import from `src/lib/constants/status-colors.ts` — never define inline

### Theme
- Primary: `hsl(174 78% 62%)` (teal)
- Font: Arial, Helvetica, sans-serif (do NOT change)
- Cards: shadcn Card or MagicCard with `border-border/50 bg-card`
- Inputs: `h-10 rounded-xl bg-background/50`
- Labels: `text-[13px] font-medium text-foreground/70`

### Before Creating UI
- ALWAYS read existing pages first — match their patterns
- Test in both light AND dark mode
- Use `resolveOnboardingUser()` not `ensureDbUser()` for page/API auth
- Use `serverAuth()` not `auth()` from Clerk directly
- Never use `window.location.reload()` — causes redirect loops with Clerk

## Clerk Dashboard Config Required
1. **Webhooks:** endpoint URL = `https://competition-spark.vercel.app/api/webhooks/clerk`, events: `user.created`, `user.updated`
2. **Session Token Template:** `{ "metadata": "{{user.public_metadata}}" }`
3. **Resend:** API key in `RESEND_API_KEY` env var, from address = `onboarding@resend.dev` (or verified domain)

## Key Files
- `src/app/globals.css` — theme variables, 11 keyframe animations, premium effects
- `src/config/navigation.ts` — role-based nav items
- `src/hooks/use-competition-form.ts` — Zustand store for 10-step wizard
- `src/lib/constants/status-colors.ts` — centralized status color maps
- `src/components/layout/role-context.tsx` — server-side role provider for sidebar
