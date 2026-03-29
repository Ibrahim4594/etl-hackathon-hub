# Spark — Hackathon Marketplace Platform

Pakistan's first AI-powered hackathon marketplace where organizations host competitions, students compete in teams, and AI + human judges evaluate submissions.

Built by **Ibrahim Samad** for [ETL Online](https://etlonline.org).

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss)

---

## Overview

Spark connects organizations with student developers through structured hackathon competitions. Sponsors publish challenges, students form teams and submit projects, and a combination of AI and human judges evaluate entries to determine winners.

### Key Features

- **4-Role System** — Participant, Organizer, Judge, Admin with role-specific dashboards
- **10-Step Competition Wizard** — Title, challenge, rules, submissions, timeline, prizes, sponsors, judging, media, review
- **AI Judge** — GPT-4o generates project summaries and scores on 4 criteria (innovation, technical, impact, design)
- **Human Judge Panel** — Side-by-side AI + human scoring with override capability
- **Validation Engine** — Automated GitHub repo checks (public, has commits) + video link validation
- **Ranking Engine** — Configurable AI (30%) + Human (70%) weighted scoring with z-score normalization
- **Real-time Updates** — Pusher-powered live notifications, leaderboard updates, and team events
- **Private Competitions** — Access code-based invite-only hackathons (free to host)
- **Custom Submission Fields** — Organizers define custom questions (text, URL, textarea, select, number)
- **Judge Invitation Flow** — Automated email invitations with auto-assignment on signup

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router, React 19, Turbopack) |
| **Language** | TypeScript 5 (strict mode) |
| **Database** | PostgreSQL via Drizzle ORM |
| **Authentication** | Clerk (Google OAuth, webhook sync, JWT session tokens) |
| **Payments** | Stripe |
| **AI** | OpenAI GPT-4o (AI Judge pipeline) |
| **Real-time** | Pusher (WebSocket channels) |
| **Email** | Resend (transactional emails) |
| **Storage** | Azure Blob Storage |
| **UI** | Tailwind CSS 4, shadcn/ui, Framer Motion, GSAP |
| **State** | Zustand (competition wizard form state) |
| **Validation** | Zod v4 (request/response schemas) |
| **Analytics** | PostHog (client-side tracking) |

---

## Architecture

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Sign in / Sign up (Clerk)
│   ├── (marketing)/              # Landing page, footer, navbar
│   ├── (platform)/               # Authenticated dashboards
│   │   ├── admin/                # Admin command center (8 pages)
│   │   ├── judge/                # Judge evaluation dashboard
│   │   ├── sponsor/              # Organizer dashboard + competition management
│   │   └── student/              # Participant dashboard + submissions + teams
│   ├── api/                      # API routes (29 endpoints)
│   │   ├── admin/                # Admin management APIs
│   │   ├── competitions/         # CRUD + publish + go-live + register + announce
│   │   ├── judge/                # Invite + evaluate + assignments + leaderboard
│   │   ├── onboarding/           # Student + sponsor + judge + admin onboarding
│   │   ├── submissions/          # Create + validate + AI evaluate
│   │   ├── teams/                # Create + join + invite + members
│   │   └── webhooks/             # Clerk + Stripe webhooks
│   ├── competitions/             # Public marketplace + detail + leaderboard
│   └── onboarding/               # Role selection + onboarding forms
├── components/
│   ├── ui/                       # shadcn primitives (30+ components)
│   ├── layout/                   # Topbar, sidebar, FAB, role context
│   ├── marketing/                # Hero, FAQ, mobile nav
│   ├── motion/                   # GSAP + Framer Motion animation wrappers
│   ├── shared/                   # Stat cards, empty states, page headers
│   ├── competitions/             # Wizard steps, cards, filters, publish/register
│   ├── judge/                    # Scoring panel, AI summary, invite dialog
│   └── ...                       # Domain-specific components
├── lib/
│   ├── auth/                     # serverAuth, resolveOnboardingUser, ensureDbUser
│   ├── db/                       # Drizzle client + 19 schema files
│   ├── services/                 # Email, notification, validation, AI judge, ranking
│   ├── validators/               # Zod schemas (auth, competition, submission)
│   └── constants/                # Status colors, categories
└── hooks/                        # Zustand stores (competition form)
```

---

## Database Schema

19 tables managed by Drizzle ORM:

| Table | Purpose |
|-------|---------|
| `users` | All users (students, sponsors, judges, admins) |
| `organizations` | Sponsor organizations |
| `competitions` | Hackathon definitions (10+ JSONB fields) |
| `competition_sponsors` | Multi-sponsor support with tiers |
| `competition_prizes` | Prize structure per competition |
| `teams` | Participant teams (invite code system) |
| `team_members` | Team membership (lead/member roles) |
| `submissions` | Project submissions with custom field responses |
| `submission_validations` | Automated validation results |
| `ai_evaluations` | GPT-4o generated summaries + scores |
| `judge_assignments` | Judge-to-competition assignments |
| `judge_evaluations` | Human judge scores (4 criteria) |
| `judge_invitations` | Pending judge invitations (email-based) |
| `final_rankings` | Aggregated AI + human scores |
| `notifications` | In-app notifications (Pusher-powered) |
| `payments` | Stripe payment records |
| `audit_logs` | Action audit trail |
| `platform_settings` | Global platform configuration (key-value) |

---

## Hackathon Lifecycle

```
1. Organizer Onboarding → Create Organization
2. Competition Creation → 10-step wizard → Save as Draft
3. Submit for Review → Status: "pending_review"
4. Admin Approves → Status: "approved"
5. Organizer Clicks "Go Live" → Status: "active" → Email confirmation
6. Students Register → Form teams → Submit projects
7. Validation Engine → Required fields + GitHub API + video check
8. AI Judge → Summary + 4 scores (innovation, technical, impact, design)
9. Human Judges → Score on rubric + override AI if needed
10. Ranking Engine → AI (30%) + Human (70%) weighted scores
11. Organizer Announces Winners → Notifications sent
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database
- Clerk account (authentication)
- Resend account (email)

### Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/spark

# Stripe
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# OpenAI (AI Judge)
OPENAI_API_KEY=

# Pusher (Real-time)
NEXT_PUBLIC_PUSHER_APP_KEY=
PUSHER_APP_ID=
PUSHER_SECRET=

# Resend (Email)
RESEND_API_KEY=

# Azure (Storage)
AZURE_STORAGE_CONNECTION_STRING=
```

### Setup

```bash
# Install dependencies
npm install

# Push database schema
npx drizzle-kit push

# Start development server
npm run dev
```

### Clerk Configuration

1. Enable Google OAuth in Clerk Dashboard
2. Add webhook endpoint: `https://yourapp.com/api/webhooks/clerk` (events: `user.created`, `user.updated`)
3. Add custom session token template:
   ```json
   { "metadata": "{{user.public_metadata}}" }
   ```

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/competitions` | Public | List active public competitions |
| POST | `/api/competitions` | Sponsor | Create competition (draft) |
| POST | `/api/competitions/[id]/publish` | Sponsor | Submit for admin review |
| POST | `/api/competitions/[id]/go-live` | Sponsor/Admin | Activate approved competition |
| POST | `/api/competitions/[id]/register` | Student | Register for competition |
| POST | `/api/competitions/[id]/announce` | Sponsor | Announce winners |
| POST | `/api/submissions` | Student | Submit project |
| POST | `/api/submissions/[id]/validate` | System | Run validation engine |
| POST | `/api/submissions/[id]/ai-evaluate` | System | Run AI judge |
| POST | `/api/judge/invite` | Sponsor | Invite judge (sends email) |
| POST | `/api/judge/evaluate` | Judge | Submit evaluation scores |
| PATCH | `/api/admin/competitions` | Admin | Approve/reject competitions |
| PATCH | `/api/admin/organizations` | Admin | Verify/reject organizations |
| PATCH | `/api/admin/users` | Admin | Change user roles |

---

## Admin Access

- **Email:** `admin@spark.com`
- **Password:** `spark@admin2026`

Enter these on the onboarding screen after selecting "Admin".

---

## Deployment

### Vercel (Current)

```bash
npx vercel --prod
```

### AWS (Production)

The application is designed to handle 5000+ concurrent users:
- All API routes have proper error handling and try-catch
- Database queries are optimized with Drizzle ORM
- CDN caching on public API routes (60s TTL)
- ISR on marketplace page (60s revalidation)
- Skeleton loading states on all major routes

---

## License

Proprietary — ETL Online. All rights reserved.

---

Built with care for Pakistan's tech community.
