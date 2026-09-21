# Parent-First Online Academy

A mobile-first SaaS platform for an online group-coaching academy (Class 8 – 2nd Year) built around **live group classes + student accountability + performance tracking + parent visibility + at-risk detection**.

All phases of the original spec are complete: Foundation, Tests/Performance/Payments, Leads CRM/Communication, an Automation + WhatsApp architecture, Advanced Analytics, and Gamification/Referrals/Support/Student Success. A second, larger spec ("Phase 3": AI + Advanced Analytics + Scalability + Production Readiness) is also complete, across six sub-phases (3A–3F) — see `PHASE_COMPLETION.md` for the full phase-by-phase breakdown (read it before starting any new work on this project) and `docs/` for a deeper look at each subsystem (AI, Knowledge Base, Automation, WhatsApp, Payments, API, Role Permissions, Database Schema).

Highlights: a provider-agnostic AI layer, an admin/teacher-curated Knowledge Base, an AI Study Assistant and Study Plan for students, AI-assisted performance analysis and parent reports, a rule-based Smart Next Action engine, an AI Teacher Assistant, a per-student Subject/Chapter/Topic learning breakdown, cohort comparisons, a transparent Predictive Risk score, AI-drafted intervention recommendations, video/study-material watch-progress, structured Learning Paths, Student Goals, an AI-assisted Exam Preparation Mode, a simplified multi-child-aware Parent dashboard, a real weekly-calendar Timetable (color-coded by subject) for every role, advance monthly fee collection with parent-submitted bank/JazzCash/Easypaisa receipts awaiting staff approval, a provider-agnostic Payment architecture, real file uploads, a documented `/api/v1/*` REST surface with API-key auth and rate limiting, and an Executive Command Center / System Health / AI Usage Management suite for admins. The system automatically detects problems (missed classes, overdue homework, low test scores, payment due dates, student inactivity, expiring trials, stale leads, low engagement, declining risk trends, background job failures) and notifies the right person — see [Automation & Background Jobs](#automation--background-jobs) below.

Key admin surfaces: `/admin/command-center` (executive rollup), `/admin/system-health` (jobs/integrations/failures), `/admin/ai-usage`, `/admin/analytics` (business/marketing/retention/academic/cohort/trends), `/admin/engagement` + `/admin/predictive-risk` + `/admin/leaderboard` + `/admin/referrals`, `/admin/payments` (now includes a "Payments Awaiting Review" queue for parent-submitted receipts), `/admin/settings/{api-keys,payment-gateway}`. Key student/AI surfaces: `/knowledge-base`, `/student/study-assistant`, `/student/study-plan`, `/student/learning-path`, `/student/exam-prep`, `/teacher-assistant`. Every role's Timetable (`/student`, `/teacher`, `/admin`) is a real weekly calendar grid; parents get their own `/parent/payments` page to view a child's fee plan and submit a payment with a receipt.

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** + hand-built Radix-based component primitives (`src/components/ui`)
- **PostgreSQL** + **Prisma ORM**
- **Auth.js (NextAuth v5)** — Credentials provider, login by email **or** phone number
- **Zod** for input validation on every server action

## Architecture

```
prisma/schema.prisma     Full data model
prisma/seed.ts           Demo data generator

src/lib/services/*       Business logic (Prisma queries), reused by both pages and could back a future /api for mobile
src/lib/automation/*     Event-driven automation hooks (consecutive absences, low test scores) — called from services
src/lib/jobs/*           Scheduled-job functions (homework overdue, payment reminders, inactivity, trial expiry,
                          lead follow-up, class reminders, weekly reports, engagement scores) — see Automation & Background Jobs below
src/lib/whatsapp/*       Provider-agnostic WhatsApp sending (console/Meta Cloud API/Twilio behind one interface)
src/lib/services/analytics.ts  Business/marketing/retention/academic/question/trend/teacher analytics — reads
                                existing tables, doesn't duplicate what other services already compute
src/lib/services/{gamification,referrals,support,engagement,interventions}.ts
                          Points/badges/leaderboard, referral codes/links/rewards, support tickets, engagement
                          scoring, and intervention tracking — see PHASE_COMPLETION.md's Phase 4C section
src/lib/ai/*             Provider-agnostic AI completion interface (console/Anthropic behind one interface,
                          mirrors src/lib/whatsapp/*'s shape) — see PHASE_COMPLETION.md's Phase 3A section
src/lib/services/{knowledge-base,ai-assistant}.ts
                          Knowledge Base CRUD + keyword-scored retrieval (a placeholder for future real vector
                          search), and the AI Study Assistant's conversation orchestration + safety-rule prompt
src/lib/services/{performance-analysis,study-plan,next-actions,teacher-assistant,question-generation}.ts
                          Phase 3B: AI performance analysis, study plans, a rule-based (non-AI) Smart Next Action
                          engine, AI teacher tools, and AI question drafting — see PHASE_COMPLETION.md's Phase 3B section
src/lib/services/{learning-analytics,predictive-risk}.ts
                          Phase 3C: per-student Subject/Chapter/Topic breakdown (factual, no AI) and a transparent
                          rule-based Predictive Risk score (trend-based, distinct from At-Risk's single-snapshot
                          check) — see PHASE_COMPLETION.md's Phase 3C section. Cohort comparison lives in
                          analytics.ts's cohortAnalytics(); the AI-drafted intervention recommendation lives in
                          teacher-assistant.ts's suggestInterventionPlan()
src/lib/services/{content-progress,learning-path,goals,exam-prep}.ts
                          Phase 3D: video/study-material watch-progress (real for direct video URLs, self-reported
                          otherwise), Learning Paths (Lecture/Notes/Homework/Quiz completion derived from existing
                          content + real signals, no new content model), Student Goals (currentValue always
                          derived live, never stored), and Exam Prep Mode (countdown + weak chapters + AI revision
                          plan) — see PHASE_COMPLETION.md's Phase 3D section
src/lib/payments/*        Provider-agnostic payment interface (console default — architecture readiness, does not
                          change the existing manual payment-recording flow) — see docs/payment-architecture.md
src/lib/storage/*         Provider-agnostic file storage (local disk default — a real, working provider, unlike
                          the console AI/WhatsApp/Payment defaults) — see docs/api-architecture.md
src/lib/{api-utils,rate-limit}.ts
                          Shared conventions for /api/v1/*: Bearer API-key auth, pagination, filtering, per-key
                          rate limiting — see docs/api-architecture.md
src/lib/services/{api-keys,uploaded-files,job-runs,ai-usage,system-health,executive-dashboard}.ts
                          Phase 3E/3F: API key management, file metadata, background-job run history, AI usage
                          reporting, system health rollup, and the executive dashboard — see PHASE_COMPLETION.md's
                          Phase 3E and 3F sections
src/lib/auth.ts          NextAuth config (Node runtime — bcrypt)
src/lib/auth.config.ts   Edge-safe subset of the NextAuth config (used by middleware, no bcrypt/Prisma)
src/lib/permissions.ts   Role labels, role→home-route map, role assertion helpers
src/lib/access.ts        Cross-cutting scoping checks (e.g. "does this teacher own this batch")
src/middleware.ts        Route protection: redirects unauthenticated users, keeps each role inside its own section
                          (except /api/auth and /api/cron, which authenticate themselves)

scripts/run-jobs.ts       Local background-job runner (npm run jobs:run / jobs:watch)

src/app/api/cron/[job]    Server-to-server endpoint an external scheduler calls to run one background job
src/app/(auth)/login      Public login page
src/app/refer/[code]      Public, unauthenticated referral landing page (also allowlisted in middleware.ts)
src/app/(dashboard)/      Everything behind auth, wrapped in the shared sidebar/topbar shell
  admin/…                 Super Admin + Admin/Operations screens
  admin/analytics          Business/Marketing/Retention/Academic/Cohort/Trends analytics (tabbed, charts via Recharts)
  admin/automation         Automation Activity Log
  admin/communication       Communication Center (WhatsApp/Email/SMS/Notifications/Announcements/Logs)
  admin/engagement          Engagement Dashboard (all students by engagement status)
  admin/predictive-risk      Predictive Risk Dashboard (all students by risk level, trend-based signals)
  admin/command-center        Executive rollup — Business/Academic/Student health, Revenue, Automation, AI Usage
  admin/system-health          Background jobs, automation failures, integration status, message/AI failure rates
  admin/ai-usage                 AI request/token/cost aggregation by feature and user, informational cost caps
  admin/settings/api-keys          Bearer API keys for /api/v1/* (shown once at creation)
  admin/settings/payment-gateway     Active payment provider + a "Test Connection" button
  admin/interventions        All student interventions, filterable by status
  admin/leaderboard          Points leaderboard (this month / by batch / by level)
  admin/badges                Badge catalog CRUD + manual award-to-student
  admin/referrals              Referral dashboard stats + list + Grant Reward
  admin/support                  Support ticket triage list
  admin/settings/automation  Automation rule thresholds + on/off toggles
  admin/settings/message-templates  WhatsApp message template editor
  admin/settings/gamification        Points-per-achievement configuration
  teacher/…                Teacher screens (scoped to assigned batches)
  student/…                Student screens (scoped to self)
  student/study-assistant  AI Study Assistant chat (student-only)
  student/study-plan       AI-generated, KB-grounded daily study plan (student-only)
  student/learning-path    Lecture → Notes → Homework → Quiz completion tracker, per subject (student-only)
  student/exam-prep        Exam countdown, weak chapters, study progress, AI revision plan (student-only)
  parent/…                 Parent dashboard: "This Week" simple summary + all-children strip up top, everything
                            else behind a collapsed "Show More Details" toggle (scoped to linked children)
  counselor/…               Counselor dashboard (pipeline, follow-ups, trials, conversion)
  settings/notifications     Per-user notification channel preferences (all roles)
  support/…                    Raise a ticket, view own tickets (all roles)
  support/[id]                   Shared ticket detail — threaded conversation, staff status/assignment controls
  knowledge-base                   Shared route (NOT under /admin — see Phase 3A Known Issues on why): AI
                                    Knowledge Base CRUD + approval, reachable by Admin/Super Admin/Teacher
  teacher-assistant                  Shared route (same reason as knowledge-base): AI revision-topic suggestions
                                      + lesson summaries, reachable by Admin/Super Admin/Teacher
  students/[id]             Shared Student 360 profile — same route, RBAC-scoped per viewer role (includes an
                             Engagement tab: score, points/badges, interventions, and a staff-only Predictive
                             Risk card with an AI "Suggest Intervention" button; Performance tab has an AI
                             Insights card, a Learning Analytics card (Subject/Chapter/Topic, visible to the
                             student too — it's factual, not AI), and a Goals card (staff-created, progress always
                             derived live); Parent Reports tab has Draft/Approve/Send with AI)
  parents/[id]               Shared Parent profile
  teachers/[id]               Shared Teacher profile
  batches/[id]                  Shared Batch dashboard (Students / Schedule / Classes / Attendance / Homework / Recordings),
                                 includes a staff-only leaderboard on/off toggle

src/components/shared/*  Reusable app components: responsive DataTable, StatCard, StatusBadge, EmptyState/ErrorState,
                          ConfirmDialog, Pagination, FilterBar, EntityDialog (generic CRUD form), ProgressBar
src/components/shared/charts/*  Recharts wrappers (TrendLineChart, SimpleBarChart) used across analytics pages
```

**Why shared detail routes?** Rather than duplicating a "Batch page" for Admin and another for Teacher, `/batches/[id]` and `/students/[id]` are single routes that scope their own data server-side based on the logged-in user's role — Admins see everything, a Teacher only sees batches they're assigned to, a Parent only sees their own linked children. This keeps one implementation per feature instead of one per role.

## Prerequisites

- Node.js 18.18+ (tested on Node 24)
- A PostgreSQL database — either:
  - **Local via Docker**: `docker compose up -d` (uses `docker-compose.yml` in this repo), or
  - **Hosted**: any Postgres connection string (Neon, Supabase, Railway, RDS, etc.)

## Setup

```bash
npm install
cp .env.example .env   # then fill in DATABASE_URL and AUTH_SECRET
```

Generate a secret for `AUTH_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

If your database password contains special characters (`@`, `#`, `%`, etc.), they must be percent-encoded in `DATABASE_URL` (e.g. `@` → `%40`) or Prisma will fail to parse the connection string.

## Database

```bash
npx prisma migrate dev --name init   # creates all tables
npm run prisma:seed                  # loads realistic demo data
```

`npm run db:reset` drops and recreates the database, then re-seeds — useful in development when the schema changes.

## Automation & Background Jobs

The system automatically detects a problem and notifies the right person — see `PHASE_COMPLETION.md`'s Phase 4A section for the full list of rules. Two pieces make this real, not just theoretical:

**Event-driven automation** (fires immediately, no schedule needed): consecutive absences and low test scores are checked right inside the existing `markAttendance()` / test-grading service functions (`src/lib/automation/*.ts`) — no separate process required.

**Scheduled jobs** (homework overdue, payment reminders, student inactivity, trial expiry, lead follow-up, class reminders, weekly parent reports, daily engagement score recalculation, daily predictive risk score recalculation) need something to actually call them on a timer. Two ways to do that:

1. **Production**: point any external scheduler (Vercel Cron, a host crontab, Windows Task Scheduler + `curl`, a GitHub Actions scheduled workflow) at `POST /api/cron/<job>` with header `Authorization: Bearer <CRON_SECRET>`. Job names: `homework-overdue`, `payment-reminders`, `inactivity`, `trial-expiry`, `lead-followup`, `class-reminders`, `weekly-reports`, `engagement-scores`, `predictive-risk-scores`.
2. **Local development**: with `npm run dev` running in one terminal, run `npm run jobs:watch` in another — it calls the same `/api/cron/<job>` route on each job's real cadence (via `node-cron`) and keeps running, so automation fires on its own without any production infrastructure. `npm run jobs:run` calls every job once and exits, useful for a manual check.

Both paths call the exact same code (`src/lib/jobs/*.ts`) — there's only one place job logic lives. Every run's outcome (success/failure, items processed, error message) is persisted to `JobRun` and visible at `/admin/system-health`, alongside automation/message/AI failure rates and integration status.

## Integrations (WhatsApp, Email, Google) — managed from the Super Admin UI

**Settings → Integrations** (Super Admin only, `/admin/settings/integrations`) is the intended way to configure all three of these — enter credentials, pick a provider, connect a Google account, all from the running app, with no `.env` edit or redeploy. Everything is stored in the single-row `IntegrationSettings` table (`src/lib/services/integration-settings.ts`); secret fields (tokens, passwords, the Google client secret and refresh token) are encrypted at rest via `src/lib/crypto.ts`, keyed off `AUTH_SECRET`, so a database dump alone doesn't leak a live credential. Every provider factory (`getWhatsAppProvider()`, `getEmailProvider()`, `getGoogleCredentials()`, `getFileStorageProvider()`) checks this table first; the env vars below still work as a fallback for anyone who set this up before the UI existed, or prefers env vars for a headless deployment.

### WhatsApp

`src/lib/whatsapp/provider.ts` defines a small `WhatsAppProvider` interface (`send(to, body, template?)`); nothing else in the app depends on which provider is active.

- **Off** (default) — logs the message and records it in `WhatsAppMessage` as `SENT`. No real delivery, but every part of the pipeline (templates, queueing, status tracking, the Communication Center UI) is fully exercised.
- **Meta WhatsApp Cloud API** — paste the Access Token and Phone Number ID from [Meta for Developers](https://developers.facebook.com/) → your app → WhatsApp → API Setup.
- **Twilio** — paste the Account SID, Auth Token, and WhatsApp From number.

(Env var fallback: `WHATSAPP_PROVIDER` = `console`\|`meta`\|`twilio`, `META_WHATSAPP_TOKEN`, `META_WHATSAPP_PHONE_ID`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`.)

Message wording lives in `MessageTemplate` rows (Settings → Message Templates), editable from the UI with `{{variable}}` placeholders — no redeploy needed to change what a message says.

**Going live with Meta — the template requirement.** WhatsApp only allows freeform text messages within 24 hours of the customer's last message to you. Every automated reminder this app sends (class reminders, payment reminders, homework overdue, attendance alerts, etc.) is business-initiated and falls outside that window, so Meta requires a **pre-approved message template** for it — plain text gets rejected with an error (recorded as `FAILED` in the Communication Center, not a crash). To go live:

1. In [Meta Business Manager](https://business.facebook.com/) → WhatsApp Manager → Message Templates, create and submit a template for each rule you want to automate (e.g. `class_reminder_v1`), using `{{1}}`, `{{2}}`... placeholders **in the same order** as that rule's template body in Settings → Message Templates (e.g. if the body is `Reminder: {{class_name}} ({{subject}})...`, register `{{1}}` = class name, `{{2}}` = subject).
2. Wait for Meta's approval (usually 1–2 days).
3. Back in Settings → Message Templates, fill in that rule's **Meta Approved Template Name** and language code. From then on, `sendQueuedMessage()` (`src/lib/services/whatsapp.ts`) automatically sends it as a `type: "template"` message with positional params derived from the stored body — no code changes needed.

Until a rule has a Meta template name configured, it still sends as plain text — fine for testing, but Meta will reject it for a real recipient outside the session window.

### Email

`src/lib/email/provider.ts` defines the same shape (`send(to, subject, body)`) as WhatsApp, and the whole pipeline mirrors it: `EmailMessage` rows, `MessageTemplate.emailSubject`/`emailBody` per rule, preference-respecting delivery via `dispatchAlert()`, and a live tab in the Communication Center.

- **Off** (default) — logs the message and records it as `SENT`. No real delivery.
- **SMTP** — real delivery via [nodemailer](https://nodemailer.com/). Enter the host, port, username, password, and from address.

(Env var fallback: `EMAIL_PROVIDER` = `console`\|`smtp`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`.)

**Gmail specifically** requires an **App Password**, not your normal login password — Google blocks plain-password SMTP logins. Generate one at Google Account → Security → 2-Step Verification (must be turned on first) → App Passwords, then use `smtp.gmail.com` / port `587` / your Gmail address as the username / the 16-character app password as the password.

A rule only sends email once its `MessageTemplate` row has both **Email Subject** and **Email Body** filled in (Settings → Message Templates) — leave them blank to keep that rule WhatsApp/in-app-only.

### Google (Meet + Google Drive)

One Google connection powers two features — a real academy typically uses one Google account for both:

- **Google Meet**: scheduling a live class (`meetingProvider: GOOGLE_MEET`, from a batch's Schedule tab) with the Meeting Link left blank auto-creates a real Meet link via the Calendar API, storing the underlying Calendar event id (`LiveClass.googleEventId`) so cancelling the class later deletes the same event instead of leaving it orphaned. Free with any regular Google account, and — unlike Zoom's Basic plan, which caps group meetings at 40 minutes — no meeting-length cap for the connected account, which matters since this academy's classes run a full hour.
- **Google Drive**: an alternative file storage backend (Settings → Integrations → File Storage) for homework submissions, payment receipts, and study material, alongside the default local-disk storage. Uses the narrow `drive.file` scope — the app can only see files it created itself, not the rest of the connected account's Drive.

Connecting only needs one thing that can't be automated — creating the Google Cloud OAuth client itself requires a human in Google's own console — everything after that is a button click inside the app:

1. In [Google Cloud Console](https://console.cloud.google.com/), create (or reuse) a project and enable the **Google Calendar API** and **Google Drive API**.
2. Create an OAuth Client ID (Application type **Web application**) and add `<your app's URL>/api/integrations/google/callback` under Authorized redirect URIs (Settings → Integrations shows the exact URL to paste, matched to whatever domain you're running on — `http://localhost:3200/...` in dev).
3. Paste the Client ID and Client Secret into Settings → Integrations → Google and save.
4. Click **Connect Google Account**, sign in with whichever Google account should own the classes/files, and grant access. Settings → Integrations then shows which account is connected and when.

(Env var fallback for a headless setup with no UI access: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `GOOGLE_CALENDAR_ID`. `npm run google:connect` — a standalone script that runs a local OAuth flow and prints a refresh token to paste into `.env` — is still available for this path, but Settings → Integrations is the recommended way for everyone else.)

## AI Features

`src/lib/ai/provider.ts` defines a small `AIProvider` interface (`complete(request)`) mirroring the WhatsApp pattern above — nothing else in the app depends on which AI provider is active. Select one with `AI_PROVIDER`:

- `console` (default) — no real model call. For the Study Assistant and Study Plan, retrieves the best-matching approved Knowledge Base excerpt (see `src/lib/services/knowledge-base.ts`) and echoes it back, clearly labeled as not a generated answer; for everything else it returns a clearly-labeled placeholder. Fully exercises every AI feature's retrieval, safety-prompt, and logging pipeline without any credentials.
- `anthropic` — real Claude API calls via `@anthropic-ai/sdk`. Needs `ANTHROPIC_API_KEY`; model defaults to `claude-opus-5` (override with `AI_MODEL`).

Every AI feature — Study Assistant, Study Plan, Performance Analysis, Parent Report drafting, Teacher Assistant tools, Question Generation, Intervention Recommendations — logs each call to `AIInteraction` (provider, model, token counts, latency, success/failure) — this table is deliberately shaped to also serve a future admin "AI Usage Management" dashboard without a second migration. Knowledge Base documents require staff (`ACADEMIC_STAFF_ROLES`) approval before the AI can ever retrieve them — students only ever see `APPROVED` documents, enforced at the query level in `knowledge-base.ts`. Two features are deliberately rule-based, not AI calls, since their outputs are concrete factual/transparent derivations from existing data rather than something needing language synthesis: the Smart Next Action engine (`src/lib/services/next-actions.ts`) and the Predictive Risk score (`src/lib/services/predictive-risk.ts`) — AI is layered on top of the risk score only to turn its already-computed signals into a readable staff recommendation (`teacher-assistant.ts`'s `suggestInterventionPlan`), never to compute the score itself. See `PHASE_COMPLETION.md`'s Phase 3A, 3B, and 3C sections for the full design (safety rules, retrieval scoring, known limitations).

## Running

```bash
npm run dev
```

Visit `http://localhost:3200` — you'll be redirected to `/login`.

> Runs on port 3200 (not the default 3000) so it doesn't collide with other local projects on your machine that default to :3000.

### Seeded logins

Every seeded user shares the password **`password123`**.

| Role | Email | Phone |
|---|---|---|
| Super Admin | `owner@parentfirst.pk` | `03001234567` |
| Admin | `admin@parentfirst.pk` | `03001234568` |
| Teacher | `usman.tariq@parentfirst.pk` | `03011234561` |
| Admission Counselor | `counselor@parentfirst.pk` | `03021234561` |

Student and parent logins are generated per-seed with emails like `ahmed.khan0@student.parentfirst.pk` — run `npx prisma studio` and open the `users` table (filter by role) to find one, or just create a fresh student/parent from the Admin UI with "Create login" enabled.

You can log in with **either** the email or the phone number shown above.

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AUTH_SECRET` | Yes | Signs NextAuth session JWTs — must be a random 32-byte value in production |
| `NEXTAUTH_URL` | Yes | Base URL of the app (`http://localhost:3200` in dev) |
| `CRON_SECRET` | No | Bearer token required to call `/api/cron/*` — needed to run background jobs (see above) via an external scheduler or `npm run jobs:*` |
| `WHATSAPP_PROVIDER`, `META_WHATSAPP_TOKEN`, `META_WHATSAPP_PHONE_ID`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` | No | Fallback only — normally set from Settings → Integrations (Super Admin) instead. See Integrations above |
| `EMAIL_PROVIDER`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | No | Fallback only — normally set from Settings → Integrations instead |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `GOOGLE_CALENDAR_ID` | No | Fallback only — normally connected from Settings → Integrations instead |
| `FILE_STORAGE_PROVIDER` | No | Fallback only — normally set from Settings → Integrations instead |
| `AI_PROVIDER` | No | `console` (default) \| `anthropic` — see AI Study Assistant above |
| `ANTHROPIC_API_KEY` | No | Only read if `AI_PROVIDER=anthropic` |
| `AI_MODEL` | No | Defaults to `claude-opus-5`; override if needed |
| `ZOOM_API_KEY`, `ZOOM_API_SECRET`, `PAYMENT_GATEWAY_KEY` | No | Placeholders reserved for future integrations — not read by any code yet |

## Production Deployment

1. Provision a production Postgres instance and set `DATABASE_URL`.
2. Set `AUTH_SECRET` to a freshly generated secret (never reuse the dev one) and `NEXTAUTH_URL` to your real domain.
3. `npx prisma migrate deploy` (not `migrate dev`) to apply migrations without prompting.
4. `npm run build && npm run start`, or deploy to a Next.js-compatible host (Vercel, etc.) with the above env vars configured.
5. Run the seed script only if you want demo data in that environment — real deployments should create the first Super Admin manually (e.g. via `npx prisma studio` or a one-off script) instead.

## Testing what was built

- `npx tsc --noEmit` — typecheck
- `npx eslint .` — lint
- `npm run build` — production build (also does a full static/dynamic route pass)
- `npm run jobs:run` (with `npm run dev` running and `CRON_SECRET` set) — exercises every scheduled automation job against whatever's in the database and prints what each one did
- Manually: log in as each seeded role and confirm you only see that role's permitted nav items and scoped data (see `PHASE_COMPLETION.md` for the full verification checklist run against this build).

## Further Documentation

`PHASE_COMPLETION.md` is the full phase-by-phase build log (features, migrations, known issues) — read it before starting new work. `docs/` goes one level deeper on individual subsystems:

- [`docs/ai-architecture.md`](docs/ai-architecture.md) — provider abstraction, safety rules, usage tracking, caching
- [`docs/knowledge-base.md`](docs/knowledge-base.md) — document approval workflow, retrieval scoring
- [`docs/automation-engine.md`](docs/automation-engine.md) — rules, scheduled jobs, observability
- [`docs/whatsapp-integration.md`](docs/whatsapp-integration.md) — provider abstraction, templates, delivery status
- [`docs/payment-architecture.md`](docs/payment-architecture.md) — provider abstraction vs. the live manual-recording flow
- [`docs/api-architecture.md`](docs/api-architecture.md) — Server Actions, `/api/v1/*` conventions, File Management, multi-tenant readiness
- [`docs/role-permissions.md`](docs/role-permissions.md) — middleware vs. per-action checks, shared routes, ownership checks, known gaps
- [`docs/database-schema-overview.md`](docs/database-schema-overview.md) — what lives where, schema conventions
