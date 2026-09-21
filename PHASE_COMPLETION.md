# Phase Completion Log — Parent-First Online Academy

> **Read this before starting any new phase of work.** Inspect the current code and this file first — never rewrite working functionality, extend the existing architecture instead.

---

## Phase 1 — Foundation + Core Operations

**Status: Complete and verified.** `npx tsc --noEmit`, `npx eslint .`, and `npm run build` all pass clean. Manually exercised in a real browser against a live Postgres database (Supabase) as Super Admin, Teacher, Student, and Parent: login (email + phone), role-scoped navigation and RBAC redirects, Student 360 profile (all tabs), batch attendance marking, homework grading, Academic Structure CRUD, staff user creation (Settings → Users, confirmed it also creates the linked Teacher record), and full Student creation (basic + academic info, redirects into the new profile). Seed data loads cleanly (`npm run prisma:seed`).

Four real bugs were found and fixed during this verification pass — noted here in case similar patterns get reused in Phase 2/3:
1. Nav icons were stored as Lucide component references in `nav-config.ts`, which is built server-side and passed into the client-side `DashboardShell` — function values aren't serializable across that boundary. Fixed by storing string `IconKey`s in the config and resolving them to components only inside the client `icon-map.tsx`.
2. `DataTable`'s clickable-row overlay (`<Link className="absolute inset-0">`) was being visually covered by a `position: relative` wrapper around the cell content, which silently swallowed clicks. Fixed by removing the unnecessary `relative` class so the overlay stays on top.
3. The sign-out button was a `<button type="submit">` inside a `<form action={signOutAction}>`, itself inside a Radix `DropdownMenuItem`. The dropdown's own close-on-select behavior interfered with the native form submit. Fixed by calling `signOutAction()` directly from `DropdownMenuItem`'s `onSelect`, instead of wrapping it in a form.
4. The Student creation form's optional Gender field (a native `<Select name="gender">` submitted via a plain HTML form) always submits `""` when untouched, but `z.enum([...]).optional()` only treats `undefined` as "absent" — `""` failed enum validation. Fixed with `z.preprocess((v) => (v === "" ? undefined : v), z.enum([...]).optional())`. Worth checking for the same pattern if Phase 2/3 add more optional-enum fields to native (non-EntityDialog) forms.

### Features Completed

**Auth & RBAC**
- Credentials login by email **or** phone number, JWT sessions (NextAuth v5)
- Edge-safe middleware route protection: unauthenticated users redirected to `/login`; each role confined to its own top-level section (`/admin`, `/teacher`, `/student`, `/parent`, `/counselor`)
- Server-side role scoping on every mutation (`requireRoleSession`, `assertCanManageBatch`) — never trusts client-supplied role claims
- Shared detail routes (`/students/[id]`, `/parents/[id]`, `/teachers/[id]`, `/batches/[id]`) scope their own data per viewer role instead of duplicating pages per role

**People management**
- Students: full profile (basic + academic info), list with search/filter/pagination, Student 360 page (Overview, Attendance, Homework, Tests*, Classes, Recordings, Study Material, Payments*, Performance*, Parent Reports*, Communication*, Internal Notes) — `*` tabs render a "coming in Phase 2/3" state, not fake data
- Parents: profile, multi-child linking (via Student profile), list
- Teachers: profile, batch/subject assignments
- Admission Counselors: staff account + profile exist; dashboard shows a Phase 3 notice (no Leads CRM yet)
- Staff user management (Settings → Users): create Admin/Teacher/Counselor/Super Admin accounts, activate/deactivate
- Read-only Roles & Permissions view (Settings → Roles), seeded RBAC data

**Academic structure**
- Academic Levels, Boards, Groups, Programs, Subjects — full CRUD with active/inactive toggling

**Batches**
- CRUD, capacity, status lifecycle (Upcoming/Active/Completed/Archived)
- Batch dashboard: student count, attendance rate, upcoming class, teacher list
- Roster management (add/remove students), teacher assignment, subject assignment

**Scheduling & live classes**
- Master timetable (per-batch and a global cross-batch view), auto-surfaced on Student/Parent/Teacher dashboards and timetable pages
- Live class scheduling with provider-agnostic meeting links (Zoom/Google Meet/Custom), status lifecycle (Upcoming/Live/Completed/Cancelled)
- "LIVE NOW — Join Class" surfaced on Student and Parent dashboards

**Attendance**
- Teacher/Admin marks Present/Absent/Late/Excused per live class
- Per-student and per-batch attendance rate calculations, attendance history

**Homework**
- Create (with due date, max marks, attachment link), auto-generates a submission row per enrolled student
- Student submission (link + comments), teacher grading (marks + feedback + Reviewed/Resubmission-Requested)
- Progress counts (Total/Submitted/Reviewed) on batch and teacher views

**Study material & recordings**
- Study material organized by Academic Level → Subject → Chapter, scoped to a student's own level
- Recordings scoped to batch/subject, surfaced to students by subject

**Dashboards**
- Admin: active/trial student counts, active batches, average attendance, today's classes — with clearly labeled Phase 2/3 placeholders (at-risk, revenue, leads) instead of fake numbers
- Teacher: today's classes with Start Class, homework pending review, assigned batches
- Student: today's class + Join, pending homework, attendance/homework progress bars
- Parent: child switcher (multi-child support), attendance/homework snapshot, upcoming classes, link to full Student 360 profile
- Counselor: Phase 3 notice

**Cross-cutting**
- Responsive `DataTable` (real table ≥768px, stacked cards on mobile) used on every list
- Loading is implicit via Next.js server components; explicit `EmptyState`/`ErrorState`, `ConfirmDialog` on destructive actions
- `AuditLog` table + `logAudit()` helper called on every create/update/delete of a core entity
- Search + filter + pagination on Students, Batches, Parents

### Database Migrations Added

- `20260904130254_init` — full Phase 1–3 schema (see "Schema-only" section below for what's not yet wired to UI)

### APIs Added

- `POST/GET /api/auth/[...nextauth]` — NextAuth session/credentials endpoint
- No public REST API yet. All Phase 1 mutations go through Next.js Server Actions (colocated under each route's `actions.ts`), which call a shared `src/lib/services/*` layer — that service layer is what a future `/api/v1/*` (for a mobile app) would call, without needing to touch business logic.

### Environment Variables Required

See `.env.example` / README "Environment Variables" table: `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL` are required. `WHATSAPP_API_TOKEN`, `ZOOM_API_KEY`/`ZOOM_API_SECRET`, `PAYMENT_GATEWAY_KEY` are reserved names for Phase 2/3 integrations — not read anywhere yet.

### Schema Defined but Not Yet Built (by design — see the approved Phase 1 plan)

These Prisma models exist (so Phase 2/3 don't need risky migrations later) but have **no UI or business logic** yet:

- **Phase 2**: `Test`, `TestQuestion`, `TestAttempt`, `TestResult`, `StudentPerformance`, `PaymentPlan`, `Payment`, `Installment`
- **Phase 3**: `Lead`, `LeadActivity`, `LeadFollowup`, `Assessment`, `Trial`, `Announcement`, `Notification`, `ParentReport`, `CommunicationLog`
- **Future-ready stubs**: `Referral`, `Badge`, `StudentPoint`, `SupportTicket`, `AIInteraction`

### Known Issues / Limitations

- No automated test suite yet (manual verification checklist below) — recommend adding integration tests before Phase 2 if the team grows.
- `EntityDialog`'s select fields submit via Radix's hidden-input `name` support; a couple of very old browsers may not support this — not a concern for the target audience (modern mobile browsers).
- Live class "Join" just opens the stored meeting link in a new tab — no in-app video, no real Zoom/Meet API integration (attendance is still marked manually by the teacher). This is intentional for Phase 1; see `MeetingProvider` enum for where a real integration would plug in.
- Study material/recordings use plain URL fields (e.g. a Google Drive link) rather than file upload/storage — acceptable for Phase 1, would need an object-storage integration (S3/Supabase Storage) to support direct uploads.
- Seed data's login emails are auto-generated per run; see README for how to find one via Prisma Studio.
- `next build` currently shows a harmless compiler warning about `bcryptjs` referencing Node APIs — it comes from a trace into the Node-only `auth.ts`, not the Edge-bundled `auth.config.ts`/middleware, and does not affect the build (exit code 0, all 30 routes compiled).

### Features Planned for Phase 2

- Test system: creation, question bank (MCQ/Short/Long/Numerical), student attempts, auto-grading for MCQs, manual grading for subjective questions, results/analytics
- Performance Engine: configurable weighted score (Attendance/Homework/Tests/Participation), historical trend, subject breakdown
- At-Risk Detection: configurable rule engine (attendance/homework/test thresholds), At-Risk dashboard with suggested actions, surfaced on Admin/Teacher dashboards and Student 360
- Payments: payment plans, installments, manual payment recording (Bank Transfer/Raast/Easypaisa/JazzCash/Cash), pending/overdue tracking, revenue reports

---

## Phase 2 — Tests, Performance Engine, At-Risk Detection, Payments

**Status: Complete and verified.** `npx tsc --noEmit` and `npx eslint .` pass clean; `npm run build` passes clean. Inspected the existing codebase before starting (see the approved Phase 2 plan) and extended it rather than rewriting — reused the Phase 1 service/action/shared-component patterns throughout, and found + fixed one pre-existing gap (`Test` was missing its `AcademicLevel` relation) before building on it. Verified end-to-end in a real browser against the live Supabase database: an Admin created no new test (used the seeded ones), graded a pending subjective answer and watched the class average/Admin dashboard "Average Test Score" recompute live; a Student logged in, took the seeded ACTIVE test under the live countdown, submitted, and it auto-graded + landed in the teacher's grading queue correctly; a Participation score was recorded from a batch roster; a Payment was recorded against a specific installment on the Student 360 Payments tab and correctly resolved to "Partially Paid" (this caught and fixed a real bug — see below).

**Bug found and fixed during this phase's verification:**
`payments.recordPayment` originally summed *all* payments on a plan and compared that to a *single* installment's amount to decide PAID vs PARTIALLY_PAID — with more than one installment, a later installment could be wrongly marked PAID after only a small payment, because the `Payment` model had no link back to a specific `Installment`. Fixed by adding `Payment.installmentId` (migration `add_payment_installment_link`) and scoping the "how much has been paid toward this installment" aggregation to that installment specifically. Verified by recording a Rs 4,000 payment against a Rs 10,000 installment and confirming it now shows "Partially Paid" rather than "Paid".

### Features Completed

**Tests**
- Test creation (name, level, subject, chapter, batch, total/passing marks, duration, date window) from a batch's new **Tests** tab
- Question bank: MCQ (with options + correct answer), Short Answer, Long Answer, Numerical — add/edit/delete, reorder by creation order
- Full student-facing timed test-taking flow (`/student/tests` → `/student/tests/[id]`): instructions + Start, live countdown from `durationMinutes` that auto-submits at zero, resumes correctly on refresh (countdown is derived from `attempt.startedAt`, not client state)
- Auto-grading for MCQ and Numerical (exact match) on submit; Short/Long Answer queue for manual grading
- Teacher/Admin grading UI (`/tests/[id]` → Attempts & Grading) with per-question marks entry, matching the Homework grading pattern
- Results tab: class average/highest/lowest, per-student marks table
- Shared `/tests/[id]` detail route, RBAC-scoped like `/batches/[id]` (staff always; teacher only if assigned to the test's batch)

**Performance Engine**
- Configurable weights (Attendance/Homework/Tests/Participation, must sum to 100) and category thresholds via Settings → Performance Rules
- `calculateStudentPerformance`: pulls real attendance %, homework completion %, test average %, and latest participation score; missing components (no tests yet, no participation recorded yet) are excluded and the remaining weights renormalized rather than counted as zero
- Participation Score: teacher manually records a 0–100 score per student from the batch roster (real data, not derived from other metrics — per explicit decision, since Phase 1 has no independent participation signal)
- Historical snapshots stored in `StudentPerformance`, shown with trend history on Student 360 → Performance
- "Recalculate" is a manual staff/teacher-triggered action (no cron infrastructure exists yet — noted as a Known Issue below)

**At-Risk Detection**
- Rule engine: a student is flagged AT_RISK if attendance/homework/test averages breach configured thresholds, **regardless of overall score** — this override matches the spec's explicit rule engine (distinct from the general 4-tier score category)
- `/admin/at-risk`: Student, Batch, Score, Reason(s), Suggested Action (Contact Parent / Send Reminder / Teacher Review, mapped from the specific breached metric) — matches the spec's example table
- Surfaced on Admin dashboard (count + top 5), Teacher dashboard (scoped to their own batches only)

**Payments**
- Payment Plans: total fee split into N even monthly installments from a first due date
- Recording payments (amount, method, reference number) against a specific installment or as a general plan payment, from Student 360 → Payments
- Installment status: Paid / Partially Paid / Pending / Overdue (Overdue computed from due date, not a stored cron-updated value)
- `/admin/payments`: pending/overdue installments across the academy + recent payments + stat cards (Pending Amount, Overdue Amount, Collected This Month)
- Admin dashboard: real Pending Payments and (via the same summary) revenue visibility

**Dashboards updated from Phase 1 placeholders to real data**
- Admin: At-Risk Students (count + list), Average Test Score, Pending Payments — all real
- Teacher: Students Needing Attention (real, scoped to their batches), Upcoming Tests (real count)
- Parent: Overall Status now uses the real `StudentPerformance.category` when a snapshot exists (falls back to the Phase 1 attendance/homework heuristic otherwise), Payment Status real, a new Recent Test Results card

### Database Migrations Added

- `20260904140735_phase2_performance_payments_activation` — `Test.academicLevel` relation fix, new `ParticipationScore` and `PerformanceConfig` models
- `20260904143828_add_payment_installment_link` — added `Payment.installmentId` (the bug fix above)

### APIs Added

None — Phase 2 follows the Phase 1 pattern (Server Actions calling `src/lib/services/{tests,performance,participation,payments}.ts`), no public REST surface yet.

### Environment Variables Required

None new.

### Known Issues / Limitations

- No scheduled/cron recalculation: Performance snapshots and Installment `OVERDUE` status are computed on read or via a manual "Recalculate" action, not on a timer. Fine for Phase 2's manual-workflow scope; would need a real job scheduler (not present in this stack) before automating.
- A `Test`'s `academicLevelId` is a separate field from its `batchId`-implied level (the batch already determines the level) — kept as its own field to match the spec's explicit "Academic Level" field on tests, but the two aren't validated against each other yet.
- Grading a subjective answer awards marks per-question but there's no rubric/comment field yet (Homework has `teacherFeedback`; Tests don't) — straightforward to add in Phase 3 if needed.
- `revalidatePath` after payment/grading actions is scoped to the specific pages known to need it; a handful of secondary views (e.g. another student's `/admin/payments` row) refresh on next natural navigation rather than instantly.

### Features Planned for Phase 3

- Leads CRM: pipeline, lead activities/follow-ups, assessments, trial tracking (Counselor role currently shows a "Phase 3" notice)
- Announcements (targeted to level/batch/parents/teachers) and an in-app Notifications system
- Parent Reports: generated weekly/monthly summaries (attendance, homework, tests, teacher feedback, weak areas, next-week goal)
- Communication Log (WhatsApp/call/email history)
- Real integrations become relevant here too: WhatsApp/SMS delivery for notifications, and finally wiring the `MeetingProvider` enum to real Zoom/Google Meet APIs

---

## Phase 3 — Leads CRM, Announcements, Notifications, Parent Reports, Communication Log

**Status: Complete and verified.** `npx tsc --noEmit` and `npx eslint .` pass clean; `npm run build` passed clean earlier in the phase. This closes out the full original spec — every module named in the project brief now has real, working functionality; nothing left behind a "coming in a later phase" placeholder. Verified end-to-end in a real browser against the live Supabase database, logged in as Super Admin and as a seeded Parent: opened a lead and worked it through Activities → Follow-ups (add + complete) → Assessment (confirmed the stage auto-advanced from Assessment Booked to Assessment Completed) → Trial (start + update classes attended/engagement notes, confirmed stage auto-advanced to Free Trial) → Convert to Student (confirmed a real Student record was created and the lead now links to it); created a batch-targeted Announcement and confirmed it appeared on that batch's Announcements tab and generated Notifications (bell badge, dropdown, mark-all-read all confirmed, including from the Parent's own dashboard); generated a Parent Report, added Teacher Feedback/Weak Areas/Next Week Goal, marked it Sent, and confirmed it displays on both Student 360 and the Parent's own dashboard; logged a Communication entry and confirmed it shows on the Student's Communication tab and rolls up onto the linked Parent's profile.

Inspect-first findings before this phase: every Phase 3 Prisma model (`Lead` and its children, `Announcement`, `Notification`, `ParentReport`, `CommunicationLog`) already existed from Phase 1 with correct relations — only `CommunicationLog` was missing a link back to the `Student` it's about, which blocked the Communication tabs already sitting on `/students/[id]` and `/parents/[id]`. Fixed with an additive migration (`Payment`-style pattern: nullable FK, no data loss) rather than reworking anything.

**Mid-phase database incident**: while migrating, discovered the Supabase database had lost all rows and its entire `_prisma_migrations` tracking table, even though the table *structure* still matched the end of Phase 2 — something happened on Supabase's side between sessions, not caused by any command run in this session (confirmed no destructive commands preceded it). Repaired by rebuilding migration history and reseeding; flagged to the user before proceeding since nothing in the session should have caused it.

**Bugs found and fixed during this phase's verification pass:**
1. `leads/[id]/overview-tab.tsx` defined an `EntityDialog` with an inline `onSubmit={(data) => updateLeadAction(lead.id, data)}` closure but was missing `"use client"` — the same "Server Component closure passed to Client Component" bug class already hit twice in Phase 1 (nav icons) and Phase 2 (test status select). Confirmed via the browser console error and fixed by adding the directive; proactively checked every other new Phase 3 client-interactive file and confirmed none had the same oversight.
2. `logAudit()` let a failed `db.auditLog.create()` throw uncaught, which crashed the *entire* calling Server Action — discovered when a stale-but-otherwise-valid session's `actorId` no longer matched any `users` row after a database reset, and every write that logged an audit entry (`convertLeadToStudentAction`, `createAnnouncementAction`) started 500-ing after actually completing its real work. Because the action never returned success, retrying the click re-ran the whole thing, silently creating duplicate Students and duplicate Announcements (with duplicate Notifications) each time. Fixed by wrapping the `db.auditLog.create()` call in a try/catch that logs and swallows — audit logging is now correctly best-effort and can never block or duplicate a primary action.
3. `leadService.convertLeadToStudent` had no guard against converting an already-converted lead — combined with bug #2, this is what produced the duplicate Student records. Fixed by checking `lead.convertedStudentId` first and returning the existing Student if already converted, making the action properly idempotent.

The duplicate demo rows these bugs produced during testing (extra "Eshal Butt" students, triplicated "Extra Practice Session" announcements/notifications) were cleaned up with a final `npm run db:reset` + reseed rather than hand-editing the database — the same recovery method already used earlier in this phase.

### Features Completed

**Leads CRM**
- Full pipeline (`NEW` → ... → `ENROLLED`/`LOST`) with stage changes, search/filter by stage and counselor
- `/admin/leads` (all leads, counselor filter) and `/counselor/leads` (own leads only) — same shared `/leads/[id]` detail route as the Batch/Test/Student pattern, RBAC-scoped (staff always; counselor only if assigned)
- Lead detail tabs: Overview (contact info, stage, weak subjects, notes), Activities (timeline), Follow-ups (schedule/complete, overdue highlighted), Assessment (diagnostic score + recommended program), Trial (batch assignment, classes attended, engagement notes, enrollment status)
- **Convert to Student**: once a lead reaches Counselling/Payment Pending/Enrolled, staff/counselor can convert it directly into a real `Student` record (reuses the same `studentService.createStudent` Phase 1 already built) — the lead links to the new student and is traceable both ways

**Announcements & Notifications**
- `/admin/announcements`: create, targeted at All Students / a specific Academic Level / a specific Batch / Parents / Teachers
- Publishing an announcement automatically creates an in-app `Notification` for every matched user — this is the one place in the app where a "reminder" type notification is actually generated automatically (everything else stays manual-trigger, per the no-cron-infrastructure limitation noted in Phase 2)
- Notification bell in the dashboard topbar (all roles): unread badge, dropdown list, mark-one/mark-all read
- Every dashboard (Admin, Teacher, Student, Parent) shows an Announcements card scoped to what that viewer's audience should see; Batch detail gets its own Announcements tab (batch-scoped, teacher of that batch can post)

**Parent Reports**
- "Generate Report" (staff/teacher, manual-trigger like Phase 2's Performance Recalculate) snapshots the last 7 days' attendance %, homework completion %, and latest performance score into a `ParentReport`
- Staff then fills in Teacher Feedback / Weak Areas / Next Week Goal and marks it Sent
- Visible on Student 360 → Parent Reports (full management) and the Parent's own dashboard (read-only)

**Communication Log**
- Staff logs a communication (Call/WhatsApp/Email/SMS/In Person, subject, summary) from Student 360 → Communication
- Rolls up onto the linked Parent's profile page across all their children

**Fixed while touching these pages**: the Student dashboard's Academic Performance card and the Parent profile's Payment History section were still showing their original Phase 1 "coming in Phase 2" placeholders — both were live features by the time Phase 2 shipped but never got updated. Wired to real data now.

### Database Migrations Added

- `20260904150000_phase3_leads_announcements_reports` — `CommunicationLog.studentId`, `Lead.convertedStudentId`

### APIs Added

None — same Server Actions + `src/lib/services/{leads,announcements,notifications,parent-reports,communication}.ts` pattern as Phase 1/2.

### Environment Variables Required

None new.

### Known Issues / Limitations

- No real WhatsApp/SMS/email delivery — Notifications and Communication Logs are in-app records only, exactly as scoped from Phase 1 onward. Wiring a real provider needs API credentials the project doesn't have.
- No scheduled/cron generation of reminder-type notifications (`CLASS_REMINDER`, `HOMEWORK_REMINDER`, etc.) — same limitation as Phase 2's Performance recalculation, would need a real job scheduler.
- `Lead.convertedStudentId` links a lead to its resulting student, but "Convert to Student" doesn't currently backfill a `PaymentPlan` or batch enrollment — an admin still does those as a normal follow-up step from the new student's profile.
- Parent Reports use a fixed 7-day lookback window; making the period adjustable (vs. spec's "weekly/monthly") would be a small follow-up if needed.
- Pre-existing since Phase 2, noticed while touching the Payments tab in this pass: passing a `PaymentPlan`/`Installment` straight from a Server Component to a Client Component logs a dev-only "Decimal objects are not supported" warning (Prisma's `Decimal` type isn't a plain object). It renders correctly today because `Decimal` serializes itself via `toJSON`, but converting these to plain numbers/strings before crossing the Server→Client boundary would remove the warning and is safer long-term.

### Features Planned for Future Phases

Every module in the original spec is now built. Natural next steps if the academy wants to keep going: real WhatsApp/Zoom API integrations (architecture is ready — see `MeetingProvider`/`NotificationType` enums), a job scheduler for automatic reminders, file uploads for study material/recordings instead of pasted links, and the "future-ready" stub models already in the schema (`Referral`, `Badge`/`StudentPoint` gamification, `SupportTicket`, `AIInteraction`).

---

## Phase 4A — Automation Engine, WhatsApp Architecture, Communication Center

> **Naming note:** the request that started this phase called it "Phase 2," but the project already has a Phase 2 (Tests/Performance/Payments, above). This is genuinely the fourth phase of work on this codebase, so it's numbered Phase 4 here to keep `PHASE_COMPLETION.md` internally consistent. The full request (automation + WhatsApp + analytics + gamification + referrals + support) was too large to build and properly verify in one pass — see the approved plan for the reasoning — so it was split into 4A (this phase: automation + communication backbone), 4B (analytics), and 4C (gamification/referrals/support/engagement). 4B and 4C have not been started.

**Status: Complete and verified.** `npx tsc --noEmit`, `npx eslint .`, and `npm run build` all pass clean (52 routes). Inspected the existing codebase first (schema, service/action patterns, RBAC helpers, nav config) per the standing rule and extended it rather than rewriting — every new automation/WhatsApp/communication feature reuses an existing service function where one already existed (`performanceService`-style config-singleton pattern for `AutomationRule`, `parentReportService.generateParentReport` called by the new weekly-report job instead of being reimplemented, `leadService.addLeadFollowup`/`changeLeadStage` reused by the trial-expiry and lead-followup jobs, `notificationService` used as-is alongside the new WhatsApp channel).

Verified end-to-end in a real browser against the live Supabase database, logged in as Super Admin:
- **Event-driven automation**: marked the same student ABSENT twice in a row across two different live classes and confirmed (after first proving the *negative* case correctly did nothing when the two most recent records weren't both absent) that a fresh `AutomationLog` entry appeared — "2 consecutive absences — notified teacher, parent, and admin" — and a `WhatsAppMessage` was queued and sent through the console provider.
- **Scheduled jobs**: ran every job via `npm run jobs:run` (which calls `/api/cron/[job]` — confirmed that route rejects a request with no bearer token with 401, and accepts the correct `CRON_SECRET`) against the seeded database: Payment Reminders correctly flagged 25 overdue installments, Student Inactivity correctly flagged 8 students with no recent login, and Weekly Parent Report correctly generated and sent 17 reports (reusing the exact Phase 3 report-generation function) — all visible in the Automation Activity Log with the student/action/status columns the request specified, and all 24 resulting WhatsApp messages visible in the Communication Center with correct per-status counts.
- **Settings**: edited the Low Test Performance threshold on Automation Rules and confirmed the new value persisted across a reload; toggled a user's WhatsApp notification preference off and confirmed it persisted.
- Confirmed `middleware.ts`'s new `/api/cron` bypass doesn't weaken auth elsewhere — every other route still redirects an unauthenticated request to `/login` as before.

**Bug found and fixed during this phase's verification:** the `server-only` package (imported by nearly every service file since Phase 1) was never actually an installed dependency — it happened to work only because Next.js's webpack build has an internal alias for it, which is undocumented behavior, not something the package guarantees. This surfaced when `scripts/run-jobs.ts` tried to import the job functions directly in a plain Node process: `server-only`'s real conditional-exports behavior throws unless the special "react-server" build condition is active, so a bare Node/tsx script can never safely import anything in the `src/lib/services` chain. Fixed two ways: (1) installed `server-only` for real as a proper dependency (harmless — Next.js's webpack still resolves it via the correct condition for server bundles, so nothing about the existing build changed), and (2) redesigned the local job runner to call `/api/cron/[job]` over HTTP instead of importing job code directly — which also means there is now exactly **one** code path that ever executes a job (whether triggered by `npm run jobs:watch` locally or a real external scheduler in production), not two that could drift apart.

### Features Completed

**Automation Engine**
- 8 typed automation rules (the 7 from the spec, plus Class Reminders), each an `AutomationRule` row with an `isActive` toggle and a `config` JSON blob of its own tunable thresholds — edited from one admin page (Settings → Automation Rules) rather than a generic no-code rule-builder UI (a deliberate scope simplification — see the approved plan's "Scope Simplification" note)
- Every rule firing writes an `AutomationLog` row (rule, student/lead, action taken, status, timestamp) — the **Automation → Activity Log** admin page is exactly the "Automation | Student | Triggered At | Action | Status" table the spec asked for
- **Rule 1 — Student Misses Class**: event-driven, hooked into `batches.ts`'s existing `markAttendance()`. 2 consecutive absences (configurable) → notifies teacher + parent + admin, logged
- **Rule 2 — Homework Overdue**: scheduled job. Immediate student reminder → teacher notified after 2 days (configurable) → parent notified after 5 days (configurable)
- **Rule 3 — Low Test Performance**: event-driven, hooked into `tests.ts`'s auto-grading (`submitTestAttempt`) and manual grading (`gradeSubjectiveAnswers`) paths. Below-40% (configurable) → flags for teacher review; repeated (configurable count) → notifies parent
- **Rule 4 — Payment Reminders**: scheduled job. 5 days before due (configurable) → parent reminder; on due date → reminder; 3+ days overdue (configurable) → admin follow-up, all read from the existing `Installment` table
- **Rule 5 — Student Inactivity**: scheduled job. No login for 7+ days (configurable, using the existing `User.lastLoginAt`) → notifies student + parent + admin engagement view
- **Rule 6 — Trial Expiry**: scheduled job. Trial end date passed → sets `Trial.enrollmentStatus` to Completed, moves the `Lead` to Payment Pending, auto-creates a counselor follow-up (reusing Phase 3's `LeadFollowup`), notifies the counselor
- **Rule 7 — Lead Follow-up**: scheduled job. No `LeadActivity` for 5+ days (configurable) on an open-stage lead → auto-creates an overdue `LeadFollowup`, notifies the counselor (or admin if unassigned)
- **Class Reminders**: scheduled job (5-minute cadence), configurable 24h/1h/30m offsets and whether parent/teacher are also notified, guarded so each class+offset only fires once
- **Weekly Parent Report automation**: scheduled job that calls the *existing* Phase 3 `generateParentReport()` for every active student, then sends the report via notification + WhatsApp — the manual "Generate Report" button on Student 360 is untouched and still works for on-demand use

**Background Jobs**
- `src/lib/jobs/*.ts` — one pure function per scheduled job, each writing its own `AutomationLog` entries (including `SKIPPED` rows when a rule is toggled off, useful for debugging)
- `POST /api/cron/[job]` — the production entry point, authenticated by a `CRON_SECRET` bearer token checked inside the route (not session-based), designed to be called by any external scheduler (Vercel Cron, a host crontab, Windows Task Scheduler + curl, GitHub Actions) without caring which one
- `npm run jobs:run` / `npm run jobs:watch` — a local dev runner (`scripts/run-jobs.ts`) that calls the same `/api/cron/[job]` route; `watch` uses `node-cron` to fire every job on its real cadence and stays alive, so automation runs on its own on a local/self-hosted machine without needing a production host configured

**WhatsApp Integration Architecture**
- `WhatsAppProvider` interface (`src/lib/whatsapp/provider.ts`) with three implementations: `ConsoleWhatsAppProvider` (default — logs and records the message, since no real WhatsApp Business API credentials exist for this project), and scaffolded `MetaCloudApiProvider`/`TwilioWhatsAppProvider` behind the same interface, selected via `WHATSAPP_PROVIDER`
- `WhatsAppMessage` model tracks recipient, template, related entity, and status (`QUEUED`/`SENT`/`DELIVERED`/`READ`/`FAILED`) with timestamps for each transition
- `MessageTemplate` model with the 11 named templates from the spec, `{{variable}}` substitution, and an admin management page (Settings → Message Templates) to edit wording or deactivate a template without touching code
- Wired into: lead creation (`LEAD_WELCOME`), announcement publishing (`ANNOUNCEMENT`, respecting per-user preference), and every automation rule above that has a parent/counselor-facing message

**Communication Center**
- `/admin/communication` — WhatsApp (live data: Sent/Delivered/Failed/Pending counts + message list), Email (clearly labeled "not connected yet," see Known Issues), SMS (clearly labeled "future-ready"), Notifications (academy-wide list), Announcements (reuses Phase 3), Communication Logs (reuses Phase 3)

**Notification Preferences**
- `/settings/notifications` (every role) — per-user WhatsApp/Email/SMS toggles for non-critical notifications; `PAYMENT_REMINDER`, `PERFORMANCE_ALERT`, and `ATTENDANCE_ALERT` are hardcoded critical and bypass the preference, per the spec ("critical parent alerts can remain academy-controlled")

**Automation Settings**
- `/admin/settings/automation` — one card per rule with its active toggle and threshold fields, same direct-form pattern as the existing Performance Rules settings page

### Database Migrations Added

- `20260904164925_phase4a_automation_whatsapp_communication` — `AutomationRule`, `AutomationLog`, `MessageTemplate`, `WhatsAppMessage`, `CommunicationPreference`
- `20260904170536_phase4a_notification_types` — added `ATTENDANCE_ALERT`, `INACTIVITY_ALERT`, `FOLLOWUP_ALERT` to `NotificationType` (additive; the only previously-used value, `ANNOUNCEMENT`, is untouched)
- `20260904170805_phase4a_weekly_report_rule` — added `WEEKLY_PARENT_REPORT` to `AutomationRuleKey`

### APIs Added

- `POST /api/cron/[job]` — see Background Jobs above. Otherwise the existing Server Actions + `src/lib/services/{automation,whatsapp,message-templates,communication-preferences,automation-recipients}.ts` pattern.

### Environment Variables Required

All optional — the app is fully functional without any of them (console WhatsApp provider, jobs runnable via `npm run jobs:run` once `CRON_SECRET` is set for that local call path):

| Variable | Purpose |
|---|---|
| `CRON_SECRET` | Bearer token required to call `/api/cron/*` (from an external scheduler or the local `npm run jobs:*` scripts) |
| `WHATSAPP_PROVIDER` | `console` (default) \| `meta` \| `twilio` |
| `META_WHATSAPP_TOKEN`, `META_WHATSAPP_PHONE_ID` | Only read if `WHATSAPP_PROVIDER=meta` |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` | Only read if `WHATSAPP_PROVIDER=twilio` |

### Known Issues / Limitations

- No real WhatsApp delivery — the console provider records and logs every message but doesn't reach a real phone. Meta Cloud API and Twilio providers are written and ready; they just need real credentials in `.env`.
- Email has no `EmailMessage` model or send path yet — the Communication Center's Email tab is a clearly-labeled placeholder. None of Phase 4A's automation rules attempt to send email; everything routes through WhatsApp + in-app notifications. Adding real email is a self-contained follow-up (mirror the `WhatsAppMessage`/provider pattern).
- SMS is schema-only (a preference flag exists; no provider).
- The "flexible" automation architecture is 8 fixed, typed rules with configurable thresholds, not a generic trigger/condition/action rule builder — see the approved plan's "Scope Simplification" note for the reasoning.
- Background jobs depend on something actually calling them on a schedule — either `npm run jobs:watch` running locally, or a real external scheduler hitting `/api/cron/[job]` in production. Neither is running by default; this is infrastructure the user (or a deployment) needs to turn on.
- Class Reminders' guard against re-firing depends on `AutomationLog` lookups scoped by rule+marker, same pattern as every other rule; the job needs to run at least every `WINDOW_MINUTES` (15) to reliably catch each offset.

### Features Planned for Phase 4B / 4C

- **4B — Advanced Analytics**: Business Metrics, Lead Funnel with conversion %, Marketing Analytics (source/campaign), Retention Analytics, Academic Analytics, Question Analytics, Performance Trends, Teacher Analytics, Counselor Dashboard improvements.
- **4C — Gamification, Referrals, Support & Student Success**: Points/Badges/Leaderboard, Referral codes/links/rewards, Support Tickets with conversation threads, Engagement Score, Intervention Workflow. These will lean on 4A's `dispatchAlert`/WhatsApp plumbing once built.

---

## Phase 4B — Advanced Analytics

**Status: Complete and verified.** `npx tsc --noEmit`, `npx eslint .`, and `npm run build` all pass clean (52 routes, `/admin/analytics` at 120 kB — the only page that pulls in the new charting library). Inspected the codebase first (existing `pipelineSummary`/`testResultStats`/`listAtRiskStudents`/`paymentsSummary`/`getPerformanceHistory` functions, the exact `TestAttempt.answers` JSON shape, and — critically — confirmed no field anywhere records *when* a student's status changed) before writing anything, per the approved plan.

Verified end-to-end in a real browser against the live Supabase database, logged in as Super Admin and as the seeded Counselor: all 5 `/admin/analytics` tabs render real, cross-checked numbers (Business tab's Outstanding Payments matched `/admin/payments`'s Pending figure exactly; Marketing tab correctly surfaced "Back to School 2026" as the best-performing campaign from seeded data); opened a graded test's Results tab and confirmed Question Analytics correctly sorts hardest-first, flags sub-40% questions "Difficult," and correctly excludes an ungraded subjective answer from that question's average while still counting it in "total answers"; opened a teacher's new Analytics tab and confirmed real classes-conducted/attendance/homework-review numbers; logged in as the Counselor and confirmed the pipeline now shows conversion percentages plus new Trials Ending Soon and Payment Pending cards.

**Bug found and fixed during this phase's verification:** `SimpleBarChart` (a new Client Component) originally accepted a `colorOf` **function** prop so callers could color each bar by value (e.g., red for a low attendance rate). `AcademicTab` is a Server Component, and passing a function from a Server Component into a Client Component throws at render — the same "closure can't cross the Server→Client boundary" bug class hit repeatedly in earlier phases, this time via a data-transform callback instead of an event handler. Fixed by moving the color decision to the Server Component: `AcademicTab` now pre-computes a `color` string into each data row before handing it to the chart, and `SimpleBarChart` takes a `colorKey` (a field name) instead of a function.

### Features Completed

**Business Metrics & Lead Funnel** (`/admin/analytics` → Business tab)
- Total Leads, Total Trials, Total Enrollments, Conversion Rate, Collected This Month, Outstanding Payments, Expected Revenue, Retention Rate — reusing `paymentsService.paymentsSummary()` rather than recomputing a second, potentially-diverging number
- Monthly Revenue trend (last 7 months, from real `Payment` records) as a line chart
- Lead Funnel bar chart with per-stage "% reached" conversion — since `Lead` only stores its *current* stage (no stage-history table), "reached stage N" is inferred as "currently at stage N or later," which the plan flags explicitly as an approximation rather than true historical funnel tracking

**Marketing Analytics** (Marketing tab)
- Leads/enrollments/conversion % grouped by `Lead.source` and by `Lead.campaign`, with a "best performing campaign" callout (minimum 3-lead threshold to avoid noise)
- Ad Spend/CPL/CAC deliberately **not** added as empty schema fields — there's no `Campaign` model or cost-input UI anywhere in scope, so unused columns nobody can fill in would be pure scaffolding (see Known Issues)

**Retention Analytics** (Retention tab)
- New `Student.statusChangedAt` column, set inside `studentService.updateStudent()` **only when status actually changes** (the edit form resubmits the whole record including the unchanged status on every save, so a naive "stamp whenever status is present" would have been wrong)
- Active-at-start-of-month / new enrollments / left / retention rate / churn rate, built entirely from this one timestamp — an approximation for a student who left and re-enrolled more than once (documented, not solved with a full history table — that's materially larger scope)

**Academic Analytics** (Academic tab)
- Average attendance by batch and by subject, homework completion by batch, test performance by batch (all as bar charts)
- Best Performing Students and Students Needing Attention (the latter reuses `performanceService.listAtRiskStudents()` verbatim, linking out to the existing `/admin/at-risk` page rather than duplicating it)
- Weakest Subjects and Weakest Chapters (lowest average graded test score)

**Question Analytics** (added to the existing `/tests/[id]` → Results tab, not a new route)
- Per-question correct/incorrect % for MCQ/Numerical (reusing the exact string-match logic `tests.ts` already uses for auto-grading) and average-score-% for Short/Long Answer questions
- Sorted hardest-first, flagged "Difficult" below 40% — matches the spec's own worked example

**Performance Trends** (Trends tab)
- Last 7 days / last 30 days line charts of average Overall/Attendance/Homework/Test scores, bucketed from existing `StudentPerformance` snapshots — trend quality is only as good as how often performance has actually been recalculated (manual or the Phase 4A weekly job), noted in Known Issues

**Teacher Analytics** (new "Analytics" tab on `/teachers/[id]`, which previously had no tabs at all)
- Classes Conducted, Avg. Student Attendance, Homework Review Rate, Feedback Completion Rate, Avg. Student Performance — scoped to the teacher's actual `BatchTeacher` assignments, explicitly labeled "for operational quality monitoring — not a performance scorecard" per the request

**Counselor Dashboard improvements**
- Pipeline card now shows real conversion percentages (via the new `leadFunnel()`, shared with the admin Business tab) instead of bare stage counts
- New Trials Ending Soon card (`leadService.listTrialsEndingSoon`) and Payment Pending stat card, both scoped to the logged-in counselor

**Forward-looking instrumentation**
- New `AnalyticsEvent` model + `logAnalyticsEvent()`, wired into login, lead stage changes, and payment recording — not read by any Phase 4B report (all reports derive from real source tables for accuracy), but present as the `ANALYTICS_EVENTS` table the original spec asked for, ready for future event-driven analytics

### Database Migrations Added

- `20260904183056_phase4b_analytics` — `Student.statusChangedAt`, `AnalyticsEvent`

### APIs Added

None — same Server Actions + new `src/lib/services/analytics.ts` (and leaf module `analytics-events.ts`, split out specifically to avoid a circular import with `payments.ts`/`leads.ts`, both of which now log analytics events).

### Environment Variables Required

None new.

### Known Issues / Limitations

- Retention Analytics and the Lead Funnel's "% reached" figures are both built on single-timestamp approximations (`statusChangedAt`, current `Lead.stage`) rather than full history tables — accurate for the common case, documented as approximate for students/leads with more complex back-and-forth histories.
- Marketing Analytics has no ad spend / CPL / CAC — would need a `Campaign` model with a budget field, which nothing in this build populates yet.
- Performance Trends is only as current as the last time `StudentPerformance` was recalculated (manual, or the Phase 4A weekly job) — a database with sparse recalculation history will show a sparse or empty trend chart, not an error.
- Recharts was added as a new dependency (no charting library existed before this phase) — only `/admin/analytics` pulls it into its bundle.

### Features Planned for Phase 4C

Gamification (Points/Badges/Leaderboard), Referrals (codes/links/rewards), Support Tickets (conversation threads), Engagement Score, Intervention Workflow — leaning on 4A's `dispatchAlert`/WhatsApp plumbing and, where useful, 4B's `analytics.ts` patterns for any new reporting they need.

---

## Phase 4C — Gamification, Referrals, Support & Student Success

**Status: Complete and verified — and with this phase, every module in the original spec (Phases 1 through 4C) is built.** `npx tsc --noEmit`, `npx eslint .`, and `npm run build` all pass clean (build now covers 60+ routes). Inspected the codebase first per the standing rule: confirmed `Referral`, `Badge`, `StudentPoint`, `SupportTicket` existed only as Phase 1 schema-only stubs with zero UI and zero rows anywhere, which is what made it safe to reshape their fields (e.g. `SupportTicket.status`/`priority` from free `String` to real enums) rather than treating them as untouchable live tables.

Verified end-to-end in a real browser against the live Supabase database as Super Admin: marked through the seeded data and confirmed the Leaderboard's ranking math matches `StudentPoint` totals exactly (including badge counts); toggled a batch's `leaderboardEnabled` switch off from its Overview header and confirmed that batch's leaderboard scope correctly returned empty; created a new Badge and awarded it to a student, then confirmed it appeared on that student's Student 360 → Engagement tab; recalculated a student's Engagement Score from that same tab and confirmed the weighted score/status and its appearance on `/admin/engagement`; submitted the public `/refer/[code]` form in a fresh flow — confirmed it correctly identified the referrer by name, created a real `Lead` (via the existing `leadService.createLead()` intake path) plus a `Referral` row (status `REGISTERED`), then advanced that lead's stage to Free Trial and confirmed the linked Referral's status followed to `TRIAL` automatically; raised a Support ticket, replied to a seeded ticket, changed its status to Resolved, and confirmed both actions produced real in-app notifications (visible in the bell icon) via the same `dispatchAlert` plumbing built in 4A; ran `npm run jobs:run` and confirmed the new `engagement-scores` job processed all active students without error.

**Bug found and fixed during this phase's browser verification pass:** clicking "Send Reply" on a support ticket returned a 500 with `Foreign key constraint violated: support_messages_authorId_fkey`. Root cause: the browser tab's session cookie was left over from *before* a `db:reset` run earlier in this same work session — NextAuth's JWT session strategy only checks the token's signature, not whether the user id inside it still exists in the database, so the app kept treating a signed-but-stale session as valid until it hit a hard foreign-key write. This was **not a Phase 4C code defect** — signing out and back in (issuing a fresh JWT with the current user id) resolved it immediately, and every other write in this phase (audit-logged actions especially) uses the same non-fatal `logAudit` try/catch pattern that would have silently no-op'd rather than crash. Noting it here because it's a real trap for local dev after any `db:reset`: **always re-login after a reset**, since old sessions look valid but reference rows that no longer exist.

### Features Completed

**Gamification** (`src/lib/services/gamification.ts`)
- Configurable `PointsConfig` (Settings → Gamification Points): points for attendance, perfect-week bonus, homework submit/reviewed, high test score (+ threshold), participation, and study streak (+ required days)
- Event hooks wired into existing services — attendance marking, homework submit/review, test grading (auto and manual), and participation recording — each awards points via `awardPointsOnce()`, a dedup guard (keyed on a `StudentPoint.reason` marker like `attendance:<liveClassId>`) so re-saving the same record never double-awards, mirroring 4A's `hasFiredRecently()` idiom
- Study Streak is computed from real `Attendance` PRESENT/LATE records (consecutive calendar days) rather than a new daily-login tracker — an explicit scope simplification
- Badges: catalog CRUD (`/admin/badges`), manual award-to-student (dedup via a `StudentBadge` unique constraint so the same badge can't be awarded twice)
- Leaderboard (`/admin/leaderboard`): scope toggle between This Month (all), by Batch, or by Level; batch scope respects a new `Batch.leaderboardEnabled` switch (small toggle in the batch header, staff-only) which fully excludes that batch's students when off

**Referrals** (`src/lib/services/referrals.ts`)
- `Student.referralCode`/`Parent.referralCode` — auto-generated on first use (`STU-`/`PAR-` prefixed), unique
- Public, unauthenticated `/refer/[code]` landing page (added to `middleware.ts`'s public-path allowlist) — greets the visitor by the referrer's first name, and on submit reuses `leadService.createLead()` directly (so the new lead gets the exact same `LEAD_WELCOME` WhatsApp message and intake pipeline as any other lead) plus creates a `Referral` row linking referrer → lead
- Referral status auto-progresses as its linked lead moves through the pipeline (`REGISTERED` → `TRIAL` on Free Trial stage → `ENROLLED` on conversion to student) — wired at the Server Action layer (`leads/actions.ts`) rather than inside `leads.ts` itself, specifically to avoid the circular-import trap hit in Phase 4B (`referrals.ts` already imports `leadService`, so a hook the other way around would cycle)
- Staff-recorded rewards (`/admin/referrals` → Grant Reward): Discount/Free Month/Bonus Class/Points/Other — Points rewards call the gamification service directly; other types are recorded but not auto-applied (no payment-gateway integration exists to apply a real discount — explicit scope simplification)
- `/admin/referrals` dashboard: Total/Registered/Trials/Enrolled/Rewards stat cards + full list
- Compact "My Referral" card (code, copyable link, mini stats) on Student and Parent dashboards

**Support Tickets** (`src/lib/services/support.ts`)
- `/support` (all roles): raise a ticket (category/subject/description/attachment URL), view own tickets
- `/support/[id]` (shared detail route, same pattern as `/leads/[id]`): threaded conversation (`SupportMessage`), staff-only status (Open/In Progress/Waiting for User/Resolved/Closed) and assignment controls
- `/admin/support`: staff triage list, filterable by status/category/priority
- New `SUPPORT_TICKET_UPDATE` notification type; ticket creation notifies all Admin/Super Admin users, and each reply notifies "the other side" (staff reply → notifies the raiser; raiser reply → notifies the assignee, or all admins if unassigned) — both via 4A's `dispatchAlert()`, so they show up in the existing notification bell with zero new UI needed
- Access control: `assertCanManageSupportTicket()` in `src/lib/access.ts` — staff always pass; anyone else only if they raised the ticket themselves

**Student Engagement & Interventions** (`src/lib/services/engagement.ts`, `interventions.ts`)
- Engagement Score: weighted 0–100 composite (attendance 25% + homework 25% + login recency 20% + test participation 15% + class participation 15%), bucketed into Highly Engaged/Engaged/Low Engagement/Inactive via fixed thresholds (not a second configurable-weights settings page — Performance already has one, and a second wasn't needed to ship a working score)
- New daily `engagement-scores` background job (`src/lib/jobs/engagement-scores.ts`, registered in the 4A job registry, callable via `/api/cron/engagement-scores`, included in `scripts/run-jobs.ts`) recalculates every active/trial student
- `/admin/engagement`: all students by engagement status, filterable, same list-page shape as `/admin/at-risk` — this is the "admin engagement dashboard" 4A's inactivity job notification text already promised but never actually built
- Interventions: create from a student's Engagement tab or directly from `/admin/at-risk` (new action column, confirmed safe to add without touching `DataTable` — its row-wide link overlay only spans the table's first column on desktop, and the mobile card-link's nested button correctly stops event propagation rather than triggering row navigation, verified in-browser on both layouts), track reason/action plan/responsible staff/review date/status, list all at `/admin/interventions`
- **Student 360** gets one new "Engagement" tab (not three) — Engagement Score card, Points & Badges summary, Interventions list all live under one roof, matching the same "related-but-distinct things together" grouping used for the Communication Center in 4A, since the profile already had 12 tabs before this phase

**Nav & Settings**
- New "Engagement" (Engagement Dashboard, Interventions) and "Gamification" (Leaderboard, Badges) sections in admin nav; "Referrals" added under Admissions; new "Support" section/link for every role (student/parent/teacher/counselor/admin)
- `/admin/settings/gamification`: `PointsConfig` form, same shape as Settings → Performance Rules

### Database Migrations Added

- `20260904190000_phase4c_gamification_referrals_support` — new models `StudentBadge`, `ReferralReward`, `SupportMessage`, `Intervention`, `EngagementScore`, `PointsConfig`; reshaped `Referral` (typed `ReferralStatus`, added `referralCode`/`convertedLeadId`/`convertedStudentId`) and `SupportTicket` (typed `SupportStatus`/`SupportPriority`, added `category`/`attachmentUrl`); additive columns `Student.referralCode`, `Parent.referralCode`, `Batch.leaderboardEnabled`, `StudentPoint.source`
- `20260904194250_phase4c_engagement_recalc_rule` — added `ENGAGEMENT_RECALC` to `AutomationRuleKey`
- `20260904195809_phase4c_support_notification_type` — added `SUPPORT_TICKET_UPDATE` to `NotificationType`

### APIs Added

None new beyond the existing `/api/cron/[job]` pattern (now also serving `engagement-scores`). Everything else is Server Actions + the new `src/lib/services/{gamification,referrals,support,engagement,interventions}.ts`.

### Environment Variables Required

None new.

### Known Issues / Limitations

- Referral rewards other than Points are staff-recorded, not auto-applied — there's no payment-gateway integration in this project to actually apply a discount or credit.
- Support ticket attachments are a pasted URL field (no file-upload infrastructure exists anywhere in the project, matching the precedent set by Homework/Study Material attachments).
- Engagement Score thresholds are fixed constants, not a second configurable-weights settings page.
- Study Streak is derived from existing Attendance records, not a dedicated daily-login tracker.
- **Local dev trap, not a product bug:** after running `npm run db:reset`, any already-open browser tab's session cookie still "looks" valid (JWT signature checks out) but references a user id that no longer exists — the first write that hits a hard foreign key (like a support reply) will fail with a Prisma FK-violation 500 until you sign out and back in.

### Original Spec: Complete

Phases 1 through 4C covered everything in the original request — Foundation, Tests/Performance/Payments, Leads CRM/Communication, Automation + WhatsApp, Advanced Analytics, and Gamification/Referrals/Support/Student Success. A new, much larger mega-spec ("Phase 3": AI + Advanced Analytics + Scalability + Production Readiness) has since arrived and was split into six sub-phases — see the Phase 3A section below for the first of these.

---

## Phase 3A — AI Foundation & Knowledge Base

**Status: Complete and verified.** `npx tsc --noEmit`, `npx eslint .`, and `npm run build` all pass clean (build now covers 60+ routes, including two new ones: `/knowledge-base` and `/student/study-assistant`). This is the first of six sub-phases the new "Phase 3" mega-spec (AI + Advanced Analytics + Scalability + Production Readiness) was split into — see the plan file for the full six-phase breakdown (3A here; 3B AI intelligence features; 3C advanced analytics/predictive risk; 3D learning experience; 3E SaaS scalability/security; 3F admin dashboards/observability/docs/production QA).

Inspected the codebase first per the standing rule: confirmed `AIInteraction` was a Phase 1 schema-only stub (zero rows, zero references anywhere in `src/`) — safe to freely reshape into a real interaction/usage-log table, same precedent as `Referral`/`Badge`/`SupportTicket` in Phase 4C. Also caught a real architectural bug **before writing any code**: the spec asked for an admin/teacher-manageable Knowledge Base at `/admin/knowledge-base`, but `src/middleware.ts`'s `SECTION_ROLES` map gates every `/admin/*` route to `SUPER_ADMIN`/`ADMIN` only — a `TEACHER` session would have been redirected away before the page even rendered, silently breaking the "teacher can upload/review" requirement. Fixed by placing the Knowledge Base at a shared top-level route (`/knowledge-base`, matching the existing pattern used by `/batches/[id]` and `/support`) where the page does its own role gating in-component instead of relying on the middleware's path-prefix gate.

Verified end-to-end in a real browser against the live Supabase database: as Super Admin, created a Knowledge Base document and approved a seeded pending one at `/knowledge-base`; logged in as a seeded Teacher and confirmed `/knowledge-base` is reachable via the new "Knowledge Base" nav link under Teaching (the regression check for the middleware finding above); logged in as a Class 9 student with no `AI_PROVIDER` configured and asked "Explain Newton's Third Law" at `/student/study-assistant` — confirmed the zero-config console AI provider honestly labels itself as not a real model while still surfacing the correct approved excerpt, with a "Grounded in: …" badge on the answer; asked a follow-up in the same chat session and confirmed via a direct database check that both turns share one `conversationId` (so history reconstruction for the next call would find the prior turn); created a fresh `PENDING_REVIEW` document with a unique nonsense keyword and confirmed a question containing that keyword got "no approved material matched" rather than leaking the unapproved content — then deleted the test document.

### Features Completed

**AI Provider Abstraction** (`src/lib/ai/`)
- `AIProvider` interface (`complete(request): Promise<AICompletionResult>`) mirrors the existing `WhatsAppProvider` pattern exactly — provider swap is a one-file change plus an env var, never a rewrite of calling code
- `ConsoleAIProvider` (default, zero-config) — never pretends to be a real model; parses the retrieved knowledge-base excerpt out of the system prompt and echoes it back honestly labeled, so the whole pipeline is demonstrable without any credentials
- `AnthropicAIProvider` — real provider via `@anthropic-ai/sdk` (new dependency), model defaults to `claude-opus-5` (overridable via `AI_MODEL`), typed-exception catch chain (`AuthenticationError`/`RateLimitError`/`BadRequestError`/`APIError`) that returns a generic, safe error message to the caller while logging the real error server-side only

**AI Knowledge Base** (`src/lib/services/knowledge-base.ts`, new `KnowledgeDocument` model)
- Admin/teacher CRUD at `/knowledge-base`: title, doc type (PDF/Notes/Text/Study Guide/Past Paper/Teacher Content), optional Academic Level/Board/Group/Subject scoping (null = "applies to all," matching the existing `Subject.academicLevelId` nullable convention), optional chapter/topic free text, optional source link, and a required plain-text `content` field — the UI is explicit that `content` is the only thing the AI can actually read (no PDF parsing exists, so a source link alone grounds nothing)
- Approval workflow: `PENDING_REVIEW` → `APPROVED`/`REJECTED`, two-button pattern mirroring homework grading — any `ACADEMIC_STAFF_ROLES` member can review, including self-approving their own upload (same trust level as homework grading today)
- `findRelevantDocuments()` retrieval: filters to `APPROVED` + taxonomy-scoped documents, ranks by keyword/word-overlap between the question and title+content — explicitly labeled as a placeholder for a future real vector-search/RAG pipeline, not real semantic search

**AI Study Assistant** (`src/lib/services/ai-assistant.ts`, `/student/study-assistant`)
- Student asks a question in a chat UI (modeled visually on the Support ticket thread's bubble pattern); answers are pitched to the student's academic level/board/group/program/subjects (new `getStudentAIContext()` in `students.ts`) and grounded in matching approved Knowledge Base excerpts when available
- Safety rules baked into the system prompt: ground in approved content and prefer it over general knowledge; explicitly say when no approved material matched *before* answering generally; never invent specific facts/figures — state uncertainty instead; decline anything outside educational scope
- Multi-turn conversation: history is reconstructed from the interaction log by `conversationId` each call (the Messages API is stateless) — capped to the last 10 successful turns
- Logging the interaction is non-fatal (a write failure never crashes the chat, same pattern as `logAudit`); the AI call itself is **not** swallowed — a provider failure throws and surfaces as a visible error to the student, since unlike other side-effect hooks in this codebase, the AI response *is* the primary action

### Database Migrations Added

- `20260904201500_phase3a_ai_foundation_knowledge_base` — reshaped `AIInteraction` (added `conversationId`, `feature`, `provider`, `model`, token counts, `latencyMs`, `status`, `errorMessage`; dropped `context`; `prompt` now required) and added `KnowledgeDocument` plus four new enums (`KnowledgeDocType`, `KnowledgeDocStatus`, `AIInteractionFeature`, `AIInteractionStatus`)

### APIs Added

None — Server Actions + the new `src/lib/services/{knowledge-base,ai-assistant}.ts` and `src/lib/ai/*` provider layer.

### Environment Variables Required

All optional (console provider is the zero-config default):

| Variable | Purpose |
|---|---|
| `AI_PROVIDER` | `console` (default) \| `anthropic` |
| `ANTHROPIC_API_KEY` | Only read if `AI_PROVIDER=anthropic` |
| `AI_MODEL` | Defaults to `claude-opus-5`; override if needed |

### Known Issues / Limitations

- No real vector search/embeddings/RAG — retrieval is keyword/word-overlap scoring, explicitly a placeholder (the spec itself asked for "future-ready," not working semantic search). A generic follow-up question can incidentally re-match the same document via common-word overlap rather than getting "no match" — a real embeddings pipeline would handle referential follow-ups properly.
- No real PDF parsing or file upload — `sourceUrl` is a pasted link like every other attachment in this app; only the separately-pasted `content` text field is ever readable by the AI.
- No maker-checker separation on Knowledge Base review — any academic staff member can approve their own upload, same trust level as homework grading today.
- The `AnthropicAIProvider` path (real model calls) was not exercised in this verification pass — no `ANTHROPIC_API_KEY` was available in this environment. The console-provider path, error-handling code paths, and typed exception chain were verified by code review only for the real-API case; only the console path was exercised live in the browser.

### Features Planned for Phase 3B

AI Performance Analysis, AI Study Plans, Smart Next Action Engine, AI Parent Reports (approve/edit/regenerate/send), AI Teacher Assistant, AI Question Generation — all new callers of `getAIProvider()` and `findRelevantDocuments()`, no changes needed to `src/lib/ai/*`. The `AIInteractionFeature` enum has room for new values (`PERFORMANCE_ANALYSIS`, `STUDY_PLAN`, etc.) as a pure-additive migration when 3B starts.

---

## Phase 3B — AI Intelligence Features

**Status: Complete and verified.** `npx tsc --noEmit`, `npx eslint .`, and `npm run build` all pass clean (build now covers 58+ routes, including two new ones: `/student/study-plan` and `/teacher-assistant`). This is the second of six sub-phases splitting the "Phase 3" mega-spec, building six AI intelligence features on the provider abstraction and Knowledge Base from Phase 3A.

Inspected the codebase first per the standing rule, and found two things worth acting on before writing code: (1) `ParentReport` is a **live model with real rows** whose stats-only report generator is also called by an **unattended weekly automation job** (`weekly-reports.ts`) that auto-sends with zero human review — since AI-generated content reaching a parent unreviewed would violate the spec's own approve-before-send safety requirement, AI drafting was built as a strictly separate, manually-triggered path (`draftParentReportNarrative()`) that the automated job never calls, rather than changing the job's existing behavior; (2) `src/middleware.ts` gates `/teacher/*` to `TEACHER` only, so the new AI Teacher Assistant hub (reachable by both Teacher and Admin) was placed at the shared un-prefixed `/teacher-assistant` route with its own in-page role check, exactly like `/knowledge-base` in 3A.

Verified end-to-end in a real browser (console provider, no `ANTHROPIC_API_KEY` in this environment): created a temporary overdue-homework fixture and confirmed the student dashboard's new "Next Actions" card correctly surfaced "Submit overdue homework" before deleting the fixture; generated a Study Plan on first visit to `/student/study-plan` and confirmed it auto-generated and correctly reported no Knowledge Base match for this student's actual subjects; generated an AI Performance Analysis from the Performance tab and confirmed Regenerate works; ran the full Parent Reports state machine (Generate → Draft with AI → attempted Mark Sent while still unapproved and confirmed it was blocked with a toast and `sentAt` stayed `null` in the database → Approved → Mark Sent succeeded) and separately ran the real `weekly-reports` cron job and confirmed its 17 auto-generated reports all show `aiDrafted: false` and sent without ever hitting the approval gate; confirmed `/teacher-assistant` is reachable by a Super Admin session (proving the middleware fix) and exercised both its Revision Topics and Lesson Summary tools; used the Homework tab's "Suggest with AI" flow and confirmed the AI draft correctly pre-filled the existing "Assign Homework" dialog's title/description/subject fields without any change to the shared `EntityDialog` component; used the Questions tab's "Generate with AI" flow and confirmed the lenient parser safely returns zero drafts (with a friendly toast, no crash) when the console provider's placeholder text doesn't match the expected delimited format — confirmed via the raw network response (`[]`), not just the UI.

**Bug found and fixed during this phase's browser verification pass:** the Parent Reports "Draft with AI" flow parses the AI's response into three labeled sections (`FEEDBACK:`/`WEAK AREAS:`/`NEXT WEEK GOAL:`). Under the zero-config console provider, the response is a generic placeholder message with none of those labels (Parent Reports deliberately isn't Knowledge-Base-grounded, so the console provider has no excerpt to echo either) — the parser correctly found no labeled sections and left the report's three fields blank despite `aiDrafted` being set to `true`, silently discarding real informational content. Fixed by having `parseNarrative()` fall back to using the raw response text as `teacherFeedback` when no labeled sections are found, so a "successful" draft always shows something instead of appearing empty.

### Features Completed

**AI Performance Analysis** (`src/lib/services/performance-analysis.ts`, embedded in the existing Performance tab)
- `generatePerformanceAnalysis(studentId)` synthesizes attendance/homework/test/engagement data plus performance history into one formatted narrative (Strengths/Weak Areas/Trend/Risk Factors/Recommended Actions) — not KB-grounded, since this is stats synthesis rather than content lookup
- Cached via the `AIInteraction` table using `conversationId = performance-analysis:{studentId}` as a deterministic app-controlled cache key (not a literal chat thread) — auto-invalidates when a newer `StudentPerformance` snapshot exists, otherwise reused until an explicit Regenerate
- Triggerable by the student themself or `ACADEMIC_STAFF_ROLES`; parents get read-only visibility only (no separate trigger, avoiding uncontrolled AI spend from a role with no action to take on the output)

**AI Study Plan** (`src/lib/services/study-plan.ts`, new `/student/study-plan`)
- `generateStudyPlan(studentId)` builds a same-day plan from pending homework, upcoming tests (next 7 days, not yet attempted), and subjects with a recent sub-60% score — and **is** Knowledge-Base-grounded, querying `findRelevantDocuments()` with the student's weak subjects so real approved material gets referenced when available
- Auto-generates on first visit if no plan exists yet, same freshness/cache-key pattern as Performance Analysis; student-only (the route is under `/student/*`, middleware-gated to `STUDENT`)

**Smart Next Action Engine** (`src/lib/services/next-actions.ts`, new shared `NextActionsCard` component)
- Deliberately **rule-based, not AI-generated** — every spec example (overdue homework, revise a weak chapter, prepare for a test) is a concrete factual derivation from existing data, not something needing language synthesis, so this makes zero AI calls
- `getNextActionsForStudent(studentId)` checks: overdue homework; an upcoming test (7-day window, unattempted); the most recent test result scoring below the configured at-risk threshold; a recent absence with a recording available. The "watch a missed recording" spec example was reworded to recording *availability* rather than watch *completion*, since no watch-progress tracking exists yet (that's Phase 3D scope)
- Wired into all 4 dashboards: full detail on Student/Parent (their own/selected child's actions), a "Priority Actions" rollup on Teacher/Admin scoped to their already-fetched, capped (≤5) at-risk student list rather than a full-roster fan-out

**AI Parent Reports** (enhancing the existing live `parent-reports.ts`/`parent-reports-tab.tsx`)
- New `draftParentReportNarrative()` AI-drafts the existing `teacherFeedback`/`weakAreas`/`nextWeekGoal` fields in a clear, supportive, non-technical tone — a strictly separate, manually-triggered function the automated weekly job never calls (see Inspect-First Findings above)
- New `aiDrafted`/`approvedAt`/`approvedById` columns (additive, nullable/defaulted — safe on the live table) implement Approve/Edit/Regenerate/Send: editing an AI-drafted report's text resets its approval (needs fresh review); `markParentReportSentAction` now blocks sending an AI-drafted-but-unapproved report with a clear error, enforced only at the manual Server Action layer so the automated job's direct `markSent()` call is completely unaffected

**AI Teacher Assistant** (`src/lib/services/teacher-assistant.ts`, new `/teacher-assistant` hub + contextual affordances)
- Hub page: Suggest Revision Topics (student-scoped, KB-grounded) and Generate Lesson Summary (subject/chapter/pasted notes → summary) — reachable by Teacher and Admin via the shared un-prefixed route (see Inspect-First Findings above)
- Contextual: "Suggest with AI" in the Homework tab pre-fills the *existing* "Assign Homework" `EntityDialog` via its already-supported `defaultValues` prop (confirmed during design review that the dialog re-reads `defaultValues` on open — no change to the shared component needed); "AI: Why These Were Difficult" card on the Test Results tab wraps the already-computed `questionAnalytics()` difficult-question subset with an AI narrative, only rendering when at least one question is actually flagged difficult

**AI Question Generation** (`src/lib/services/question-generation.ts`, embedded in the Questions tab)
- `generateQuestionDrafts()` prompts for a delimited text format (one question per `---`-separated block: `Q:`/`TYPE:`/`OPTIONS:`/`ANSWER:`/`MARKS:`), parsed by a lenient `parseQuestionDraftsText()` that skips a whole block rather than throwing on anything malformed — capped at 15 questions per generation, KB-grounded by subject/chapter
- No new schema — drafts are held only in client state until each is individually reviewed/edited and added via the *existing, unmodified* `addQuestionAction`, or discarded

### Database Migrations Added

- `phase3b_ai_intelligence_features` — additive only: `AIInteractionFeature` gained `PERFORMANCE_ANALYSIS`, `STUDY_PLAN`, `PARENT_REPORT_DRAFT`, `TEACHER_ASSISTANT`, `QUESTION_GENERATION`; `ParentReport` gained `aiDrafted` (default `false`), `approvedAt`, `approvedById` (both nullable) — no reshape, applied via plain `npx prisma migrate dev` non-interactively

### APIs Added

None — Server Actions + the new `src/lib/services/{performance-analysis,study-plan,next-actions,teacher-assistant,question-generation}.ts`, all calling the existing `src/lib/ai/*` provider layer.

### Environment Variables Required

None new (reuses 3A's `AI_PROVIDER`/`ANTHROPIC_API_KEY`/`AI_MODEL`).

### Known Issues / Limitations

- The `AnthropicAIProvider` path (real model calls) was not exercised live in this verification pass — no `ANTHROPIC_API_KEY` was available in this environment. Every feature was confirmed to degrade gracefully under the console provider (including the two real gaps found and fixed above), but the real-API narrative quality and the delimited question-format's actual parse rate against a real model's output are unverified.
- AI Question Generation's structured text format has no automated round-trip test against a real model — the lenient parser is designed to skip malformed blocks safely, but its real-world parse success rate depends on how reliably `claude-opus-5` follows the requested format, which wasn't measurable without live API access.
- "Catch up on a missed class" (Smart Next Action) surfaces recording *availability*, not watch *completion* — it will keep resurfacing for up to 14 days since there's no signal for whether the student already watched it.
- No maker-checker separation on Parent Report approval — the same staff member who drafted/regenerated a report can also approve it, matching the trust level already established for Knowledge Base review in 3A.
- Teacher/Admin dashboard "Next Actions" only covers each dashboard's already-visible, capped at-risk list (≤5 students) — a teacher or admin with more than 5 at-risk students won't see next-actions for the rest without visiting `/admin/at-risk` directly.

### Features Planned for Phase 3C

Advanced Learning Analytics (Subject/Chapter/Topic analysis), Cohort Analytics, a transparent Predictive At-Risk scoring model, and Smart Intervention Recommendations extending Phase 4C's `Intervention` model — building on this phase's AI abstraction where natural-language synthesis adds real value, and on 4B's `analytics.ts` patterns for the cohort-level aggregation work.

---

## Phase 3C — Advanced Learning Analytics, Cohort Analytics, Predictive Risk, Smart Intervention Recommendations

**Status: Complete and verified.** `npx tsc --noEmit`, `npx eslint .`, and `npm run build` all pass clean (build now covers 60+ routes, including one new one: `/admin/predictive-risk`). This is the third of six sub-phases splitting the "Phase 3" mega-spec, building on 3A's AI abstraction and 4B's `analytics.ts` aggregation patterns.

Inspected the codebase first per the standing rule, and found two real gaps before writing anything: (1) `TestQuestion` had no field finer-grained than `Test.chapter` (one chapter per whole test) — a genuine "Topic" level of analysis wasn't possible without a schema change, so an additive nullable `TestQuestion.topic` was added (safe on the live table) and threaded through the manual Add/Edit Question form, the AI Question Generation prompt/parser, and a couple of seeded questions, so Topic analytics has real data to show rather than being permanently empty; (2) the existing `AT_RISK` category (`performance.ts`) is a **single-snapshot threshold breach**, not a trend — there was no leading indicator for "this student is declining but hasn't crossed a threshold yet," which is what a *predictive* score needs to add over what Phase 2/4B already built.

Verified end-to-end in a real browser against the live Supabase database (console AI provider, no `ANTHROPIC_API_KEY` in this environment) as Super Admin: opened a student with a graded test and confirmed the Performance tab's new Learning Analytics card correctly shows a Subject breakdown (50%), an empty Chapter breakdown (the seeded test has no chapter set — correctly shows an empty state, not an error), and a Topic breakdown with 5 real per-question percentages read off the seeded topic-tagged questions, sorted weakest-first; opened `/admin/analytics` → Cohort tab and confirmed real, distinct Attendance/Homework/Test/Overall-Performance numbers for all 5 batches and all 5 academic levels; recalculated a student's Predictive Risk score from their Engagement tab and confirmed a transparent score + specific signal text ("Engagement score is low...", "No recent login activity") rendered correctly, confirmed via a raw DB/UI cross-check that the score is staff-only (never rendered to the student); ran `npm run jobs:run` and confirmed the new `predictive-risk-scores` job processed all 17 active/trial students without error, then confirmed `/admin/predictive-risk` lists all of them with correct stat-card counts by risk level; clicked "Suggest with AI" on a student's Interventions card and confirmed the AI-drafted `{reason, actionPlan}` correctly pre-filled the *existing, unmodified* "Create Intervention" `EntityDialog` via its already-supported `defaultValues` prop (same zero-component-change pattern as Homework's "Suggest with AI" in 3B), including the expected graceful fallback text under the console provider.

**Note on this pass's seeded data**: every seeded student currently has only one `StudentPerformance` snapshot, so the risk score's trend components (which need ≥2 snapshots to detect a decline) all read as zero for every student today — every score in this environment lands in the `LOW` tier, which is the mathematically correct output given single-snapshot data, not a bug. The signals shown (engagement/inactivity) are real and do vary per student. As more snapshots accumulate over time (via Performance's Recalculate action or a future scheduled recalculation), the trend components will start to differentiate scores further — same "trend quality depends on recalculation history" caveat already documented for 4B's Performance Trends tab.

### Features Completed

**Advanced Learning Analytics** (`src/lib/services/learning-analytics.ts`, new card on the existing Performance tab)
- `getStudentLearningAnalytics(studentId)` returns a per-student (not academy-wide — that's 4B's `academicAnalytics()`) breakdown by Subject, by Chapter (via the existing `Test.chapter`), and by Topic (via the new `TestQuestion.topic`), each sorted weakest-first
- Purely factual/derived — no AI call — so it's shown to the student themself as well as staff, unlike the Predictive Risk score below
- New nullable `TestQuestion.topic` field (additive) threaded through the manual Add/Edit Question form, AI Question Generation's prompt/parser (`TOPIC:` line), and the Draft Question review card — Topic analytics has real data without needing every question tagged

**Cohort Analytics** (`src/lib/services/analytics.ts`'s new `cohortAnalytics()`, new Cohort tab on `/admin/analytics`)
- Side-by-side comparison of every Batch and every Academic Level on Attendance/Homework/Test/Overall-Performance in one table each — answers "which cohort as a whole is doing better," distinct from the Academic tab's single-metric charts and weakest-chapter/subject lists
- Reuses the exact same underlying rate/average logic as 4B's `academicAnalytics()`, just grouped differently, so the two can never silently diverge on what counts as "present" or "reviewed"

**Predictive Risk** (`src/lib/services/predictive-risk.ts`, new `PredictiveRiskScore` model, new `/admin/predictive-risk`, new card on the Engagement tab)
- Transparent, rule-based 0–100 score (`LOW`/`MODERATE`/`HIGH`/`CRITICAL`) built from **declining trends** across a student's last several `StudentPerformance` snapshots (attendance/homework/test score slopes) plus their latest Engagement score and login recency — deliberately not an AI-generated score, same "not everything should be AI" reasoning as the Smart Next Action engine in 3B: every input and weight is inspectable, unlike a model's internal reasoning
- Every score stores its plain-English `signals` (e.g. "Attendance has been declining across recent performance snapshots") so staff never have to reverse-engineer the number
- New daily `predictive-risk-scores` background job (registered in the 4A job registry, callable via `/api/cron/predictive-risk-scores`, included in `scripts/run-jobs.ts`), same not-gated-by-an-AutomationRule precedent as Engagement's recalculation job; also manually triggerable from a student's Engagement tab
- `/admin/predictive-risk`: all students by risk level, filterable, same list-page shape as `/admin/at-risk` and `/admin/engagement`
- **Deliberately staff-only** — never rendered on the student's own Performance/Engagement view, unlike Learning Analytics above. A numeric "risk score" facing a student without a counselor's framing could be alarming or stigmatizing; this mirrors the existing precedent that Interventions are also staff-only

**Smart Intervention Recommendations** (`teacher-assistant.ts`'s new `suggestInterventionPlan()`, "Suggest with AI" button on the Engagement tab's Interventions card)
- Synthesizes a student's Predictive Risk signals + performance history + engagement score into an AI-drafted `{reason, actionPlan}` pair — the risk *score* stays deterministic and inspectable (above); AI is used only to turn already-computed signals into a readable staff recommendation, the same split as Performance Analysis (AI narrates real stats) vs. the Smart Next Action engine (no AI at all)
- Pre-fills the *existing, unmodified* "Create Intervention" `EntityDialog` via its already-supported `defaultValues` prop — zero changes to the shared dialog component, exact same pattern as Homework's "Suggest with AI" in 3B
- New `AIInteractionFeature.INTERVENTION_RECOMMENDATION` value for its interaction log entries

### Database Migrations Added

- `20260904235620_phase3c_learning_analytics_predictive_risk` — additive only: `TestQuestion.topic` (nullable), new `PredictiveRiskScore` model + `RiskLevel` enum, `AIInteractionFeature` gained `INTERVENTION_RECOMMENDATION`, `AutomationRuleKey` gained `PREDICTIVE_RISK_RECALC` — applied via plain `npx prisma migrate dev` non-interactively

### APIs Added

None — Server Actions + the new `src/lib/services/{learning-analytics,predictive-risk}.ts`, `analytics.ts`'s new `cohortAnalytics()`, and `teacher-assistant.ts`'s new `suggestInterventionPlan()`. `/api/cron/predictive-risk-scores` reuses the existing generic `/api/cron/[job]` route.

### Environment Variables Required

None new (reuses 3A's `AI_PROVIDER`/`ANTHROPIC_API_KEY`/`AI_MODEL`).

### Known Issues / Limitations

- Predictive Risk's trend components need at least two `StudentPerformance` snapshots per student to detect a decline — a student with only one snapshot (or none) reads as a flat, low score by construction, not an error. Score differentiation improves as recalculation history accumulates, same caveat as 4B's Performance Trends tab.
- Topic-level Learning Analytics is only as complete as how many questions have a `topic` tag — untagged questions (the large majority of any pre-3C test) simply don't contribute to that section, shown as an empty state rather than a partial/misleading average.
- Chapter-level Learning Analytics uses `Test.chapter` (one chapter per whole test, unchanged from 4B) — a test spanning multiple chapters in one sitting still reports as a single chapter, same limitation `academicAnalytics()`'s `weakestChapters` already has.
- The `AnthropicAIProvider` path (real model calls) was not exercised live in this verification pass — no `ANTHROPIC_API_KEY` was available in this environment. `suggestInterventionPlan()`'s real-world parse rate against the `REASON:`/`ACTION PLAN:` format is unverified against a real model, though the parser's raw-text fallback (verified live) guarantees it never renders blank.
- No maker-checker separation on Intervention creation/approval — matches the trust level already established for Knowledge Base review (3A) and Parent Report approval (3B).
- Cohort Analytics has no time dimension yet (e.g. "this batch's trend over the last month") — it's a current-snapshot comparison, same scope boundary as 4B's Academic tab.

### Features Planned for Phase 3D

Learning Experience enhancements — see the six-phase breakdown for the full scope (3D Learning Experience, 3E SaaS Scalability/Security, 3F Admin Dashboards/Observability/Docs/Production QA).

---

## Phase 3D — Learning Experience

**Status: Complete and verified.** `npx tsc --noEmit`, `npx eslint .`, and `npm run build` all pass clean (build now covers 60+ routes, including two new ones: `/student/learning-path` and `/student/exam-prep`). This is the fourth of six sub-phases splitting the "Phase 3" mega-spec: Video watch-progress tracking, Learning Paths, Student Goals, Exam Preparation Mode, Parent Experience simplification, and multi-child improvements.

Inspected the codebase first per the standing rule and found two things that shaped the design before writing code: (1) recordings/study material are plain pasted URLs (Google Drive/YouTube/Zoom links, no embeddable player, no object storage) — so real automatic watch-progress (position/percentage from actual playback) is only possible for a directly embeddable video file URL, which essentially never happens with today's link types; a manual "Mark Complete"/"Mark Read" self-report is the honest, always-available fallback, and the real `<video>`-driven path is built and ready for whenever direct video URLs exist. (2) `TestAttempt` is hard-capped at one attempt per test per student (`@@unique([testId, studentId])`) and there's no self-serve/unlimited-retake test infrastructure — so "Practice tests" in Exam Prep Mode is honestly reframed as surfacing the student's other genuinely-scheduled upcoming tests in the same subject, not an invented retake system.

Verified end-to-end in a real browser against the live Supabase database (console AI provider, no `ANTHROPIC_API_KEY` in this environment): logged in as a student, confirmed `/student/learning-path` correctly derived a Mathematics "Chapter 1" step group from seeded content (Notes available, Lecture/Homework/Quiz correctly shown as "not available" since no seeded content for that subject carries that chapter) at 0% progress; marked the Chapter 1 study material "Read" from `/student/study-material` and confirmed Learning Path recalculated to 100% (1/1 applicable steps) immediately, with zero manual sync step; marked a recording "Complete" from `/student/recordings` and confirmed the badge updated; visited `/student/exam-prep`, confirmed it picked the nearest upcoming test, showed a correct day-countdown and the Learning Path completion reused as "Study Progress," and auto-generated a revision plan (console-provider placeholder, as expected); created a Subject Test Score goal ("Improve Mathematics score from 7% to 70%") from a student's Performance tab and confirmed `currentValue` came back as exactly the same 6.7% Learning Analytics already reports for that subject — proving the "never stored, always derived" design actually holds, not just in theory; logged in as a parent with two linked children and confirmed the new "All Children" strip shows both with real attendance/performance-category badges, the new "This Week" card shows the five plain-language lines the spec asked for with no charts, and "Show More Details" is collapsed by default and correctly reveals the previously-always-visible cards (Payment Status, Recent Test Results, Parent Reports history, Referral) when clicked.

### Features Completed

**Video Watch Progress** (`src/lib/services/content-progress.ts`, new `ContentProgress` model, updated `/student/recordings`)
- Real automatic tracking (throttled `<video>` `timeupdate` → `recordVideoProgressAction`, with resume-from-last-position on reload) for any recording whose URL is a direct video file (`isDirectVideoUrl()`); a manual "Mark Complete" button for everything else (the overwhelming majority today, given no recordings use direct file URLs yet)
- The automatic-tracking action deliberately never calls `revalidatePath` (it fires every few seconds while a video plays; the client already updates its own progress bar from the action's return value) — a real bug caught and fixed during this pass, before it ever caused visible video-player disruption

**Learning Paths** (`src/lib/services/learning-path.ts`, new `/student/learning-path`)
- No new content model — every source (`LiveClass`, `ClassRecording`, `Homework`, `Test`, `StudyMaterial`) already carries a nullable `chapter` field from earlier phases; `getLearningPath()` groups by chapter and derives each of Lecture/Notes/Homework/Quiz's completion from real signals: attendance or a watched recording for Lecture, `ContentProgress` for Notes, `HomeworkSubmission` status for Homework, `TestResult` existence (attempted) for Quiz
- A step with zero matching content for a chapter renders as "not available," not "incomplete" — a chapter with no homework ever assigned shouldn't look like a missed assignment
- Chapters are ordered by first appearance across the five source tables (no explicit chapter-sequence field exists in the schema), documented as an approximation of authoring order, not a guarantee

**Student Goals** (`src/lib/services/goals.ts`, new `StudentGoal` model, new Goals card on the Performance tab)
- Weekly/Monthly/Exam goal types, four trackable metrics (Subject Test Score, Overall Performance, Attendance, Homework Completion) — `currentValue` is **never stored**, always recomputed live from the exact same services Performance and Learning Analytics already use, so a goal can never silently drift out of sync with the real number it tracks
- Staff-created (`ACADEMIC_STAFF_ROLES`), matching the spec's "teacher can create academic goals"; effective status (Active/Achieved/Missed/Cancelled) is derived at read time from `currentValue` vs. `targetValue` and `targetDate`, not a field a human has to update by hand

**Exam Preparation Mode** (`src/lib/services/exam-prep.ts`, new `/student/exam-prep`)
- Countdown to the nearest unattempted upcoming test, that subject's weakest chapters (reusing 3C's `learning-analytics.ts`), study progress (reusing this phase's Learning Path completion percent for that subject), and an AI-generated, KB-grounded revision plan prioritizing weak chapters first
- Reuses `AIInteractionFeature.STUDY_PLAN` rather than adding a new enum value, since this is the same kind of revision synthesis as 3B's Study Plan, just scoped to one exam instead of "today"
- "Practice tests" is honestly scoped to the student's other genuinely-scheduled upcoming tests in the same subject (see Inspect-First Findings) rather than an invented retake system

**Parent Experience Improvements** (new `WeeklySummaryCard` + `DetailsToggle`, restructured `/parent`)
- New "This Week" card up top: Attendance, Homework, Performance, Teacher Feedback (from the latest Parent Report), Next Steps (from the latest Parent Report's goal or, failing that, the Smart Next Action engine) — five plain-language lines, zero charts, per the spec's explicit "do not overwhelm parents with charts"
- Everything else (stat card grid, Upcoming Classes, Recent Homework, Recent Test Results, Parent Reports archive, Referral card) now lives behind a new shared `DetailsToggle` component, collapsed by default — "simple summary first, detailed analytics optional"
- Announcements stays always-visible, outside the toggle — it's active broadcast communication, not a historical detail, so hiding it would defeat its purpose

**Multiple Children Improvements** (new `AllChildrenStrip`)
- A compact, horizontally-scrollable strip above the existing `ChildSwitcher` dropdown (kept as-is, not replaced) showing every linked child's name, attendance rate, and performance category at a glance, each clickable to switch — renders nothing for a parent with only one child

### Database Migrations Added

- `20260905005136_phase3d_learning_experience` — new models `ContentProgress`, `StudentGoal`; new enums `ContentKind`, `GoalType`, `GoalMetric`, `GoalStatus` — all additive, applied via plain `npx prisma migrate dev` non-interactively. `Test`/`Homework`/`LiveClass`/`ClassRecording`/`StudyMaterial` already had `chapter` from Phase 1/2 — Learning Paths needed zero new content-schema, only the two new tracking models above.

### APIs Added

None — Server Actions + the new `src/lib/services/{content-progress,learning-path,goals,exam-prep}.ts`, plus a small new `students.ts` helper (`listSubjectsForStudent`) reused by Learning Path, Exam Prep, and the Goals dialog's subject picker.

### Environment Variables Required

None new (Exam Prep's AI plan reuses 3A's `AI_PROVIDER`/`ANTHROPIC_API_KEY`/`AI_MODEL`).

### Known Issues / Limitations

- Real automatic video watch-progress only activates for a directly embeddable video file URL (`.mp4`/`.webm`/`.ogg`) — every recording in this project today is a pasted Drive/YouTube/Zoom link, so in practice every recording uses the manual "Mark Complete" fallback. The automatic path is real, working code (verified by review, not exercised live in this pass since no seed data has a direct video URL), ready for whenever an object-storage/direct-upload integration lands.
- Learning Path chapter ordering is "first appearance across five source tables," not a real authoring sequence — there's no chapter-order field anywhere in the schema yet.
- A chapter appears in a subject's Learning Path only if at least one of its five source tables has that exact chapter string tagged on it — inconsistent chapter-name spelling across a Test vs. a Homework vs. a LiveClass for "the same" chapter will show up as two separate rows, same free-text-matching caveat 4B's `weakestChapters` already has.
- "Practice tests" in Exam Prep Mode surfaces other scheduled tests in the same subject, not a real self-serve/unlimited-retake practice system — `TestAttempt`'s one-attempt-per-test constraint would need real rework to support genuine retakes.
- No maker-checker on Goal creation/cancellation — same trust level already established for Knowledge Base (3A), Parent Report approval (3B), and Intervention creation (3C).
- The `AnthropicAIProvider` path for Exam Prep's revision plan was not exercised live in this pass — no `ANTHROPIC_API_KEY` was available in this environment; the console-provider fallback path was verified live.

### Features Planned for Phase 3E

Platform Scalability & Security — organization/tenant groundwork (without breaking the current single-academy implementation), API hardening (pagination/filtering/rate-limiting conventions), a payment-provider abstraction, a security review, file management, and performance/indexing/observability work.

---

## Phase 3E — Platform Scalability & Security

**Status: Complete and verified.** `npx tsc --noEmit`, `npx eslint .`, and `npm run build` all pass clean, including `/api/v1/students`, `/api/files/[id]`, and two new admin pages (`/admin/settings/api-keys`, `/admin/settings/payment-gateway` — the other three admin pages this pass enables, Command Center/System Health/AI Usage, are Phase 3F's own features, built on top of this phase's `JobRun` log and provider-status plumbing). This is the fifth of six sub-phases splitting the "Phase 3" mega-spec: Multi-Academy/SaaS readiness, API Architecture, Payment Integration Architecture, Advanced Security, File Management, Performance Optimization, and Observability.

Inspected the codebase first per the standing rule, and the review itself surfaced the phase's most important findings — four real gaps, not hypothetical ones (the first two are security bugs; the last two are performance/observability):

1. **`submitHomeworkAction`** (`admin/batches/actions.ts`) and **`submitTestAttemptAction`** (`tests/actions.ts`) both took a client-supplied `submissionId`/`attemptId` and checked only `session.user.role === "STUDENT"` — never verifying the target row actually belonged to the calling student. Any authenticated student could submit/overwrite **another student's** homework submission or test attempt (and therefore their score) by guessing or knowing the ID. Both are fixed: the caller's own `Student` record is now resolved from session server-side, and the service layer (`studentSubmitHomework`, `submitTestAttempt`) requires the target row's `studentId` to match before any write, throwing "not found" otherwise — exactly the kind of gap the spec's "prevent students from accessing another student's data" line was asking to find.
2. Login had **no rate limiting at all** — fixed with a per-identifier limiter (10 attempts / 15 minutes).
3. DataTable has no built-in pagination (only Students/Batches/Parents had page-level pagination since Phase 1) — `/admin/interventions` was fetching every intervention ever created with no limit, a genuine "prepare for thousands of students" gap since interventions accumulate for the life of every at-risk case. Fixed with real server-side pagination. (`/admin/support`, `/admin/leads`, and the at-risk/engagement/predictive-risk list pages have similar or related gaps not fixed this pass — see Known Issues.)
4. `/api/cron/[job]` already returned a job's error in its HTTP response, but nothing persisted that anywhere queryable — a failure called by an external scheduler with nobody watching the response body was invisible. Fixed by persisting every run's outcome to a new `JobRun` log.

Verified end-to-end in a real browser against the live Supabase database as Super Admin and as a seeded Student: created an API key at `/admin/settings/api-keys` (shown once, as designed), called `GET /api/v1/students` with it via `curl` and confirmed real pagination (`?page=1&pageSize=3` → 3 of 26, `totalPages: 9`) and correct 401 rejection for both a missing and an invalid key; confirmed `/admin/settings/payment-gateway`'s "Test Connection" button round-trips through `ConsolePaymentProvider.initiate()` and displays a real reference; confirmed `/admin/system-health` and `/admin/ai-usage` render real, correctly-aggregated numbers from existing tables after running `npm run jobs:run`; confirmed `/admin/interventions`' new pagination controls work and the mobile card-view fallback still renders correctly; submitted homework as a student with a pasted attachment URL through the newly-hardened `submitHomeworkAction` and confirmed the ownership check doesn't block a student's own legitimate submission (the fix only blocks *other* students' IDs); in a dedicated follow-up pass, submitted homework again with a real uploaded file and confirmed the entire path end-to-end (see the second bug below and its fix) — bytes on disk, DB rows, the teacher's download link, and access control all verified live, not just by code review.

**Two bugs found and fixed during this phase's own browser verification passes:**

1. `/api/v1/*` was being intercepted by `middleware.ts`'s session-redirect logic and bounced to `/login` before its own Bearer-API-key check ever ran, because the new route wasn't added to the same public-path allowlist `/api/cron` already uses (a public REST surface authenticates itself, same as the cron endpoint — this was a straightforward miss, not a design flaw, and is fixed the same way `/api/cron` already works).
2. **Found in a dedicated live re-verification of the file-upload path, requested after the first pass wrongly deferred it as merely "not exercised live" (it had actually failed, just quietly):** `submitHomeworkAction` originally took a `File` as a bare positional argument alongside plain-object siblings (`submitHomeworkAction(homeworkId, submissionId, data, file)`). Next.js's Server Action argument encoder rejects this outright — every click silently failed client-side with "Only plain objects, and a few built-ins, can be passed to Server Actions," a toast that scrolled past unnoticed during the first pass and was misread as dev-server congestion. Fixed by switching to the framework's own supported shape for this: the client builds a single `FormData` (fields + the file), and the action reads `formData.get(...)` instead of accepting positional arguments. Re-verified live end-to-end after the fix: a student attached a real PDF, the bytes landed correctly in `.uploads/` (byte-for-byte match confirmed by reading the file back off disk), the `UploadedFile` row and `HomeworkSubmission.attachmentFileId` link were both created correctly, a teacher's grading dialog rendered a working `/api/files/[id]` link, that route served the file back with correct `Content-Type`/`Content-Disposition` and the exact original bytes, and an unauthenticated request to the same URL was correctly redirected to `/login` rather than served.

### Features Completed

**Multi-Academy / SaaS Readiness** (schema-only)
- `Organization`, `OrganizationSettings`, `OrganizationUser` — zero rows, zero wiring into any existing query, same precedent as Phase 1's Phase-2/3 stub models (`Test`, `Lead`, etc. once were exactly this). The spec's own instruction was "do not break the current single-academy implementation" — nothing existing was reshaped to add tenancy.

**API Architecture** (`src/lib/api-utils.ts`, `/api/v1/students`, `/admin/settings/api-keys`)
- Bearer API-key auth (`ApiKey` model, SHA-256 hash stored, raw key shown once at creation), shared pagination (`?page&pageSize`, capped at 100) and filtering conventions, 60 req/min per-key rate limiting — one representative endpoint demonstrating the pattern the spec asked for in preparation for a future mobile app, not a full REST surface for every entity.

**Payment Provider Abstraction** (`src/lib/payments/*`, `/admin/settings/payment-gateway`)
- `PaymentProvider` interface (`initiate`/`verify`/`handleWebhook`/`refund`) mirroring the AI/WhatsApp pattern exactly. `ConsolePaymentProvider` demonstrates the shape without a real gateway account and **never touches a real `Payment`/`Installment` row** — the Phase 2 manual-recording flow is completely unchanged.

**Advanced Security**
- Two real IDOR (Insecure Direct Object Reference) bugs found and fixed (see Inspect-First Findings above).
- Login rate limiting (`src/lib/rate-limit.ts`, in-memory sliding window, 10/15min per identifier).
- Confirmed existing coverage is otherwise sound: every shared-route action already goes through `assertCanManageBatch`/`assertCanManageTest`/`assertCanManageLead`/`assertCanManageSupportTicket`, Knowledge Base already scopes to `APPROVED` at the query level, parent access is already scoped by real linked-child relationships, not a client-filterable parameter.

**File Management** (`src/lib/storage/*`, `UploadedFile`, `/api/files/[id]`)
- Real, working `LocalFileStorageProvider` (writes to a server-only `.uploads/` directory, never under `public/`) — unlike the AI/WhatsApp/Payment console providers, this one needs no paid API key to be genuinely functional. Upload validation: 10MB cap, allowlisted mime types (PDF, Word, PNG/JPEG/WEBP).
- Wired into Homework submission (student can paste a URL **or** upload a real file; a teacher grading the submission now sees a link to either — this closes a separate, pre-existing gap where a submission's `attachmentUrl`/`studentComments` weren't even rendered in the grading dialog). Support ticket attachments intentionally stay pasted-URL-only — extending the shared `EntityDialog` with a file-field type is a natural follow-up, judged out of scope given the risk of touching a widely-shared component under time pressure.
- Every file read (`/api/files/[id]`) re-checks the same access rule as the record referencing it (homework submission ownership/teacher-of-batch, support ticket ownership) — a leaked/guessed file id alone is never sufficient.

**Performance Optimization**
- `/admin/interventions` gained real server-side pagination (20/page) — previously fetched every intervention ever created with no limit.
- Confirmed existing index coverage on high-write tables (`AuditLog`, `WhatsAppMessage`, `AnalyticsEvent`) is already reasonable; new models this phase (`ApiKey`, `UploadedFile`, `JobRun`) ship with their own indexes on the fields they're actually queried by.

**Observability** (`JobRun` model, wired into `runJob()`)
- Every scheduled job run — success or failure — is now persisted (`jobKey`, `status`, `itemsProcessed`, `errorMessage`, timestamps), closing the gap described above. Feeds `/admin/system-health` (Phase 3F).

### Database Migrations Added

- `20260905074514_phase3e_scalability_security` — additive only: new models `Organization`/`OrganizationSettings`/`OrganizationUser`, `ApiKey`, `UploadedFile` (+ `FilePurpose` enum), `JobRun`, `AIUsageConfig`; additive columns `HomeworkSubmission.attachmentFileId`, `SupportTicket.attachmentFileId` — applied via plain `npx prisma migrate dev` non-interactively.

### APIs Added

- `GET /api/v1/students` — the documented-API pattern (Bearer key, pagination, filtering).
- `GET /api/files/[id]` — access-checked file byte serving.

### Environment Variables Required

All optional (every provider defaults to a zero-config or real-but-local option):

| Variable | Purpose |
|---|---|
| `PAYMENT_PROVIDER` | `console` (default) — a real gateway provider would be added behind the same interface |
| `FILE_STORAGE_PROVIDER` | `local` (default, real working disk storage) — a future `s3`/`supabase` provider plugs in behind the same interface |

### Known Issues / Limitations

- The rate limiter (`src/lib/rate-limit.ts`) is in-memory — resets on redeploy/restart, doesn't share state across multiple server instances. A real multi-instance deployment needs a shared store (Redis/Upstash) behind the same `checkRateLimit()` signature.
- `/admin/support` and `/admin/leads` have similar unbounded-`findMany` list queries to the one fixed on `/admin/interventions` — not fixed this pass, flagged for a follow-up.
- `/admin/at-risk`, `/admin/engagement`, and `/admin/predictive-risk` fetch full history per student before deduping to "latest," which doesn't paginate cleanly at the DB level without either a smarter query (e.g. `DISTINCT ON`) or a materialized latest-score table — acceptable at today's scale (a few dozen students), documented rather than rushed given these tables' history is deliberately preserved for trend analysis (Predictive Risk's own trend components depend on it).
- No maker-checker anywhere in the app (consistent with every earlier phase, not a regression) — API keys, once created by any staff member, are trusted; the same person who configures a provider can also test it.
- Payment/File/AI provider abstractions are architecture readiness, not live integrations — same honesty precedent as the AI/WhatsApp console providers before real credentials existed for those.

### Features Planned for Phase 3F

Admin Command Center & Production Readiness — Executive Super Dashboard, System Health, AI Usage Management, a mobile UX pass, the full production-quality checklist, and complete documentation.

---

## Phase 3F — Admin Command Center & Production Readiness

**Status: Complete and verified.** `npx tsc --noEmit`, `npx eslint .`, and `npm run build` all pass clean (74 routes total, including this phase's three new admin pages). This is the sixth and last of the six sub-phases splitting the "Phase 3" mega-spec: Executive Super Dashboard, System Health, AI Usage Management, Mobile Experience, Production Quality, and Documentation. With this phase, every module from the original two specs (Phases 1–4C, then 3A–3F) has real, working functionality.

Inspected the codebase first per the standing rule: confirmed almost every number an executive dashboard would want already exists somewhere (`businessMetrics()`, `academicAnalytics()`, `retentionAnalytics()`, `listAtRiskStudents()` from 4B/Phase 2; `AutomationLog`/`WhatsAppMessage` from 4A; `AIInteraction` from 3A) — the only genuinely new query needed was an academy-wide Teacher Operations rollup, since `teacherAnalytics()` only ever computed one teacher at a time. This confirmed the right shape for this phase: a pure reporting/aggregation layer over data every earlier phase already computes correctly, not new business logic.

Verified end-to-end in a real browser as Super Admin: `/admin/command-center` renders real, cross-checked numbers from every subsystem (Business Health's Total Enrollments matched `/admin/students`'s count; At-Risk Students matched `/admin/at-risk`'s own count) in one page; `/admin/system-health` correctly showed zero recorded job runs before `npm run jobs:run`, then correctly populated Latest-Run-Per-Job and Recent Job Runs after running it, with all 9 jobs showing `SUCCESS`; `/admin/ai-usage` correctly aggregated the AI interactions logged across every earlier phase's testing by feature and user. A full mobile-viewport (375×812) pass across the Parent dashboard, the brand-new Command Center, and a DataTable-driven list page (`/admin/interventions`) confirmed the existing shared-component system (`StatCard`, `Card`, `DataTable`'s stacked-card fallback, the collapsible `DetailsToggle` from 3D) already handles mobile correctly with zero mobile-specific code needed for any of this phase's new pages — a direct payoff of Phase 1's original "mobile-first" component investment holding up five phases and two mega-specs later.

### Features Completed

**Executive Super Dashboard** (`src/lib/services/executive-dashboard.ts`, `/admin/command-center`)
- Business Health, Academic & Student Health, Message Delivery, AI Usage, and Automation/System Health in one page — every number sourced from an existing service function except one small new direct query (Teacher Operations: teacher count, academy-wide homework review/feedback-completion rate), since nothing previously aggregated that across every teacher at once.

**System Health** (`src/lib/services/system-health.ts`, `/admin/system-health`)
- Integration status (which of AI/WhatsApp/Payment/File-Storage are running a real provider vs. the zero-config default), failed-jobs/automation-failures/message-failures/AI-failure-rate in the last 24h, latest run per job, and recent job-run history — all built on Phase 3E's new `JobRun` log plus the existing `AutomationLog`/`WhatsAppMessage`/`AIInteraction` tables.

**AI Usage Management** (`src/lib/services/ai-usage.ts`, `/admin/ai-usage`)
- Aggregates the existing `AIInteraction` log (unchanged since Phase 3A) by feature and by user: request counts, token totals, failure counts, and an estimated cost (token count × a staff-configured $/1,000-tokens rate). `AIUsageConfig` (singleton) lets staff set a daily token soft cap — informational only (a warning banner when exceeded), since no real billing/metering integration exists to enforce a hard cap. No new tracking — purely a reporting layer over data that already existed.

**Mobile Experience**
- Real mobile-viewport verification (not just a code-level claim) across three structurally different page types — see verification notes above. No mobile-specific bugs found; the existing `StatCard`/`Card`/`DataTable` component system (built mobile-first since Phase 1) already handled every new page correctly.

**Production Quality**
- Full regression pass this session (spanning Phases 3A through 3F): re-confirmed login/RBAC, Student 360 tabs, AI features under the console provider, Knowledge Base approval-gating, student/parent data isolation (including the two IDOR fixes from 3E), background jobs (`npm run jobs:run` — all 9 succeed), and mobile layouts. `npx tsc --noEmit`, `npx eslint .`, and `npm run build` all pass clean at every phase boundary this session, not just at the end.

**Documentation** (`docs/`)
- Eight focused documents, each written from what's actually built rather than from the original spec's wishlist: `ai-architecture.md`, `knowledge-base.md`, `automation-engine.md`, `whatsapp-integration.md`, `payment-architecture.md`, `api-architecture.md`, `role-permissions.md`, `database-schema-overview.md`. `README.md` and `PHASE_COMPLETION.md` remain the primary entry points; the `docs/` files go one level deeper on each subsystem than either has room for.

### Database Migrations Added

None — Phase 3F is a pure reporting/documentation phase over data structures Phase 3E (and earlier) already created.

### APIs Added

None — Server Actions + the new `src/lib/services/{executive-dashboard,system-health,ai-usage}.ts`.

### Environment Variables Required

None new.

### Known Issues / Limitations

- The Executive Dashboard and System Health pages compute their numbers on every page load (no caching) — acceptable at today's data volume; a real high-traffic executive dashboard would want a short-TTL cache, which the codebase doesn't have an established pattern for yet (no Redis/cache layer exists anywhere in this project).
- AI Usage's cost estimate is only as accurate as the staff-entered $/1,000-tokens rate — there's no live pricing feed from any provider.
- Mobile verification covered three representative page types, not an exhaustive audit of all 74 routes (confirmed via a full `npm run build` route listing) — the shared-component system's consistency makes further systemic issues unlikely, but a full page-by-page mobile audit was not performed.

### Original Two-Spec Program: Complete

Phases 1 through 4C covered the original spec (Foundation through Gamification/Referrals/Support). Phases 3A through 3F covered the second, larger spec (AI + Advanced Analytics + Scalability + Production Readiness). Every module named in both specs now has real, working functionality — nothing left behind a "coming in a later phase" placeholder, though several features are honestly scoped down from their original wording where the platform's real constraints (no payment gateway credentials, no cloud storage credentials, no unlimited-retake test infrastructure, etc.) made the literal spec example unbuildable — each such simplification is documented in its own phase's Known Issues section above, following the same "honest about what's real" precedent set as early as Phase 4A's WhatsApp console provider.

---

## Post-3F — Weekly Calendar Timetable & Advance Fee Collection

**Status: Complete and verified.** `npx tsc --noEmit`, `npx eslint .`, and `npm run build` all pass clean. Direct user feedback after exploring the built product (not part of either original spec, and not numbered as a new lettered sub-phase since it's two focused fixes rather than a themed phase): (1) the Timetable was a plain grouped list, not a real calendar; (2) fees should be collectable in advance from parents (bank/JazzCash/Easypaisa + receipt), with the Payments tab reachable from the parent's own nav, and a signal tying "this month's fee paid" to visibility of that month's classes.

**Inspect-first + product decisions confirmed with the user before building:** the existing `Timetable` model is a recurring weekly template (`dayOfWeek` + `startTime`/`endTime`), not date-specific — so "calendar format" means a weekly grid, not a monthly date calendar (confirmed). Whether an unpaid month should actually block class access was confirmed as **soft warning only** — nothing in the app blocks attendance marking or class joining; a banner is purely informational. Whether a parent's submitted receipt should count immediately or wait for staff review was initially confirmed as auto-accept, then **reversed mid-build to staff-approval** after further thought from the user — the shipped behavior is staff-approval (a `PENDING` payment only becomes `PAID`, and only then updates the installment, after a staff member reviews the receipt and clicks Approve).

**A real bug found during live verification, not by inspection:** both the parent-facing and staff-facing Payments tabs computed "Total Paid" by summing *every* payment row regardless of status — harmless before this pass (every payment was always immediately `PAID`), but wrong the moment a `PENDING`-status self-reported payment could exist. Caught by literally submitting a test payment and watching the "Paid" figure jump before any staff approval. Fixed in three places (`parent/page.tsx`, `parent/payments/page.tsx`, `students/[id]/payments-tab.tsx`) by filtering to `status === "PAID"` first — the underlying `paymentsSummary()`/`listRecentPayments()` service functions were already correctly scoped and needed no change.

Verified end-to-end in a real browser: `/admin/timetable`, `/teacher/timetable`, `/student/timetable` all render a real Mon–Sun grid with subject-colored blocks correctly positioned by time, admin/teacher blocks link to `/batches/[id]`; submitted a JazzCash payment as a parent with a real receipt image, confirmed it appeared as "Pending Review" and did **not** move any money/installment figure; approved it from `/admin/payments`'s new review queue, confirmed the installment flipped to Paid, the academy-wide Pending/Collected totals updated, and the parent's own dashboard banner flipped from "not yet paid" to "paid — thank you."

**Follow-up round after further live feedback** ("i dont like the calander layout. change this and make like google calander"): the grid was restyled to match Google Calendar's own visual language — solid saturated event colors (Google's actual default palette) with white text instead of pastel tinted blocks, a sticky Mon–Sun day header, a "today" column tint, hour gridlines down the time gutter, and a "4 PM – 5 PM" time-range line under each event's title. Verified live in the browser as Super Admin on `/admin/timetable`. This surfaced a second real bug (see below), fixed in the same pass.

**A second real bug, also found only via live verification (not code review):** the original per-subject color was `hash(subjectId) % 10` computed independently for each subject — with only 4 real subjects in the seed data, Mathematics and English happened to hash to the same palette slot (`#d50000`), so two different subjects rendered as visually identical red blocks on `/admin/timetable`, silently defeating the user's explicit ask for "different colors." Fixed by assigning colors in first-appearance order among the subjects actually present in the rendered `entries` array (`buildColorMap()`) instead of hashing each id in isolation — guarantees distinct colors as long as a view has no more than 10 subjects on screen, which comfortably covers a school's subject list. Re-verified: Mathematics, Physics, English, and Chemistry each rendered a distinct color.

### Features Completed

**Weekly Calendar Timetable** (`src/components/shared/weekly-timetable-grid.tsx`)
- One shared component (day columns × time rows, subject blocks positioned/sized from real start/end times) reused by all three existing timetable pages (student/teacher/admin) — no new data-fetching, purely a rendering change.
- Styled to match Google Calendar: solid colors from Google's own default event-color palette, white text, sticky day header, today-column tint, hourly gridlines, and a formatted time-range line under each event title.
- Colors are assigned from the fixed 10-color palette in first-appearance order among the subjects present in the current view (`buildColorMap()`), not a stored `Subject.color` field — avoids a schema change and a staff-facing color-picker UI for something purely cosmetic, while still guaranteeing every subject on screen gets a visually distinct color.
- The per-batch Schedule tab (`batches/[id]/schedule-tab.tsx`) deliberately keeps its existing list-with-delete-buttons layout — it's a management/CRUD view, not a viewing experience, and a calendar grid has no natural place for a delete button per entry.

**Advance Fee Collection** (`Payment.receiptFileId`/`isSelfReported`, `PaymentStatus.REJECTED`, `FilePurpose.PAYMENT_RECEIPT`)
- `payments.ts`'s `getCurrentMonthPaymentStatus(studentId)` — installments are already generated one per calendar month (Phase 2), so "the fee covering this month" is just the installment whose `dueDate` falls in the current month; no new period field needed. Powers a soft `MonthlyFeeBanner` on the parent dashboard — informational only, never blocks anything.
- New `/parent/payments` page + nav entry — a parent can view their child's plan/installments/history and submit a payment (method, amount, optional installment, required receipt upload) via `SubmitPaymentDialog`, reusing the exact `FormData`-based file-upload pattern fixed in Phase 3E's homework-upload bug.
- `submitPaymentForReview()` creates the `Payment` row as `PENDING` immediately (visible to the parent right away) but never touches the `Installment` until staff acts. `verifyParentPayment(paymentId, approve)` is the only path that flips it to `PAID` (and re-syncs the installment via a `syncInstallmentStatus()` helper extracted out of the existing `recordPayment()`, so both flows can never compute "is this installment fully paid" differently) or `REJECTED` (record stays visible, never deleted, so the parent can see it was rejected).
- New `/admin/payments` → "Payments Awaiting Review" queue (`ReviewQueue` component) — Approve/Reject with a receipt link, the central place staff work from rather than discovering pending submissions one student at a time.
- `/api/files/[id]` gained a `PAYMENT_RECEIPT` case: staff always; the payment's own student; any parent linked to that student — a leaked file id alone still isn't enough.

### Database Migrations Added

- `20260905095556_payment_receipts_and_calendar_prep` — additive: `FilePurpose.PAYMENT_RECEIPT`, `Payment.receiptFileId`/`isSelfReported`.
- `20260905100057_payment_review_status` — additive: `PaymentStatus.REJECTED`.

### APIs Added

None — Server Actions + `payments.ts`'s new `submitPaymentForReview`/`verifyParentPayment`/`listPendingReviewPayments`/`getCurrentMonthPaymentStatus`.

### Environment Variables Required

None new.

### Known Issues / Limitations

- No maker-checker beyond the approve/reject step itself — any staff member can approve any submission; consistent with the trust level established everywhere else in the app.
- The weekly grid's time window is derived from the min/max start/end times actually scheduled — a batch with only one late-evening class shows a short grid, which is correct behavior, not a bug, but means the visual "day length" isn't consistent academy-wide.
- Overlapping classes within the same day/subject in the same batch would visually stack rather than lay out side-by-side — not something the seeded data exercises, and school timetables rarely double-book a batch, so this wasn't built out.

## Post-3F(b) — Real WhatsApp (Meta), Real Email (SMTP), and Google Meet

**Status: Code-complete and verified with `npx tsc --noEmit`, `npx eslint .`, and `npm run build`.** Not verified end-to-end against live third-party accounts, since going fully live needs credentials only the user can obtain (a Meta WhatsApp Business number, an SMTP mailbox/App Password, a Google Cloud OAuth client) — see README's WhatsApp/Email/Google Meet Integration sections for exact setup steps. Every provider still degrades safely to its console/no-op fallback with zero configuration, so the app runs unchanged out of the box.

**Decisions made with the user before building:** WhatsApp via **Meta Cloud API** (already scaffolded from Phase 4A, just needed real wiring); Email via **SMTP** (nodemailer) rather than a hosted API provider; video via **Google Meet**, not Zoom — Zoom's Basic (free) plan caps group meetings at 40 minutes, and this academy's classes run a full hour, so Zoom would need a paid plan while Google Meet is free with no cap for the calendar owner.

**A real constraint surfaced and designed around, not worked around:** WhatsApp Business API (both Meta and Twilio) only allows freeform text within 24h of the customer's last message — every automated reminder in this app (class/payment/homework/attendance/etc.) is business-initiated and falls outside that window, so Meta requires a pre-approved message template or it rejects the send. Rather than block on this (templates require external review by Meta, usually 1–2 days, and can't be created from this codebase), the system was built to **degrade honestly**: sending as plain text works today (useful for testing), and fails visibly — recorded as `FAILED` with Meta's real rejection reason in the Communication Center, never a crash — until a template is registered. Once registered, filling in that rule's **Meta Approved Template Name** in Settings → Message Templates is the only step needed to switch it to a real templated send; no further code changes.

### Features Completed

**Email** (`src/lib/email/*`, `EmailMessage`, `MessageTemplate.emailSubject`/`emailBody`)
- Byte-for-byte mirrors the WhatsApp architecture from Phase 4A: a provider interface (`send(to, subject, body)`), a console fallback, a real `smtp` provider (nodemailer), `EmailMessage` rows (`QUEUED`/`SENT`/`FAILED`), and a `email.ts` service with the same `queueMessage`/`sendQueuedMessage`/`sendMessage`/`listMessages`/`messageStatusCounts` shape as `whatsapp.ts`.
- Each of the 11 `MessageTemplate` rows gained an `emailSubject`/`emailBody` pair (seeded with sensible defaults, editable in Settings → Message Templates) — a rule only sends email once both are non-empty, so an academy can run WhatsApp-only, email-only, or both per rule with zero code changes.
- `automation.ts`'s `dispatchAlert()` gained a parallel `email` array alongside `whatsapp`, respecting a new `shouldSendEmail()` preference check (mirrors `shouldSendWhatsApp()`); every job/service that already builds WhatsApp targets (`class-reminders`, `homework-overdue`, `payment-reminders`, `trial-expiry`, `inactivity`, `weekly-reports`, `test-score`, `attendance`, `announcements`) now also passes an `email` array built from the same contact lookups, extended with an `email?: string` field.
- `automation-recipients.ts`'s `ContactPoint` gained `email?: string`, sourced from each role's own `email` column (Student/Parent/Teacher/Counselor all already had one — no schema change needed there).
- Communication Center's Email tab, previously an `EmptyState` placeholder describing exactly this as the next step, now shows live stat cards and a message table identical in shape to the WhatsApp tab.

**Real Meta WhatsApp template sending** (`MessageTemplate.metaTemplateName`/`metaTemplateLanguage`, `WhatsAppMessage.variables`)
- `WhatsAppProvider.send()` gained an optional third `template` argument (`{templateName, languageCode, bodyParams}`); `MetaCloudApiProvider` sends a real `type: "template"` payload when present, falling back to `type: "text"` otherwise (Twilio/console providers accept and ignore it — Twilio's own template mechanism is a different Content-SID system, not built out since Meta was the chosen provider).
- `deriveTemplateParams()` (`services/whatsapp.ts`) turns our own named `{{student_name}}`-style template body into Meta's positional `{{1}}`, `{{2}}`... params, in order of first appearance — the convention (documented in README) is to register the Meta template with its placeholders in that same order so positions line up without a second mapping table to maintain.
- `WhatsAppMessage` gained a `variables Json?` column so the original values are available at send time to rebuild positional params, without re-deriving them from callers.

**Google Meet auto-created links** (`src/lib/googlemeet/*`, `LiveClass.googleEventId`, `scripts/get-google-refresh-token.ts`)
- Plain `fetch` calls against Google's OAuth token endpoint and Calendar API (no `googleapis` SDK dependency — matches the lightweight-fetch style already used by the Twilio/Meta providers instead of adding a heavy client library).
- Scheduling a live class with `meetingProvider: GOOGLE_MEET` and no meeting link now calls `createMeeting()`, which creates a Calendar event with `conferenceData.createRequest` and returns the real `hangoutsMeet` join link plus the Calendar event id; the event id is stored on `LiveClass.googleEventId` so cancelling the class later calls `deleteMeeting()` on that same event instead of orphaning it. Times are sent with an explicit `Asia/Karachi` timezone, matching this academy's actual location — the rest of the app treats `scheduledDate`/`startTime`/`endTime` as naive local wall-clock values with no timezone concept, so this is the one place that needed to be explicit about it, to avoid Google silently interpreting the class time in whatever timezone the connected Google account happens to default to.
- `scripts/get-google-refresh-token.ts` is a standalone one-time setup script (`npm run google:connect`) — runs a tiny local HTTP server to catch Google's OAuth redirect, exchanges the code for a refresh token, and prints it to paste into `.env`. Needed because Google deprecated the old copy-paste "out-of-band" OAuth flow in 2022; a loopback redirect is now the only option for a script like this.
- `createLiveClassAction` (`admin/batches/actions.ts`) treats `meetingLink` as optional only when `meetingProvider === GOOGLE_MEET`; still required for `ZOOM`/`CUSTOM`. A failed auto-create (missing credentials, expired refresh token, etc.) surfaces the real error to staff via the same toast-on-`{error}` pattern used everywhere else, rather than silently creating a class with no meeting link.

### Database Migration Added

- `20260905111926_whatsapp_email_meet_integration` — additive: `EmailStatus` enum, `EmailMessage` model, `MessageTemplate.emailSubject`/`emailBody`/`metaTemplateName`/`metaTemplateLanguage`, `WhatsAppMessage.variables`, `LiveClass.googleEventId`.

### APIs Added

None — Server Actions + `email.ts`'s new service functions, `googlemeet/index.ts`'s `createMeeting`/`deleteMeeting`.

### Environment Variables Required

None to keep running as-is (every provider still defaults to console/no-op). To go live: `EMAIL_PROVIDER=smtp` + `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASSWORD`/`SMTP_FROM`; `WHATSAPP_PROVIDER=meta` + `META_WHATSAPP_TOKEN`/`META_WHATSAPP_PHONE_ID` (already existed, just needs real values); `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`GOOGLE_REFRESH_TOKEN` (via `npm run google:connect`) for Google Meet. See README for exact setup steps for each.

### Known Issues / Limitations

- Meta template sending is untestable without a real Meta Business account and an approved template — the positional-parameter derivation is unit-testable in isolation but the actual `type: "template"` payload has not been fired against a live WhatsApp number.
- Twilio's WhatsApp templates (Content API / Content SID) were not built out — Twilio remains scaffolded from Phase 4A and still sends plain text only, since Meta was the provider chosen this round.
- No lead email field exists on the `Lead` model (only `parentPhone`/`whatsapp`), so `LEAD_WELCOME` stays WhatsApp-only — adding lead email capture was out of scope for this pass.
- `deleteMeeting()` is best-effort (errors are logged, never thrown back to the caller) — if it fails (e.g. an expired refresh token at the moment of cancellation), the Calendar event is orphaned silently rather than blocking the class cancellation; nothing currently surfaces that failure to staff beyond the server log.
- The Google Calendar event's timezone is hardcoded to `Asia/Karachi` rather than read from a per-academy setting, since no such setting exists anywhere else in the app.

## Post-3F(c) — Integrations Managed from the Super Admin UI (no .env / redeploy)

**Status: Code-complete, verified with `npx tsc --noEmit`, `npx eslint .`, and `npm run build`.** Direct user request after the Post-3F(b) work above: rather than editing `.env` and redeploying to set WhatsApp/email/Google credentials, the Super Admin should be able to add/change every one of those from inside the app — "everything should be handled from super admin."

**A deliberate scope decision, stated to the user rather than asked as a blocking question:** Google Meet and Google Drive share **one** Google OAuth connection instead of two independent ones — a real academy uses one Google account for both, and it halves the OAuth consent/setup work. If a future need for separate accounts per feature ever comes up, the `IntegrationSettings` row would need a second `google*` field set, but nothing in the current design assumes only one is possible.

**What changed architecturally:** every provider factory (`getWhatsAppProvider()`, `getEmailProvider()`, `getGoogleCredentials()`/`getGoogleAccessToken()`, `getFileStorageProvider()`) now checks a new single-row `IntegrationSettings` table first (same "singleton" pattern as the pre-existing, unused `AIUsageConfig`/`PerformanceConfig` scaffolds — this is the first one actually wired up end-to-end), falling back to the equivalent env var only when the DB value is still the default. This means every one of the previous round's env-var-driven integrations now also has a live UI path, with zero breaking change for anyone who already configured things via `.env`.

**Security consideration, not treated as optional:** every credential field (Meta token, Twilio auth token, SMTP password, Google client secret, Google refresh token) is encrypted at rest (`src/lib/crypto.ts`, AES-256-GCM keyed off `AUTH_SECRET` — no second required secret to configure and protect) before being written to `IntegrationSettings`, and the settings page only ever receives masked values back (`getIntegrationSettingsForDisplay()` returns `"••••••••••••"` or `null`, never the real value) — the real, decrypted values exist only inside `getIntegrationSettingsInternal()`, called exclusively by the server-only provider factories. A blank secret field on save means "leave the existing value alone," so re-saving the WhatsApp provider selector doesn't require re-typing a token that's already stored.

**A real correctness bug surfaced and fixed while building this, not by inspection:** `uploaded-files.ts`'s `readFileBytes()` previously read every file back through *whatever provider is currently configured* (`getFileStorageProvider()`), rather than the provider that specific file was actually saved through (`UploadedFile.storageProvider`, already recorded per-row but never consulted). This was silently correct before only because exactly one provider (`local`) had ever existed — the instant a second real provider (Google Drive) becomes selectable, switching it would have made every previously-uploaded local file 404. Fixed by adding `getFileStorageProviderByName()` and routing all reads through the file's own recorded provider, while `save()` still uses whichever provider is currently active for new uploads.

### Features Completed

**`IntegrationSettings`** (`prisma/schema.prisma`, `src/lib/services/integration-settings.ts`) — one row holding WhatsApp/Email/Google/file-storage configuration, `getIntegrationSettingsForDisplay()` (masked, safe for the browser) and `getIntegrationSettingsInternal()` (decrypted, server-only-callable) as the only two read paths.

**Settings → Integrations** (`/admin/settings/integrations`, Super Admin only via `SUPER_ADMIN_ONLY` — stricter than the `STAFF_ROLES` gate used elsewhere, since these are live external credentials) — four cards: WhatsApp (provider + credentials), Email (provider + SMTP credentials), Google (connection status, Client ID/Secret, Connect/Reconnect/Disconnect), File Storage (Local vs Google Drive).

**In-app Google OAuth connect flow** (`src/app/api/integrations/google/connect`, `.../callback`) — replaces the standalone-script-only approach from Post-3F(b) (that script, `scripts/get-google-refresh-token.ts`, still works and is documented as a fallback for headless deployments, but the UI button is now the primary path). CSRF-protected via a random `state` value round-tripped through a short-lived `httpOnly` cookie. Requests `calendar.events` + `drive.file` + `openid email` scopes in one consent screen; identifies the connected account via Google's `userinfo` endpoint so Settings → Integrations can show "Connected as x@gmail.com."

**Google Drive file storage** (`src/lib/storage/providers/google-drive-provider.ts`) — a second real `FileStorageProvider` implementation alongside local disk, using the Drive API v3's resumable upload protocol (correct for this app's up-to-10MB uploads; Google's own guidance reserves simple/multipart upload for under ~5MB), `drive.file`-scoped so the app only ever sees files it created itself. `UploadedFile.storageProvider` records which provider each file actually lives on, so switching the active provider never breaks previously-uploaded files (see the bug fix above).

### Database Migration Added

- `20260905121935_integration_settings` — additive: `WhatsAppProviderType`, `EmailProviderType`, `FileStorageProviderType` enums, `IntegrationSettings` model.

### APIs Added

- `GET /api/integrations/google/connect` — Super-Admin-only, redirects to Google's OAuth consent screen.
- `GET /api/integrations/google/callback` — Super-Admin-only, exchanges the auth code and saves the connection.

### Environment Variables Required

None — every one of the env vars from Post-3F(b) (`WHATSAPP_PROVIDER`, `META_WHATSAPP_TOKEN`, `META_WHATSAPP_PHONE_ID`, `TWILIO_*`, `EMAIL_PROVIDER`, `SMTP_*`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `GOOGLE_CALENDAR_ID`, `FILE_STORAGE_PROVIDER`) now becomes optional-fallback-only; the intended path is Settings → Integrations.

### Known Issues / Limitations

- Not yet verified against real third-party accounts (same caveat as Post-3F(b)) — the Super Admin still needs to actually paste in real Meta/SMTP/Google credentials for a live end-to-end test; the code path itself is exercised (masked display, save/clear-field semantics, OAuth redirect construction) but not a real Google consent round-trip.
- Google Client ID/Secret creation itself cannot be automated — it requires a human in Google Cloud Console's own UI. Settings → Integrations covers everything downstream of that one paste.
- No credential rotation/expiry UI (e.g. warning before a long-lived Meta token expires) — the settings page shows whether a value is set, not whether it's still valid; a stale credential surfaces as a `FAILED` send in the Communication Center, same as before this round.
- `IntegrationSettings` is a true singleton (one row for the whole app) — there's no per-batch or per-branch override; every academy-wide automation uses the same connected accounts.

## Post-3F(d) — Complete Student & Teacher Profiles (Photos, Teacher Qualifications, Performance Summary)

**Status: Code-complete, verified with `npx tsc --noEmit`, `npx eslint .`, and `npm run build`.** Direct user request: "there should be a complete profile of students and teachers, teachers with their qualifications, their performance points in admin portal... all the profiles should have their pictures."

**Inspect-first findings that shaped the scope:** `User.avatarUrl` and `Student.photoUrl` already existed in the schema, and `AvatarImage` was already a fully-built component (`src/components/ui/avatar.tsx`) — but grep confirmed **zero** call sites ever rendered it; every avatar anywhere in the app (8 usages) showed only initials, never a real photo. So "add pictures" wasn't a schema gap for students, it was a wiring gap: nothing ever let anyone upload one, and nothing ever displayed one. Teacher had no photo field at all, and no qualifications/experience/specialization fields — its profile page was two thin tabs (bio + an "Analytics" tab explicitly commented "not a performance scorecard").

**A clarifying question asked and answered before building:** "performance points" for teachers was ambiguous — a new points/rating system (mirroring the existing student gamification system), or a performance summary from data already tracked? The user confirmed **the latter** — no new scoring mechanism, just make the teacher's existing derived metrics (classes conducted, average student attendance/scores under them, homework review rate, feedback completion) visible immediately on their profile instead of requiring a second tab click. This was a real scope fork — building a from-scratch teacher rating system would have been a materially different (and much larger) feature.

**Photo upload flow, and why it reuses the existing file pipeline rather than a new one:** photos go through the exact same `uploadedFilesService`/storage-provider abstraction as homework submissions and payment receipts (works identically whether the active storage provider is local disk or the Google Drive integration from Post-3F(c) — no special-casing needed). A new `FilePurpose.PROFILE_PHOTO` value drives one new branch in `/api/files/[id]/route.ts`'s access check: unlike homework/payment/support attachments (each re-derives access from the owning record), a profile photo is treated as directory-style, low-sensitivity information — any signed-in user can view one, matching how a name or batch badge is already visible to any authenticated role.

### Features Completed

**Real photo upload/display everywhere an avatar renders on a profile page** (`src/components/shared/photo-upload-avatar.tsx`, `src/lib/services/profile-photos.ts`) — a reusable client component wraps the existing `Avatar`/`AvatarImage`/`AvatarFallback` primitives with a hover-to-upload affordance (shows an instant local object-URL preview so the new photo appears without waiting for a page reload); the underlying `uploadProfilePhoto()` service restricts to PNG/JPEG/WEBP (documents like PDFs, otherwise allowed by the shared upload validator, don't make sense as a "photo") and returns a `/api/files/{id}` URL to store on the owning record. Wired into both the student profile header (`students/[id]/page.tsx`) and teacher profile header (`teachers/[id]/page.tsx`), editable by staff or the profile's own owner (a teacher editing their own photo, a student editing their own). Also added as a small non-editable avatar thumbnail in the `/admin/students` and `/admin/teachers` list tables, so photos are visible while browsing, not just after opening a profile.

**Teacher qualifications** (`Teacher.qualification`/`experienceYears`/`specialization`) — a new "Qualifications" card on the teacher profile (qualification text, years of experience, specialization/subject expertise), editable via a new `EditTeacherProfileDialog` (reuses the existing shared `EntityDialog` pattern) that also covers the pre-existing `bio` field, which previously had no edit UI at all despite being a real column.

**Teacher performance summary folded into the main profile view** (`teachers/[id]/page.tsx`) — the separate "Analytics" tab (and its now-redundant `analytics-tab.tsx` file, deleted) was removed in favor of a "Performance" section directly on the single-page profile, showing the exact same five metrics (`analyticsService.teacherAnalytics()` — classes conducted, average student attendance, homework review rate, feedback completion rate, average student performance) with the same "not a scorecard, for operational quality monitoring" framing carried over verbatim. No new computation — this is the "performance summary from existing data" the user confirmed, made immediately visible instead of tab-gated.

### Database Migration Added

- `20260905180355_teacher_profile_and_photos` — additive: `FilePurpose.PROFILE_PHOTO`, `Teacher.photoUrl`/`qualification`/`experienceYears`/`specialization`.

### APIs Added

None — Server Actions (`teachers/[id]/actions.ts`: `updateTeacherProfileAction`, `uploadTeacherPhotoAction`; `students/[id]/profile-actions.ts`: `uploadStudentPhotoAction`) plus the existing `/api/files/[id]` route's new `PROFILE_PHOTO` branch.

### Environment Variables Required

None.

### Known Issues / Limitations

- Photo upload isn't offered on the student/teacher *creation* forms — only after the record exists, via the profile page. Scoped this way deliberately: the creation forms use a different (JSON, not FormData) submission pattern, and adding a photo step to them would have doubled the surface area touched for a need already fully met by "create the record, then set a photo from its profile."
- No image resizing/cropping — whatever PNG/JPEG/WEBP is uploaded is stored and served as-is (subject to the app-wide 10MB upload cap). A very large source photo will render at whatever size the `Avatar` component's `object-cover` CSS produces, but isn't compressed server-side.
- Parent profiles were out of scope for this pass (the user asked specifically about students and teachers) — `Parent` has no photo field and wasn't touched.
- Qualification/experience/specialization are freeform text/number fields, not a structured multi-degree history — matches the existing simplicity of `bio` rather than introducing a new relational sub-resource for what is, for a small academy, typically a one-line credential summary.

## Post-3F(e) — Per-Subject Teacher Scoping Within a Shared Batch

**Status: Fixed and verified live in the browser (both as a restricted teacher and as unrestricted staff).** User-reported, not self-discovered: viewing a batch as Sir Usman Tariq (its Mathematics teacher) showed Miss Sana Malik's Physics entries throughout Schedule/Classes/Homework/Tests/Recordings — the user asked whether this was a glitch or expected.

**What it actually was:** not a bug in the sense of broken code — `batches/[id]/page.tsx` fetched every list (`listTimetable`, `listLiveClassesForBatch`, `listHomeworkForBatch`, `listTestsForBatch`, `listRecordingsForBatch`) scoped to the whole batch, with no per-viewer filtering, and passed the same unfiltered data to every tab regardless of which of the batch's (possibly several) teachers was looking. A batch can have multiple teachers, each teaching a different subject to the same shared student roster (`BatchTeacher.subjectId`) — so this was a real design gap once looked at from "should Teacher A see Teacher B's subject," not a rendering defect. Confirmed with the user before fixing: they wanted teachers restricted to their own subject (not the alternative of keeping full shared visibility for coordination purposes).

**Fix:** `batches/[id]/page.tsx` now computes `teacherSubjectIds` (the viewing teacher's own non-null `subjectId`s from their `BatchTeacher` rows on this batch) and, only when the viewer is a `TEACHER` role with at least one subject-scoped assignment, filters every list down to matching `subjectId`s before it ever reaches a tab component — Schedule, Classes, Attendance (which reads its class list from the same filtered `liveClasses`), Homework, Tests, and Recordings all narrow automatically from this one filter point, no changes needed inside the tab components themselves. The Subject and Teacher pickers on every "create" form (`availableSubjects`/`availableTeachers`) are filtered the same way, so a scoped teacher can't create a Homework/Test/Recording under a subject that isn't theirs, or assign a class to another teacher, via the UI. Staff (`STAFF_ROLES`) and a teacher whose assignment has no subject set (a general, unscoped row) keep unrestricted access, matching prior behavior.

### Known Issues / Limitations

- The Subject/Teacher restriction is enforced by what the UI's dropdowns offer, not by re-validating the submitted `subjectId`/`teacherId` inside each create Server Action — a request crafted outside the UI could still submit an out-of-scope value. This matches the trust level already established for every other create action in the app (the real gate is `assertCanManageBatch`, i.e. "are you assigned to this batch at all"), so wasn't treated as a blocking gap for this fix, but would be worth closing if this app's threat model changes.

## Post-3F(f) — Knowledge Base Redesign & Upload/Review Role Split

**Status: Complete and verified live in the browser** (as a scoped Teacher, an unrestricted Counselor, and Staff). Two direct user requests: make Knowledge Base browse like My Batches (batch cards → open a batch → see its notes), and restrict both upload and review by subject/role — "maths teacher can see only maths notes... Notes should only be approved by 3 roles: counselor, admin and super admin."

**Design decisions confirmed with the user:** upload stays open to any academic staff member (teachers upload their own subject's notes), but *review* is a deliberately separate, smaller role list that excludes Teacher entirely — even a teacher reviewing their own upload sees no Approve/Reject controls. This reuses the existing `scopeFilter` "null tag = applies to all" convention already established for Student Study Assistant grounding, extended to match a batch's own `academicLevel`/`board`/`group` plus a teacher's own subject IDs.

### Features Completed

**Batch-card Knowledge Base** (`/knowledge-base`, `/knowledge-base/[batchId]`) — the flat document list became a batch-card grid (staff/Counselor see every batch via new `listAllBatchesBasic()`; a Teacher sees only their own via the existing `listBatchesForTeacher()`), opening into a per-batch note list (`listDocumentsForBatch()`) pre-scoped to that batch's academic tags and, for a plain Teacher, further narrowed to their own subject(s) in that batch (reusing Post-3F(e)'s `teacherSubjectIds` pattern). The Add Note form dropped its manual academicLevel/board/group/subject pickers — they're now inferred from which batch card was opened.

**Upload vs. review role split** (`src/lib/permissions.ts`: `KNOWLEDGE_BASE_ACCESS_ROLES`, `KNOWLEDGE_BASE_REVIEWER_ROLES`) — access to the section at all is `SUPER_ADMIN`/`ADMIN`/`TEACHER`/`COUNSELOR`; upload stays `ACADEMIC_STAFF_ROLES` (unchanged); review (`reviewKnowledgeDocumentAction`) is now gated to a separate, smaller `SUPER_ADMIN`/`ADMIN`/`COUNSELOR` list — a Teacher never sees Approve/Reject, including on their own pending upload. Counselor gained Knowledge Base access and a nav link it never had before.

### Database Migration Added

None — pure permission/query/UI reshuffling over the existing `KnowledgeDocument` model from Phase 3A.

### Environment Variables Required

None.

### Known Issues / Limitations

- None new — this reuses every access/scoping primitive already verified in Post-3F(e) and Phase 3A.

## Post-3F(g) — Student Portal Subject-Card Redesign

**Status: Complete and verified live in the browser** as a real student login. Direct user request, in two parts: make Homework/Tests/Recordings/Study Material look like the teacher portal's My Batches cards, subject-wise ("do same for attendance and show percentage on respective cards").

**Design pattern:** every one of the 5 pages became a subject-card grid at its existing URL, each card linking to a new `/subject/[subjectId]` detail route that reuses the exact same client component and status logic the flat page used before (`SubmitHomeworkDialog`, the 4-section Test categorization extracted into a shared `categorize.ts`, `RecordingItem`, `MaterialItem`, the `ProgressBar`+`DataTable` attendance history). No business logic was rewritten — only how students navigate to it. The nested `/subject/[subjectId]` segment (rather than reusing an existing `[id]` slot) avoids a Next.js dynamic-route-name conflict with each page's own per-item route (e.g. `/student/tests/[id]` for one test vs. `/student/tests/subject/[subjectId]` for the subject-grouped view) — confirmed by a clean production build listing all routes with no conflicts.

**Attendance's percentage badge** reuses the same `computeAttendanceRate()` every other attendance surface calls, color-coded success/warning/destructive by rate (≥75% / ≥50% / below).

### Features Completed

- `/student/homework`, `/student/tests`, `/student/recordings`, `/student/study-material`, `/student/attendance` — each rewritten to a `grid gap-4 sm:grid-cols-2 lg:grid-cols-3` subject-card layout with a per-subject count/badge (pending homework, available tests, unread material, or attendance %).
- 5 new `.../subject/[subjectId]/page.tsx` detail routes, each a straight per-subject filter over the same query the flat page already ran.

### Database Migration Added

None — presentation-only change over existing queries.

### Environment Variables Required

None.

### Known Issues / Limitations

- None new.

## Post-3F(h) — Free Automated Attendance Detection (Tab-Heartbeat Estimate)

**Status: Code-complete, verified with `npx tsc --noEmit`, `npx eslint .`, `npm run build`, and a live end-to-end test in the browser plus targeted script-driven checks of the finalize job.** Direct user request, refined over three follow-ups: "the app should auto detect the attendance... if the student watch 80% of the live class, mark Present, 50% half present" → confirmed the meeting platform is Google Meet (already connected via Post-3F(c)) → "i want free but automated attendance," ruling out any paid API.

**Why a heartbeat proxy and not real join/leave data:** researched both platforms before building anything. Zoom's Reports API can give real per-participant join/leave times but needs a Zoom API app the academy doesn't have, and this academy uses Google Meet anyway. Google's own real per-participant attendance data requires the **Admin Reports API**, which only exists on a paid **Google Workspace** domain — not available to the personal Gmail account (`headmarkcoaching@gmail.com`) already connected for Meet-link creation. Google also blocks iframe-embedding a Meet call, so there's no way to observe in-meeting engagement directly. The only genuinely free signal left is client-side: whether the student's own dashboard tab stayed open and focused for how much of the class window. Presented to the user as exactly that — an estimate, always teacher-correctable, never presented as verified fact — and confirmed as the approach to build.

**How it works end-to-end:** while a `LIVE` class's Join button (`JoinLiveClassButton`) is open in a student's tab, it pings `pingLiveClassPresenceAction` every 30s (skipped while the tab is hidden/unfocused via `document.visibilityState`), which the `pingLiveClassPresence` service accepts only if the student is enrolled in that class's batch and the current time falls within the class's scheduled window (± 5 min grace) — each accepted ping adds 30s to that student's `LiveClassPresence.activeSeconds` for that class. A new scheduled job, `attendance-auto-detect` (every 10 minutes locally via `run-jobs.ts`, or on the same `/api/cron/[job]` mechanism as every other job in production), finds every non-cancelled class whose scheduled end time passed at least 15 minutes ago (within the last 3 days, to avoid a first-run flood over old history) and, for every enrolled student **who doesn't already have an Attendance row for that class** (a teacher's manual mark — past or future — is never touched), computes `activeSeconds / classDurationSeconds` and creates one: ≥80% → `PRESENT`, ≥50% → `PARTIAL` (new status, rendered "Partial"), else → `ABSENT` — always flagged `isAutoDetected: true`. `markAttendance` (the existing teacher-facing action) now explicitly sets `isAutoDetected: false` on every manual mark or re-mark, so a teacher's judgment call always overrides and never shows the "estimate" label again. `computeAttendanceRate()` was updated to weight `PARTIAL` as half a Present, so every attendance-percentage surface already built (dashboard progress bar, subject-card badges, parent reports, engagement scoring, goals) picks up the new status with no per-caller change.

**Verified, not just built:** a real student login pinged a live test class and a `LiveClassPresence` row appeared correctly; three past test classes (85%/60%/0% simulated activity) run through the actual `attendance-auto-detect` job (via its real `/api/cron` endpoint, matching how it runs in production) produced exactly `PRESENT`/`PARTIAL`/`ABSENT` with `isAutoDetected: true` on all three, and the student-facing attendance detail page correctly rendered the new "Auto (estimated)" badge next to each; all test data was cleaned up afterward. The teacher-override reset (`isAutoDetected: false` on manual mark) was verified by direct code review of the single two-line change in `markAttendance`'s upsert, rather than re-driving the same browser flow a second time, given how small and directly inspectable that path is.

### Features Completed

**Schema** — `AttendanceStatus.PARTIAL`; `Attendance.isAutoDetected`; new `LiveClassPresence` model (`liveClassId`+`studentId` unique, `activeSeconds`, `lastPingAt`); `AutomationRuleKey.ATTENDANCE_AUTO_DETECT`.

**`pingLiveClassPresence`** (`src/lib/services/batches.ts`) — access-controlled, time-window-gated heartbeat upsert; **`pingLiveClassPresenceAction`** (`src/app/(dashboard)/student/actions.ts`) is its only caller.

**`JoinLiveClassButton`** (`src/components/shared/join-live-class-button.tsx`) — replaces the plain external-link anchor on the student dashboard's "Today" card; opens the meeting link and starts/stops the heartbeat interval itself.

**`attendance-auto-detect` job** (`src/lib/jobs/attendance-auto-detect.ts`) — registered in `JOB_REGISTRY` and `scripts/run-jobs.ts` (every 10 minutes), logs via `automationService.logAutomation` like every pure-recalculation job before it (Engagement/Predictive-Risk precedent).

**UI** — `StatusBadge` gained a `PARTIAL` mapping; teachers can now also manually select "Partial" in the batch Attendance tab; both the teacher's attendance history table and the student's per-subject attendance detail page show an "Auto (estimated)" indicator next to any `isAutoDetected` row.

### Database Migration Added

- `20260905222452_attendance_auto_detect` — additive: `AttendanceStatus.PARTIAL`, `Attendance.isAutoDetected`, `LiveClassPresence` model, `AutomationRuleKey.ATTENDANCE_AUTO_DETECT`.

### APIs Added

None — Server Action (`pingLiveClassPresenceAction`) + the existing generic `/api/cron/[job]` mechanism now also serves `attendance-auto-detect`.

### Environment Variables Required

None new.

### Known Issues / Limitations

- This is explicitly an estimate, not proof of attendance — a student could leave a physical device with the tab open and unattended, or a household's shared network/device could inflate presence for a class no one is actually watching. This is why it's always flagged `isAutoDetected` and always fully overridable by a teacher, never presented as verified fact.
- A ping only fires while the tab is open and its own JS is running — a phone browser backgrounding the tab, or the student joining the Meet app natively without keeping the dashboard tab open at all, will under-count real attendance. There is no way to close this gap without either the paid Google Workspace Admin Reports API or a fundamentally different (non-free) tracking mechanism.
- The finalize job's 3-day lookback window means a class whose presence was never finalized (e.g. the job didn't run for several days) ages out silently rather than finalizing late — chosen deliberately to avoid ever bulk-creating a flood of `ABSENT` rows against old history the moment this feature first deployed.
- Heartbeat trust is client-declared, not measured server-side: a single accepted ping always adds a fixed 30 seconds regardless of how much wall-clock time actually elapsed since the last one, and nothing detects a student calling the action directly outside the button's own timer. Consistent with this app's existing trust level for student-submitted client actions elsewhere (e.g. video-progress tracking), and low-stakes here since the output is always an overridable estimate, not a final grade or record.

## Post-3F(i) — Regression Sweep, Leads Kanban Board, Parent Report Redesign, Fee Plan on Conversion, Recording Access Control

**Status: Complete and verified.** `npx tsc --noEmit`, `npx eslint .`, and `npm run build` all pass clean throughout. A single long session covering a full regression sweep across every portal (Teacher/Student/Counselor/Admin/Super Admin/Parent) after the attendance-auto-detect work, plus four separate direct user requests that came out of that sweep and follow-up conversation. Each is its own independent change; grouped here because they landed in the same pass rather than as separate lettered phases.

### Regression Sweep Findings

Walked every portal live in the browser after Post-3F(h). Two real, pre-existing gaps surfaced (neither caused by that phase's own changes, but only found by testing it against real data):
- **`batches/[id]/page.tsx`'s Attendance tab passed the whole batch's unfiltered `attendanceHistory` to `AttendanceTab`** even for a subject-scoped teacher — Schedule/Classes/Homework/Tests/Recordings were already correctly filtered by Post-3F(e), but the history table was missed. Fixed by deriving `attendanceHistoryScoped` the same way as every other list on that page and threading it through to both `history` and `existingAttendance`.
- **The Student 360 profile's own Attendance tab** (`students/[id]/page.tsx`, a third, separate render of attendance history alongside the batch page and the student's own subject-detail page) never got the "Auto (estimated)" badge added in Post-3F(h) — fixed for consistency across all three surfaces.

Otherwise clean across all six portals, confirmed with real logins for each role including every seeded parent account.

### Leads Kanban Board + Source (Counselor portal)

User's own exploratory question ("is there another way to represent my leads?") led to a recommendation (Kanban board, kept as an added view rather than replacing the table) that the user then asked to build, adding two explicit requirements: keep classes distinguishable, and surface lead source (already captured on every lead since Phase 3, but never shown anywhere in the UI until now).

- **`src/app/(dashboard)/counselor/leads/leads-board.tsx`** (new) — 9 stage columns, native HTML5 drag-and-drop (no new dependency) backed by the existing `changeLeadStageAction`, plus a per-card `Select` as a keyboard/touch-friendly fallback to dragging. Each card shows the student's class/level badge and lead-source badge (Facebook Ads, Website, Referral, etc. — reusing `StatusBadge`'s title-case fallback, since these values aren't in its `STATUS_CONFIG` map) and a color-coded overdue follow-up date.
- **Board/List toggle** on `/counselor/leads` — List is the pre-existing paginated `DataTable`, now also showing the new Source column; both views share a new **Class filter** (`FilterSelect` on `academicLevelId`) alongside the existing Stage filter (Stage only shown in List view, since the board already segments by stage visually).
- **`src/lib/services/leads.ts`** — `listLeads()` gained `academicLevelId` filtering; new unpaginated `listLeadsForBoard()` for the board (a counselor's lead count stays in the dozens, not thousands).
- Verified live: dragging/selecting a card's stage persists across reload; the Class filter correctly narrows the board; List view carries the same filters over from Board view.

### Fee Plan Required on Lead Conversion

Investigating a separate complaint ("there is no installment plan offered by us") found that 25 of 26 students already had a real payment plan — the one exception was a student converted from a lead moments earlier, who had **zero** plan, meaning fee tracking for a real enrolled student was silently just... missing. Root cause: `convertLeadToStudent()` created the `Student` row but never touched `PaymentPlan` — creating one was left as a manual follow-up step nobody was reminded to do.

**Fix, per the user's choice between two options presented:** the "Convert to Student" dialog now collects Total Fee, Number of Installments, and First Due Date as part of conversion itself, and `convertLeadToStudent()` creates the student and its payment plan together — no student can be created untracked going forward. `src/app/(dashboard)/leads/[id]/convert-button.tsx` was rewritten from a plain `ConfirmDialog` to an `EntityDialog` reusing the exact field set as the existing standalone "Create Payment Plan" dialog. The one pre-existing untracked student (created before this fix) was deliberately left alone rather than backfilled with an invented fee number — that's a real business decision only staff should make, via the same "Create Payment Plan" button that already exists on any student with no plan.

Verified live: converted a throwaway test lead through the real dialog, confirmed a real 3-installment `PaymentPlan` was created atomically with the student, then cleaned up the test data.

### Parent Report Visual Redesign

Direct user request: report presentation "should be bold highlighted with colors to show performance in better way." The existing "don't overwhelm parents with charts" design rule (documented in `weekly-summary-card.tsx` since Phase 3) was kept — no charts added, only color and weight.

- **`src/app/(dashboard)/parent/report-item.tsx`** (new) — each `ParentReport` now renders as color-coded pill badges for Attendance/Homework (reusing the same ≥75/≥50 success/warning/destructive thresholds already used by the student subject-card attendance badges), the report's `overallScore` shown prominently for the first time (the field existed on the model since Phase 3 but was never actually displayed anywhere), teacher feedback in a soft quote box, weak areas as an amber warning callout, and next-week goal in a blue-accented box.
- **`weekly-summary-card.tsx`** — the "This Week" Attendance/Homework numbers are now bold and color-coded using the same `perfTone()` helper, exported from `report-item.tsx` for reuse.
- Verified live in the browser as a real parent login.

### Recording Access Control (2-Day On-Demand)

Direct user concern: unrestricted, permanently-available class recordings let students skip live classes entirely. Two follow-up questions nailed the mechanics: **only** a student whose attendance for that specific class was ABSENT/PARTIAL/EXCUSED can request a recording (someone who attended live has no need to), and requesting starts a **48-hour clock from that moment** (not from the class date), so a slow-to-check-back student still gets the full window once they do act.

**A real gap found before building anything:** `ClassRecording.liveClassId` already existed in the schema and was even read by `next-actions.ts`'s "catch up on a missed class" suggestion — but the recording-upload form never had a field for it, so every recording ever created (including the seeded demo one) has `liveClassId = null`. That existing "catch up" feature was effectively dead code; no recording could ever match. Fixed as part of this change by making the field required going forward — a teacher must now pick which live class session a recording is of when uploading it (`batches/[id]/recordings-tab.tsx` gained a required "Which live class session is this?" select, sourced from the batch's own live classes). Pre-existing `liveClassId = null` recordings are grandfathered — they have no eligibility signal to check, so they stay open the old way rather than being retroactively locked.

- **Schema** — new `RecordingAccessRequest` model (`recordingId`+`studentId` unique, `requestedAt`, `expiresAt`); `ClassRecording.liveClassId` stays nullable at the DB level for backward compatibility, but is now required by the create action's validation.
- **`src/lib/services/recording-access.ts`** (new) — `getRecordingAccessMap()` (bulk eligibility + active-access lookup for a list page, two queries total rather than one per recording) and `requestRecordingAccess()` (upsert — re-requesting after expiry simply renews the 48h window rather than being blocked).
- **`RecordingItem`** (`student/recordings/recording-item.tsx`) — now branches on three states: unlinked/legacy (always open, unchanged), eligible-and-unlocked (Watch/video + a live-updating countdown badge), eligible-but-locked ("Request Recording (48h)" button), and ineligible (a plain muted note, no action at all — someone who attended live simply isn't offered this).
- Subject-card overview (`student/recordings/page.tsx`) gained an "N to unlock" badge per subject, matching the "pending"/"unread" badge pattern already used by the Homework/Study Material subject cards.
- `next-actions.ts`'s "catch up on a missed class" suggestion now also matches `PARTIAL` (previously only ABSENT/EXCUSED), and its wording was updated to reflect that unlocking is now a request, not instant access — this feature becomes real (not dead) for every recording created from now on.
- Verified live end-to-end: a teacher uploaded a recording linked to a real class where all 5 students were auto-detected `ABSENT`; the legacy recording stayed fully open while the new one showed "Request Recording"; a student clicked Request and got a live 48-hour countdown that persisted across reload; the eligibility check was confirmed to correctly exclude a student marked `PRESENT` for that same class. All test data (recording, temporary attendance override) was cleaned up afterward.

### Database Migration Added

- `20260907044801_recording_access_requests` — additive: `RecordingAccessRequest` model.

### APIs Added

None — Server Actions only (`requestRecordingAccessAction`; the leads board reuses the existing `changeLeadStageAction`; conversion reuses `convertLeadToStudentAction`, extended with new required fields).

### Environment Variables Required

None new.

### Known Issues / Limitations

- The Kanban board's drag-and-drop is native HTML5, which has no touch support on mobile — the per-card `Select` fallback covers that, but dragging itself is a desktop-only interaction.
- A student can renew their own 48-hour recording window indefinitely by re-requesting after each expiry — there's no cap on re-requests. Matches this app's established low-friction trust level for student-facing actions (e.g. the free attendance heartbeat), and the real deterrent (needing to remember to come back and re-request rather than just always having it open) is the point of the feature.
- Recordings uploaded before this change (`liveClassId = null`) can never become eligibility-gated retroactively — there is no batch-relink UI to go back and match old recordings to their live class after the fact.

**Follow-up fix, found while checking the feature's boundaries:** the Student 360 profile page (`students/[id]/page.tsx`) has its own, separate Recordings tab — reachable by staff, the shared teacher, the student themself, and any linked parent — that showed every recording via a bare, unconditional "Watch" link with none of the above gating. This completely bypassed the feature for two roles: a student could always get around their own request/48h restriction just by opening their own profile, and — per explicit user instruction ("parents should not get the recordings") — a parent had access to recordings at all, unrestricted. Fixed by branching that tab three ways: staff/teacher keep the original unrestricted table (legitimate oversight, unchanged); a student viewing their own profile now gets the exact same `RecordingItem` component and access map as `/student/recordings` (no second implementation to drift out of sync); the tab is hidden entirely for a parent viewer. Verified live with real logins for all three cases.

**Second follow-up, same profile page:** the user separately noticed the Classes and Attendance tabs were near-duplicates (same date/subject/class columns, differing only in what "status" meant) and asked for them to be merged. Fixed by building one `classHistoryRows` list from `getStudentClasses()` (the superset — every scheduled class, not just ones with a recorded attendance mark) and left-joining in the matching `Attendance` row by `liveClassId`: a class row shows its attendance status once one exists (with the "Auto (estimated)" badge, same as before), or falls back to the class's own lifecycle status (Upcoming/Live/Cancelled) when it hasn't happened yet or was never marked. The separate "Classes" tab and its `classColumns` were removed; the "Attendance" tab now covers both. Verified live as staff and as the linked parent.

## Post-3F(j) — Command Center Merged into the Dashboard

**Status: Complete and verified.** Direct user request after asking what distinguished the two pages: "we should merge it in both admin and super admin portals... there is no action buttons so no use its space consuming." The Dashboard (`/admin`) is the operational, action-driving page (today's classes, at-risk students with a Contact Parent button, follow-ups, priority actions); Command Center (`/admin/command-center`) was a read-only executive rollup (Business/Academic/Message/AI/Automation health) with nothing to click through — a second full page for content nobody was acting on.

Merged Command Center's content into the Dashboard as a new **"Academy Health Overview"** section, collapsed by default via the existing `DetailsToggle` component (the same "simple summary first, detail optional" pattern already used on the Parent dashboard) — so the primary, actionable dashboard isn't buried under read-only metrics, but the health rollup is one click away on the same page instead of a whole separate route. `adminNav()` (shared by both `ADMIN` and `SUPER_ADMIN` — confirmed both roles use the exact same nav function) lost the "Command Center" entry; the old `/admin/command-center` route now just `redirect()`s to `/admin` rather than being deleted outright, so any existing bookmark or link still lands somewhere real instead of a 404.

Verified live as both a Super Admin and a regular Admin: the nav no longer shows Command Center, the Dashboard's new toggle expands to the exact same Business Health / Academic & Student Health / Message Delivery / AI Usage / Automation & System Health content the old page had, and visiting the old URL directly redirects to `/admin`.

### Database Migration Added

None — presentation-only change over `getExecutiveDashboard()`, unchanged since Phase 3F.

### Known Issues / Limitations

- None new — this reuses `getExecutiveDashboard()` and `DetailsToggle` exactly as they already existed.

## Post-3F(k) — Study Material Redesigned to Match Knowledge Base

**Status: Complete and verified.** Direct user request, after asking what distinguished Study Material from Knowledge Base: "kindly redesign this study material like wise across portals." The staff-facing `/admin/study-material` was still the flat, everything-mixed-together `DataTable` that Knowledge Base itself looked like before Post-3F(f) — a single list of every material from every level and subject at once, with a manual Academic Level dropdown in the upload form. The student-facing side was already redesigned into subject-cards back in Post-3F(g), so this pass was staff-side only.

**Why level cards, not batch cards:** Knowledge Base groups by batch because `KnowledgeDocument` is genuinely batch-scoped. `StudyMaterial` has no `batchId` at all — it's scoped by `academicLevelId` + `subjectId` only (by design: it's a level-wide library, not tied to one specific class section). So the equivalent first-level grouping here is **Academic Level**, not batch — the same "pick the higher-level grouping first" idea, applied to what this model is actually scoped by.

- **`/admin/study-material`** — now a grid of Academic Level cards (Class 8 through 2nd Year), each showing its material count, mirroring Knowledge Base's batch-card page exactly (`Card`/`CardHeader`/`CardTitle`, `ArrowRight` button).
- **`/admin/study-material/[levelId]`** (new) — the per-level material list, styled identically to Knowledge Base's per-batch note list (`li` cards with title/subject-badge/type-chapter line, a Watch-file icon button, and delete), replacing the old `material-list.tsx` `DataTable` entirely. The "Upload Material" form dropped its Academic Level field (inferred from which level card was opened, passed via `EntityDialog`'s `defaultValues` — same hidden-field trick Knowledge Base used) while keeping Subject/Type/Chapter/File Link as visible fields.
- `src/app/(dashboard)/admin/study-material/actions.ts` — `createStudyMaterialAction`/`deleteStudyMaterialAction` both gained an optional `levelId` param so they can revalidate the specific nested route, same pattern as `createKnowledgeDocumentAction`'s `batchId` param.

Verified live as Super Admin: level cards show correct counts, opening a level shows only its own material, uploading a real test item through the new form persisted with the correct level and subject and the count updated, deleting it removed it and the count reverted — all confirmed with a page reload between steps (not just from client state). Re-confirmed the student-facing `/student/study-material` subject-card page (already card-based since Post-3F(g)) was untouched and still correct.

### Database Migration Added

None — presentation-only restructuring over the existing `StudyMaterial` model.

### Known Issues / Limitations

- The Subject picker in the per-level upload form still lists every academy-wide subject, not just subjects relevant to that level — `StudyMaterial` has no level-to-subject relationship to filter by (unlike Knowledge Base, which can filter to a batch's actual `BatchSubject` rows). Matches the exact behavior the old flat page already had; not a regression introduced by this redesign.

## Post-3F(l) — Communication Center Consolidated Into an Actionable Hub

**Status: Complete and verified.** Two-part user request, arrived across three turns: first asking what Communication Center was for (answer: a read-only monitoring page — WhatsApp/Email/SMS/Notifications/Announcements/Logs — with exactly one clickable thing on it, a link out to the separate Announcements page), then confirming "it has no action button?", then: "make it one name communication center... we should be able to send the WhatsApp, Email, SMS, Notifications, Announcements and make campaigns from here... in both admin and super admin portals."

**Naming fix:** the nav's "Communication" section had two separate items — "Communication Center" and "Announcements" — for what the user experienced as one concept. Removed "Announcements" from `adminNav()` (shared by both `ADMIN` and `SUPER_ADMIN`), leaving a single "Communication Center" entry; the old `/admin/announcements` route now redirects there (same pattern as the Command Center merge) rather than being deleted, since `createBatchAnnouncementAction` and `CreateAnnouncementDialog` in that folder are still live, reused by both a batch's own Announcements tab and the new consolidated page.

**"Make campaigns" — the audience-resolution logic already existed, just locked inside Announcements:** `createAnnouncement()` already did a real 3-channel bulk send (Notification + WhatsApp + Email) to a resolved audience (All Students / Parents / Teachers / one Academic Level / one Batch) — that resolver (`resolveTargetContacts`, exported and renamed for reuse) is exactly what "campaign" targeting needs. Rather than building a second targeting system, every new channel's campaign action calls the same function Announcements already relied on, so "who does 'All Parents' mean" stays answered in exactly one place.

**SMS had zero infrastructure** ("SMS is future-ready... no provider wired in yet," per Phase 3F) — no model, no service, no provider. Rather than leave it as a placeholder while every other channel gained a compose feature, added the same provider-abstraction shape WhatsApp/Email already use (`SmsProvider` interface, `ConsoleSmsProvider`, `getSmsProvider()`) — but deliberately **without** replicating their full Settings-driven provider-swap system (`IntegrationSettings` fields, encrypted secrets, a Settings UI card), since there is no real SMS provider to swap to yet and building that scaffolding for a single hardcoded case would be speculative. A real provider (e.g. Twilio) can slot into `getSmsProvider()` later exactly the way `SmtpEmailProvider` did, without changing anything upstream.

### Features Completed

**Shared audience targeting** — `resolveTargetContacts()` (formerly private to `announcements.ts`) is now exported and reused by all four new campaign actions, unchanged in behavior for its original Announcements caller.

**Four new campaign actions** (`src/app/(dashboard)/admin/communication/actions.ts`) — `sendWhatsAppCampaignAction`, `sendEmailCampaignAction`, `sendSmsCampaignAction`, `sendNotificationCampaignAction`. Each: validates an audience selector + channel-specific content (body, or subject+body, or title+message), resolves contacts, and sends to every contact with the right contact method (phone for WhatsApp/SMS, email for Email, userId for Notifications) in a non-fatal per-recipient loop — one bad contact can't sink the batch, same precedent `createAnnouncement` already established.

**Four campaign dialogs** (`campaign-dialogs.tsx`) — `WhatsAppCampaignDialog`, `EmailCampaignDialog`, `SmsCampaignDialog`, `NotificationCampaignDialog`, each an `EntityDialog` with the same Audience/Level/Batch field set `CreateAnnouncementDialog` already used (both optional pickers always shown, validated server-side against the chosen audience — the same "don't hide conditional fields, just label them" pattern already established there) plus channel-specific content fields.

**SMS as a real (console) channel** — new `SmsMessage` model (reuses the existing `EmailStatus` enum — QUEUED/SENT/FAILED — rather than adding a near-identical one), `src/lib/services/sms.ts` mirroring `email.ts`'s shape minus templating (manual-send only, no automation rule drives it), and `src/lib/sms/*` provider scaffold. The SMS tab now has real stats, a real message log, and a working "New Campaign" send — clearly labeled as console-only until a real provider exists.

**Announcements folded in** — the Announcements tab now has the actual `CreateAnnouncementDialog` and the full announcement list inline (both moved verbatim from the old standalone page), instead of a "Manage Announcements" link out to a separate page.

Verified live as both Super Admin and regular Admin: nav shows one "Communication Center" entry; sent a real SMS campaign to "Teachers" (4/4 delivered via the console provider, confirmed in the log after a reload); sent a real Notification campaign to "Teachers" (confirmed in the log); the Announcements tab creates and lists inline; the old `/admin/announcements` URL redirects to `/admin/communication`; a batch's own Announcements tab (unrelated code path, same underlying action) still works. All test sends were cleaned up afterward.

### Database Migration Added

- `20260907074957_sms_messages` — additive: `SmsMessage` model.

### APIs Added

None — Server Actions only.

### Environment Variables Required

None new.

### Known Issues / Limitations

- SMS sending is console-only — no real provider is configured, so a "sent" SMS is logged to the server console and recorded as SENT, never actually delivered to a phone. Wiring a real provider (Twilio or similar) would need its own Settings → Integrations pass, mirroring how WhatsApp and Email got theirs.
- Campaign sends run as one synchronous server action over a sequential per-recipient loop — fine at this academy's scale (dozens of contacts per audience), but would need to move to a background job if the audience size grew into the hundreds+ (a slow HTTP request, not a silent failure — the action still completes, just takes longer).
- No campaign history/undo — a sent campaign is only visible after the fact via each channel's message log (or the Notification list); there's no single "past campaigns" view distinct from the ordinary automated message log.

## Post-3F(m) — Program Delete, and a Batches Tab in Academic Structure

**Status: Complete and verified.** Two small, separate direct requests handled together since both touched the same page.

**Program delete:** Academic Structure's Programs section had Add/Edit but no Delete anywhere (true of every section on that page — Levels, Boards, Groups, Subjects too, though only Programs was asked for). Added `academicService.deleteProgram()`, which checks for any `Batch`/`Enrollment` still referencing the program first (neither relation has `onDelete: Cascade`/`SetNull`, so an unguarded delete would just throw a raw foreign-key error) and returns a clear, specific reason instead — `deleteProgramAction` catches the service's thrown error and returns it as `{error}` rather than letting it throw across the Server Action boundary, since Next.js redacts thrown Server Action error messages to a generic string in production; only a returned `{error}` value is guaranteed to reach the user's toast with the real reason. Verified live: deleted an unused program successfully; attempting to delete one still assigned to 2 batches was correctly blocked with "Can't delete — still assigned to 2 batches..." and nothing was removed.

**Batches tab:** direct request to add batches as another tab in Academic Structure and remove the standalone "Batches" nav item from both Admin and Super Admin (`adminNav()` is shared by both, confirmed same as every earlier nav change this session). The existing `/admin/batches` and `/admin/batches/new` routes were deliberately **not** removed or redirected — every other section on this page (Levels/Subjects/Boards/Groups/Programs) is a single unpaginated list with no search bar, and the new Batches tab matches that same simplicity (reusing `listBatches({})`'s first page, which comfortably covers this academy's ~5 batches) rather than importing the standalone page's `FilterBar`+`Pagination`, which would have needed the whole page's tab selection synced to a URL param to survive a filter-driven navigation without silently jumping back to the first tab — real complexity for a page with no batch count anywhere near needing it. The full search+paginate experience still exists at `/admin/batches` for anyone who navigates there directly (e.g., via a "Back to Batches" link elsewhere in the app) — it's simply no longer the primary nav entry point.

### Features Completed

**`deleteProgram()` / `deleteProgramAction`** — guarded delete with a real in-use check, wired to a new delete button (`DeleteProgramButton`, `ConfirmDialog`-based) next to each program's existing Edit button.

**`BatchesSection`** (`admin/academics/sections.tsx`) — a sixth tab reusing the exact same columns as the standalone `/admin/batches` table (Batch/Level/Students/Teacher(s)/Status), with "Add Batch" linking to the existing `/admin/batches/new` form (not duplicated) and each row linking to `/batches/[id]`.

Verified live as both Super Admin and regular Admin: nav no longer shows "Batches" for either role; the new tab lists all 5 real batches correctly; `/admin/batches` still works when visited directly.

### Database Migration Added

None.

### APIs Added

None.

### Environment Variables Required

None new.

### Known Issues / Limitations

- The Batches tab shows only the first 15 batches (one page of `listBatches`) with no search or pagination of its own — fine at this academy's current size; if the batch count ever grows past that, the tab would silently show only part of the list (the standalone `/admin/batches` page, unaffected, would still show everything).
- Delete is still Programs-only — Academic Levels, Boards, Groups, and Subjects still have no delete option, only Edit (and an `isActive` toggle to soft-retire one). Not addressed here since only Programs was asked for.

## Post-3F(n) — Visual & Mobile Polish Pass

**Status: Complete and verified.** Direct request ("make the front end better"), scoped via two clarifying questions the user answered explicitly: **visual polish + mobile responsiveness**, applied to **shared components across the whole app in one pass** rather than any single page or portal. No new pages, features, or database changes — every change lives in a shared component or global stylesheet, so it cascades to every portal (Admin, Super Admin, Teacher, Student, Parent, Counselor) automatically.

**Baseline before this pass:** the app had zero custom typography (pure `system-ui`), a fully-default shadcn blue palette, and flat `shadow-sm` on every card and button — the generic "AI-default template" look. Deliberately avoided over-applying the `frontend-design` skill's landing-page/hero-section guidance (wrong context for an internal dashboard) and instead extracted its underlying principles: deliberate, subject-appropriate typography and color rather than defaults; restraint; mobile-first verification.

### Features Completed

**Typography** — added real type via `next/font/google` (self-hosted, no runtime network calls): **Lexend** for headings/display (`font-display`, wired into `tailwind.config.ts`), chosen specifically for its origin in reading-proficiency research — a genuine, defensible tie to "academy/education" rather than an arbitrary trendy pick — and **Inter** for body/UI text (`--font-sans`, replacing the old `system-ui` stack). Applied `font-display` to `PageHeader`'s `<h1>`, `CardTitle`, `StatCard`'s value, and the sidebar's brand name (`src/app/layout.tsx`, `tailwind.config.ts`, `src/components/shared/page-header.tsx`, `src/components/ui/card.tsx`, `src/components/shared/stat-card.tsx`, `src/components/shared/sidebar-nav.tsx`).

**Color & depth** — refined `globals.css`'s `:root` tokens: a deeper/richer primary blue (`221 83% 42%` → `224 76% 38%`, `--ring` matched), a slightly warmer neutral background/border/muted set. Success/warning/destructive tokens and the entire `.dark` block (unused — no theme provider or toggle exists anywhere in the app) were deliberately left untouched. Gave `Card` a subtle custom multi-stop shadow plus `transition-shadow` (replacing flat `shadow-sm`), and gave `Button`'s `default`/`destructive` variants a `shadow-sm` → `hover:shadow` lift for tactility. Added `shadow-sm` to the sidebar's active nav-item state.

**Mobile bug found and fixed — StatCard label truncation.** Live-tested at 375×812: dashboard stat labels ("Active Students," "New Leads (7 days)," "Average Attendance," etc.) were truncating mid-word ("Active Stud...") because of an unconditional `truncate` class combined with the dashboard's 2-column mobile grid making each card too narrow for its label on one line. Fixed in `src/components/shared/stat-card.tsx` by removing `truncate` and adding `leading-snug`, letting labels wrap cleanly to two lines instead. Verified fixed live.

**Mobile bug found and fixed — tab strips overflowing the whole page, not just scrolling internally.** Live-tested the Communication Center's 6-tab strip (WhatsApp/Email/SMS/Notifications/Announcements/Communication Logs) at 375px: the entire page scrolled horizontally, revealing blank space and cutting content off on the left — not just the tab row. Root cause in the shared `TabsList` (`src/components/ui/tabs.tsx`): its className included `w-max min-w-full`, which makes the tab strip's own box exactly as wide as its content (`width: max-content`); since the box is never actually narrower than its content, the `overflow-x-auto` already on the element never has anything to scroll internally, so the overflow escapes to the page instead. Fixed by replacing `w-max min-w-full` with `max-w-full`, capping the tab strip at its container's width so the internal scroll engages instead. Verified via DOM measurement (`document.body.scrollWidth === window.innerWidth` after the fix, vs. page-wide overflow before) on both the 6-tab Communication Center and the Student 360 profile's 12-tab strip (`scrollWidth` 1297px against a 375px viewport, contained entirely within the tab strip, zero page-level overflow) — this fix benefits every tabbed page in the app for free, since they all share this one component.

**Verified unchanged/already-adequate on inspection** (no edit made): `src/components/ui/badge.tsx`, `src/components/shared/empty-state.tsx` (already well-designed — dashed border, muted background, icon, centered copy), `src/components/shared/data-table.tsx` (already has a genuine mobile card-fallback, confirmed working live on `/admin/students`), the new campaign dialogs in Communication Center (confirmed via DOM measurement: 343px wide with 16px margins inside a 375px viewport, 40px-tall full-width tap targets, Cancel/Send stacked vertically — no overflow, no cramped controls).

**Mobile/contrast bug found and fixed — fee-reminder banner text nearly invisible.** Follow-up request to extend the sweep to the Teacher and Parent portals surfaced this on `/parent` at 375px: the "fee not yet paid" banner (`src/app/(dashboard)/parent/monthly-fee-banner.tsx`) rendered near-white text (`text-warning-foreground`, `hsl(210 40% 98%)`) on its own pale `bg-warning/10` wash — a pre-existing bug, not introduced by this session's color changes (the `--warning`/`--warning-foreground` tokens were never touched), but a real, live legibility defect on the app's most business-critical parent-facing message (an unpaid fee). `text-warning-foreground` is meant for text on a solid, opaque `bg-warning` fill (correctly paired that way in `badge.tsx`) and was simply the wrong token choice against a 10%-opacity wash. Fixed by switching to `text-warning` (the same solid, legible color already used in this component's sibling "PAID" branch via `text-success` against `bg-success/10`) — now solid orange text at full contrast, matching the pattern the paid-state branch already used correctly. Verified live before/after: text was genuinely unreadable, now clearly legible.

**Teacher and Parent portal sweep** (DOM-measured `document.body.scrollWidth === window.innerWidth` at 375px, plus live screenshots): Teacher dashboard, `/teacher/batches`, a batch detail page (`/batches/[id]`, 8 tabs including the scrollable Attendance/Homework/Tests/Recordings/Announcements strip), `/teacher/timetable` (a wide weekly grid, confirmed already correctly wrapped in its own `overflow-x-auto` container — a pre-existing, deliberate pattern, not touched), `/knowledge-base`. Parent dashboard (`/parent`, multi-child switcher — the horizontally-scrollable `AllChildrenStrip` card row confirmed to be a deliberate, already-contained pattern per its own code comment, not a bug), `/parent/payments`, and a child's Student 360 profile as the parent role sees it (`/students/[id]` with Recordings and Internal Notes correctly hidden, 10 remaining tabs each checked individually for page-level overflow — all clean, including the tab-strip fix holding at its most demanding case).

**Counselor and Super Admin portal sweep** (follow-up request to extend coverage to the remaining two roles). Counselor: dashboard (`/counselor`, stat cards + a pipeline-stage pill list), the Leads Kanban board (`/counselor/leads`, confirmed the drag-and-drop board's horizontal scroll is already correctly contained — same `overflow-x-auto` pattern as the child-switcher strip, not a bug), the List view (`?view=list`, a DataTable), and a lead detail page — all clean. Super Admin: confirmed via `src/middleware.ts`'s `SECTION_ROLES` and `nav-config.ts`'s `NAV_BY_ROLE` that SUPER_ADMIN and ADMIN share the exact same `/admin/*` route gate and the identical `adminNav()` — meaning every Admin page already verified applies to Super Admin unchanged. Used that to focus the incremental check on the ~19 pages the earlier Admin pass hadn't individually opened yet: all 9 Settings pages (Users, Roles & Permissions, Performance Rules, Automation Rules, Message Templates, Gamification Points, Payment Gateway, Integrations, API Keys), both System pages (System Health, AI Usage), and the remaining core nav pages (Leads, Referrals, Parents, Teachers, Academic Structure, Timetable, At-Risk, Analytics, Engagement Dashboard, Predictive Risk, Interventions, Leaderboard, Badges, Payments, Automation Activity Log, Support Tickets) — all DOM-measured clean (`document.body.scrollWidth === window.innerWidth` at 375px) with no page-level overflow; Analytics and Leaderboard additionally screenshot-verified (stat labels wrapping correctly, tab strip correctly contained).

Verified live at both desktop and 375×812 mobile widths across: `/admin` (dashboard — StatCard fix), `/admin/students` (DataTable mobile card-fallback), `/admin/study-material` (card-grid layout), `/admin/communication` (tab-strip fix + campaign dialog), `/students/[id]` as Admin (12-tab profile) and as Parent (10-tab profile, recordings/notes hidden), `/teacher` dashboard, `/teacher/batches`, a batch detail page, `/teacher/timetable`, `/knowledge-base`, `/parent`, `/parent/payments`, `/counselor`, `/counselor/leads` (board + list views), a lead detail page, and all remaining Admin/Super Admin nav destinations listed above.

### Database Migration Added

None.

### APIs Added

None.

### Environment Variables Required

None new.

### Known Issues / Limitations

- Dark mode CSS variables exist in `globals.css` but remain fully unwired — no theme provider, no toggle, no `prefers-color-scheme` handling anywhere in the app. Out of scope for this pass (not requested), noted here so a future dark-mode request starts from "wire up the toggle," not "the tokens don't exist yet."
- This was a shared-component pass plus a targeted per-page sweep, not a click-through-every-interaction audit — every shared primitive (Card, Button, Tabs, StatCard, DataTable, PageHeader, EmptyState, SidebarNav) was checked, and every distinct page reachable from every role's nav was opened at 375px and measured for page-level overflow, but not every dialog, filter combination, or empty/error state on every page was individually exercised.

## Post-3F(o) — Public Marketing Site + Ad-Driven Enrollment Landing Page

**Status: Complete and verified.** Direct request, arrived at through a conversation about marketing the academy in Pakistan: Facebook/Instagram ad traffic needs somewhere to land, and a small public marketing site needs to exist before that traffic can convert into a `Lead`. Scoped deliberately small — Home, Programs, About, Contact, plus the actual ad-landing page at `/enroll` — built as new public routes inside this same Next.js project rather than a separate site, so it reuses the existing database, the `leadService.createLead()` pipeline, and the fonts/colors/shadows from the Post-3F(n) polish pass with zero new hosting or deployment.

**Key discovery that shaped the design:** the `Lead` model already had everything needed for ad attribution before this work started — `LeadSource` already included `FACEBOOK_ADS`, `INSTAGRAM_ADS`, and `WEBSITE` alongside `REFERRAL`, and `Lead.campaign` already existed as a free-text field ([schema.prisma:176](prisma/schema.prisma:176)) — none of it wired to anything. This wasn't a schema-driven build; it was closing a gap between data modeling that already anticipated this use case and the actual public-facing page that was missing.

### Features Completed

**Marketing site** (`src/app/(marketing)/`, new route group with its own layout — independent of `(dashboard)`'s session-gated shell and `(auth)`'s login layout):
- [marketing-header.tsx](src/app/(marketing)/marketing-header.tsx) / [marketing-footer.tsx](src/app/(marketing)/marketing-footer.tsx) — shared header (logo, Home/Programs/About/Contact nav, "Login" link for existing users, primary "Book Free Trial" CTA, a client-side mobile hamburger menu) and footer (quick links, contact placeholders, copyright), reused across all four marketing pages.
- **Home** (`page.tsx`, now living at `/` — replaced the old root `page.tsx` that did nothing but redirect) — hero, four value-prop cards (Live Group Classes, Real-Time Parent Visibility, WhatsApp Updates, Free Trial No Pressure), a 3-step "How it works," and a closing CTA band. For a **logged-in** visitor, `/` still redirects straight to their role's dashboard exactly as before (verified live: a logged-in Admin session hitting `/` lands on `/admin`, unchanged) — only a logged-out visitor now sees the marketing home instead of being force-redirected to `/login`.
- **Programs** (`/programs`) — real data, not filler: fetches `listAcademicLevels()`, `listBoards()`, `listGroups()` and renders a card per academic level (Class 8 → 2nd Year), matric levels showing the real seeded subject list, intermediate levels showing the real seeded groups (Pre-Medical/Pre-Engineering/ICS/I.Com/FA), each card linking to `/enroll?level={id}` to prefill the form.
- **About** (`/about`) — three principle cards built around the app's actual differentiator (parent visibility, live not recorded, mutual accountability) rather than generic academy copy.
- **Contact** (`/contact`) — WhatsApp deep-link (`wa.me` with a prefilled message), `tel:`, and `mailto:` cards. Deliberately has no second lead-capture form of its own — funneling every conversion path through the one `/enroll` pipeline rather than building a parallel intake path.

**`/enroll` — the actual ad-landing page** (`src/app/enroll/`, deliberately **outside** the `(marketing)` route group so it does not inherit the full-nav header/footer — an ad click should land somewhere with nothing to click except the form, per the "keep the landing page distraction-free" principle raised during planning):
- [page.tsx](src/app/enroll/page.tsx) — minimal own header (logo only, no nav links, confirmed live via DOM query: 1 link total in the header, zero footer elements on the page). Reads `?src=`, `?campaign=`, and `?level=` from the URL so an ad's own link controls attribution and can deep-link a specific class.
- [enroll-form.tsx](src/app/enroll/enroll-form.tsx) — Student Name / Parent Name / Parent WhatsApp / Academic Level / Group, modeled directly on the existing `/refer/[code]` referral form's proven pattern (same `useFormState` + success-state swap), extended with a Group field.
- [actions.ts](src/app/enroll/actions.ts) — `submitEnrollAction`, bound with `source`/`campaign` from the URL (mirroring how the referral action binds `code`). Maps a short `src` param (`fb`, `ig`, `whatsapp`, `organic`, `school`, or unrecognized/missing → `WEBSITE`) to the real `LeadSource` enum, then calls `leadService.createLead()` **directly** — skipping `referralsService` entirely, since there is no referrer to credit for a cold ad click. The created lead lands in the same Counselor Kanban pipeline (`New` stage) as every other lead, tagged with its real source and campaign — no new pipeline, no new Counselor-facing UI needed.
- `src/middleware.ts` — added `/programs`, `/about`, `/contact`, `/enroll` to the existing `isPublic` allowlist (same reasoning already documented there for `/refer/[code]`) so logged-out ad traffic isn't bounced to `/login`. Verified live that this didn't loosen protection anywhere else: a logged-out `fetch('/admin', {redirect:'manual'})` still comes back as a redirect, not the page.

**End-to-end verification performed:** filled and submitted the live `/enroll?src=fb&campaign=sept_promo` form in the browser, then queried the database directly and confirmed the resulting `Lead` row had `source: "FACEBOOK_ADS"`, `campaign: "sept_promo"`, `stage: "NEW"` — exactly the attribution the whole feature exists to capture — before deleting the test row. All five new pages (`/`, `/programs`, `/about`, `/contact`, `/enroll`) also DOM-measured clean (`document.body.scrollWidth === window.innerWidth`) at a 375px mobile viewport, and the mobile hamburger menu on the marketing header confirmed to open and list all four nav links.

### Database Migration Added

None — `LeadSource.FACEBOOK_ADS`/`INSTAGRAM_ADS`/`WEBSITE` and `Lead.campaign` already existed, unused, before this work.

### APIs Added

None (new Server Action, not a REST endpoint).

### Environment Variables Required

None new.

### Known Issues / Limitations

- The WhatsApp number, phone number, and email shown in the footer and Contact page (`+92 300 1234567`, `hello@parentfirst.pk`) are **placeholders** — they need to be swapped for the academy's real contact details before this goes live to actual ad traffic.
- The Home page copy, About page copy, and value props are original copy written for this build, not yet reviewed/approved by the academy owner — treat as a first draft to edit, not final marketing copy.
- No analytics/pixel tracking (Meta Pixel, Google Analytics) is wired into the marketing pages yet — `?src=`/`?campaign=` attribution works for which `Lead` came from which ad, but there's no page-view or funnel-drop-off tracking before the form submits. Would be a follow-up if ad spend scales up enough to need it.
- Programs/About/Contact are prerendered as static content at build time (confirmed via the build output: `○ /about`, `○ /contact`, `○ /programs`) — if `AcademicLevel`/`Board`/`Group` rows change, the Programs page won't reflect it until the next deploy/rebuild. `/enroll` and `/` are server-rendered per-request (`ƒ`), so those always reflect live data.

**Follow-up routing correction (same day):** the marketing home was initially built at `/` itself (with `/` showing the marketing page to logged-out visitors and redirecting logged-in ones to their dashboard). Per direct request, moved the marketing home to `/home` and restored `/` to its original, pre-existing behavior — a lightweight redirect-only page (logged in → role dashboard, logged out → `/login`), matching how the app worked before this entire feature started. Changes: [src/app/page.tsx](src/app/page.tsx) recreated with the original redirect logic; marketing home content moved to `src/app/(marketing)/home/page.tsx` (and its own logged-in-redirect check dropped, matching Programs/About/Contact's behavior — `/home` is now reachable regardless of session state, same as every other marketing page); `marketing-header.tsx`'s logo and "Home" nav link, `marketing-footer.tsx`'s new "Home" quick link, and `enroll/page.tsx`'s logo link all repointed from `/` to `/home`; `middleware.ts`'s `MARKETING_PATHS` allowlist extended to include `/home`. Verified live: logged-out `/` → 307 to `/login`; logged-in `/` → redirects straight to `/admin` (unchanged from original behavior); `/home` → 200, marketing page, reachable both logged-in and logged-out; production build confirms `/` back down to 164 B (redirect-only) and `/home` now the static-prerendered page.

## Post-3F(p) — Marketing Site Visual Redesign ("Skylight" Palette)

**Status: Complete and verified.** Direct follow-up request to redesign Home/Programs/About/Contact "professionally," with an explicit ask for a pastel color theme and very prominent CTAs. Rather than guessing at a palette, generated three distinct pastel-but-professional options (via the `ui-ux-pro-max` skill's design-system search plus hand-tuned hex values, since no exact "pastel" match existed in its palette database — labeled as adapted, not a direct database match) and published them as a side-by-side visual comparison artifact with real hero copy so the choice was made by seeing actual mockups, not hex codes. User picked **Skylight** (soft cornflower blue + warm peach/orange) and asked for maximum CTA prominence.

### Features Completed

**Scoped "Skylight" theme** ([globals.css](src/app/globals.css)) — a `.theme-skylight` class redefining the same shadcn token names (`--background`, `--primary`, `--secondary`, `--muted`, `--accent`, `--border`, etc.) plus four new CTA-only tokens (`--cta`, `--cta-hover`, `--cta-foreground`, `--cta-wash`). Applied only as a wrapper class on `(marketing)/layout.tsx` and `enroll/page.tsx` — the dashboard's `:root` tokens are completely untouched, verified live by checking `getComputedStyle(document.documentElement).getPropertyValue('--primary')` on `/admin` before and after (unchanged at `224 76% 38%`) and confirming `.theme-skylight` does not exist anywhere in the dashboard's DOM. `tailwind.config.ts` extended with a `cta` color group so `bg-cta`/`text-cta-foreground`/`bg-cta-wash` work as ordinary utility classes.

**CTA-only accent color, not a CTA-everywhere color.** The palette research surfaced a real pattern (`trust-authority-conversion`: "Accent for CTA only") that shaped the whole implementation: blue stays the brand color for nav, badges, icons, and headings; the warm peach/orange is reserved exclusively for the page's actual call-to-action buttons, so a CTA is never competing with decorative chrome for attention. New [`PrimaryCta`/`SecondaryCta`](src/components/marketing/cta-link.tsx) components (deliberately not built on the shared dashboard `Button` — that component's variants are relied on across the whole internal app and were not touched) render a bold rounded-full pill with a colored shadow/glow, hover lift, and an animated arrow; `SecondaryCta` is a quieter blue-outline pill for secondary actions (WhatsApp/Call/Email on the Contact page) so one page never has multiple equally-loud competing CTAs.

**Every page redesigned** with a consistent structure (eyebrow badge → bold headline → supporting copy → CTA band, repeated per section) and considerably more CTA density than before:
- **Home** — new hero layout with a "what a parent sees this week" portal-preview card (real product UI grounded in actual differentiator — attendance/homework/test-average pills plus a WhatsApp-report note — clearly labeled as illustrative, not a real family's data) instead of a generic hero graphic; a new "Programs at a glance" teaser section between the value props and How It Works; CTAs now appear in the header, hero (two — primary + secondary), the programs teaser, the How It Works close, and the footer band.
- **Programs** — added a hero band with its own top CTA; every academic-level card's outline button upgraded to a full-width `PrimaryCta`; closing section restyled into a rounded highlight panel.
- **About** — added a matching hero band; closing CTA moved into a solid-primary highlight panel instead of a plain button.
- **Contact** — added a matching hero band; the three contact-method buttons intentionally kept as `SecondaryCta` (quieter blue) so the page's one `PrimaryCta` ("Book a Free Trial Class") stays the unmistakable main action.
- **Enroll** — wrapped in the same `.theme-skylight` scope for visual consistency with the rest of the funnel (not explicitly requested, but flagged as included since every CTA on the other four pages leads here); submit button restyled to match `PrimaryCta`'s exact visual treatment (can't reuse the component directly since it must stay a native `<button type="submit">` for the form action).
- **Header/Footer** — header CTA upgraded from a plain dashboard-style button to `PrimaryCta`; footer gained a full solid-primary CTA band ("Ready to see it for yourself?") directly above the link/contact columns, so every page ends on a prominent action regardless of how far a visitor scrolls.

### Database Migration Added

None.

### APIs Added

None.

### Environment Variables Required

None new.

### Known Issues / Limitations

- One CSS authoring gotcha hit during this work, worth remembering: a straight apostrophe inside a `/* ... */` CSS comment (e.g. "app's") broke this project's PostCSS/webpack loader with a confusing "Unclosed string" error pointing at the apostrophe — not a real CSS defect, but comments in `globals.css` should avoid apostrophes/quote characters going forward to sidestep it.
- The palette-comparison artifact used to pick "Skylight" was a scratch file, not committed to the repo — if another palette direction is wanted later, the three original options (Skylight / Sage Bloom / Golden Lavender) aren't saved anywhere in the codebase, only in that now-superseded artifact.
- Contrast was checked by construction (dark ink text on every background, a deep enough `--cta`/`--primary` for white button text) but not run through an automated contrast checker — worth a pass before this faces real traffic if the exact hex values get tweaked later.

## Post-3F(q) — Marketing Site Icon Pass

**Status: Complete and verified.** Direct follow-up request to make every icon "good and professional" across the marketing site and check mobile. Rather than swapping icon libraries (the whole app, dashboard included, standardizes on `lucide-react` — introducing a second icon set for just the marketing pages would create real inconsistency, not fix it), this was an audit-and-refine pass on the existing icon choices plus a real accessibility gap that surfaced during the audit.

### Features Completed

**Every decorative icon marked `aria-hidden="true"`.** None of the ~74 icons across the 5 marketing pages had this before — each sits directly beside a visible text label (a card title, a button label, a stat name), so a screen reader announcing the icon's name on top of the adjacent text is pure noise. Verified by fetching the rendered HTML of all 5 pages and checking every `<svg>` inside `main`/`header`/`footer`: 0 of 74 missing the attribute after the fix (was 74 of 74 missing before).

**Five icon swaps for semantic precision, not just decoration:**
- Home value props: `Bell` → `Eye` for "Real-Time Parent Visibility" (a bell means notification, not visibility — Eye is the icon this site already uses for the identical concept on the About page, so this also made the two pages consistent with each other); `MessageCircleHeart` → `MessageCircle` for "Updates You'll Actually See" and the hero portal-preview's WhatsApp note (the heart implied warmth/affection that had nothing to do with a delivery-channel icon; plain MessageCircle reads as "this is a message," precisely what the copy describes).
- Home hero trust markers: `ShieldCheck` → `CheckCircle2` — a horizontal "No cost to try / Cancel any time / All boards" list is a checklist pattern, and reusing one checkmark glyph for all three is the correct, standard treatment for that pattern (a security-shield icon implied a "protection" claim none of the three items were actually making).
- About hero badge: `Heart` → `Building2` — Heart was a generic "about us" placeholder with no real tie to an educational institution; Building2 reads as the institution itself.
- Contact hero badge: `MessageCircle` → `Headset` — the page's own WhatsApp contact-method card immediately below already uses MessageCircle, so the hero badge was a same-page duplicate; Headset (support desk) is both distinct and a better fit for "Contact" as a page-level concept than any single channel's icon.

**Programs page gained icon badges it never had.** Every other card pattern on the site (Home value props, About principles, Contact methods) uses an icon-in-a-colored-circle badge next to its title; the Programs level cards were the one exception — plain text titles with no visual anchor. Added a badge to each (`BookOpen` for the three Matric levels, `GraduationCap` for 1st/2nd Year Intermediate — a real distinction, not decoration, since Matric and Intermediate are genuinely different tracks with different group/subject structures), bringing Programs into the same visual language as the rest of the site.

**Mobile-verified.** All 5 marketing pages re-checked at 375px after the icon changes: DOM-measured zero page-level overflow on every page, and visually confirmed (screenshots, pane visible this pass) that every icon — hero badges, portal-preview stat rows, value-prop cards, About principle cards, Contact method cards, Programs level-card badges, the enroll form's submit-button arrow — renders crisp, correctly sized, and properly aligned with its adjacent text at mobile width; no icon overlaps, clips, or misaligns in any card at the narrower width.

### Database Migration Added

None.

### APIs Added

None.

### Environment Variables Required

None new.

### Known Issues / Limitations

- Icon-choice review was manual/judgment-based (no external design database returned a usable "professional icon" match for this product — queried and got 0 results, then a generic accessibility-pattern match instead) — reasonable for a small, fixed icon set like this one, but not an automated or repeatable process if the page count grows significantly.

## Post-3F(r) — Icon Badge Redesign + Full Marketing Copy Rewrite

**Status: Complete and verified.** Direct follow-up, prompted by the user sharing a screenshot of the Home page's value-prop card row and calling out the icons as too small/plain, plus a request to rewrite all marketing-page content and headings.

### Features Completed

**New shared `IconBadge` component** ([icon-badge.tsx](src/components/marketing/icon-badge.tsx)) replacing four separate hand-rolled `rounded-xl` icon-badge divs (one each in Home, About, Contact, and — newly added — Programs). Two changes from the old ad-hoc markup: **shape** — `rounded-xl` (soft square) → `rounded-full` (true circle), which now echoes the pill-shaped `PrimaryCta`/`SecondaryCta` buttons instead of clashing with them; **size** — default badges 44px→48px with a 1px definition ring, and a new `size="lg"` variant at 64px (32px icon) used specifically for the Home value-prop row the user screenshotted, since that's the site's single most prominent icon showcase and warranted the largest treatment. Verified via `getBoundingClientRect()` on the live page: Home's four badges now measure 64×64 with 32×32 icons (previously 44×44/20×20 with a 45%-of-container icon-to-badge ratio that read as small); About/Contact/Programs badges now measure 48×48 with 24×24 icons, all `border-radius: 9999px` (a true circle, confirmed via computed style, not just visually).

**Programs page gained icon badges it never had** — added as part of this pass (`BookOpen` for the three Matric levels, `GraduationCap` for 1st/2nd Year Intermediate), bringing every card pattern on the site onto the same shared component for the first time.

**Full content rewrite across all four pages** — every H1, every section heading, and most body copy rewritten for sharper, more specific marketing language instead of generic page-type labels. Kept everything grounded in real facts already established this session (no invented stats, no fabricated testimonials); the change was entirely in how the same true claims are phrased. Highlights:
- Home H1: "Coaching where you always know how your child is doing." → **"Know how your child is really doing — every single day."** (more direct, present-tense, and personal)
- Home value-prop headings, all four rewritten from generic feature labels to benefit-driven statements: "Live Group Classes" → **"Real Classes, Not Recordings"**; "Real-Time Parent Visibility" → **"See It As It Happens"**; "Updates You'll Actually See" → **"Updates On WhatsApp"**; "Free Trial, No Pressure" → **"Try Before You Commit"** — each description rewritten to match.
- Home "Why parents choose us" section heading: "Most tuition academies leave parents guessing. We don't." → **"Most academies keep parents in the dark. We turn the lights on."** (a sharper, more visual contrast line)
- Home programs-teaser heading → **"One academy for the whole journey — Class 8 to 2nd Year."**; How It Works heading → **"How to get started"**
- Programs H1: "Programs We Offer" (a page-type label) → **"Find the right class for your child"**; closing panel heading → **"Still deciding on a class or group?"**
- About H1: "About Parent-First Online Academy" (restates the brand name, says nothing) → **"Why we built this differently"**
- Contact H1: "Get In Touch" (generic UI label) → **"Talk to us first"**

### Database Migration Added

None.

### APIs Added

None.

### Environment Variables Required

None new.

### Known Issues / Limitations

- The three-principle list on About and the contact-method cards on Contact kept their existing headings/copy — judged already strong and specific (not generic placeholders) rather than left unreviewed; only the page-level H1s and section headings on those two pages changed.

## Post-3F(s) — Differentiation, Board-Exam-Prep, Testimonials, Sticky CTA, and a New Pricing Page

**Status: Complete and verified**, with one deliberate, flagged exception (see below). Direct request bundling several additions: a "why us"/"how we're different" section, a testimonials section, further CTA prominence, board-exam-prep messaging, and a brand-new Pricing page with exact tier pricing supplied by the user.

**Deliberate exception — no fabricated testimonials.** The request asked for a testimonials section; this is a pre-launch product with no real parents who have used it yet (the seed data throughout this project is fictional test data, not real customers who consented to being quoted). Publishing invented quotes attributed to invented parents would be a fabricated review presented as genuine — not something to do regardless of who's asking, since it would mislead real prospective parents into false trust once this goes live to actual ad traffic. Built the section honestly instead: a `TESTIMONIALS` array in `home/page.tsx`, currently empty with a code comment explaining why, and the section renders a designed (not broken-looking) "We're just getting started" state with its own CTA when the array is empty. The moment real parent quotes exist, dropping them into that array switches the section to real testimonial cards automatically — no other code changes needed.

### Features Completed

**"How We're Different" comparison section** (Home, new) — a two-column "Most Academies" (muted, X-marked) vs "Parent-First Online Academy" (primary-bordered, check-marked) card pair, five honest rows restating the same core differentiators already established elsewhere on the site (live vs recorded, real-time vs report-card-time visibility, etc.) — no new unverified claims, just the existing true positioning in a sharper comparative format.

**"Built for Board Results" section** (Home, new) — four cards addressing "how do you help my child get good grades in boards": full syllabus coverage tracked chapter-by-chapter, regular practice tests (not just finals) to surface weak areas early, attendance visibility as an accountability lever, and live doubt-clearing. Grounded in the product's real mechanics, not invented pedagogical claims.

**Testimonials section** (Home, new) — see the flagged exception above.

**CTAs made more prominent, a second pass:**
- New [`StickyCtaBar`](src/components/marketing/sticky-cta-bar.tsx) — a mobile-only fixed bottom bar with the primary CTA, appearing after scrolling ~480px past the hero (so it doesn't compete with the hero's own CTA on load) and auto-hiding within 500px of the page bottom (so it never overlaps the footer's own CTA band). Added once to `(marketing)/layout.tsx`, applying to every marketing page including the new Pricing page. Verified via `getComputedStyle`/`getBoundingClientRect` that the show/hide logic and positioning are correct — a rendering-paused artifact from the Browser pane being hidden briefly made this look broken mid-verification (computed `transform` frozen from before the tab was hidden) until the tab was fronted and repainted; the underlying CSS class and `--tw-translate-y` custom property were correct the whole time, confirming it was a test-tooling artifact, not an app bug.
- Added a reassurance microcopy line under the hero's primary CTA: "No credit card required · Takes under a minute."

**New Pricing page** (`/pricing`, new route) — per the user's exact figures: **Basic** — Rs 3,000/month (Class 8–10), Rs 3,500/month (1st & 2nd Year), all subjects included. **Gold** — Rs 3,500/month (Class 8–10), Rs 4,000/month (1st & 2nd Year), everything in Basic plus weekly practice tests (the one differentiator specified — no other Gold-only features were invented). Gold is visually highlighted with a "Most Popular" badge and a bordered card. A footer note states a third tier is coming soon (per the user's mention, without fabricating what it will contain) and offers a WhatsApp link for undecided visitors.
- **Deliberately not linked from the main nav or footer.** The user's own framing — "this pricing page will be given to leads after trial period ends" — describes a targeted, counselor-shared link for warm post-trial leads, not a page for cold top-of-funnel browsing (which would undercut the whole site's established "try before you see numbers" framing). It's fully live and reachable at `/pricing`, just not surfaced to first-time visitors. `middleware.ts`'s `MARKETING_PATHS` allowlist updated so the route is public (no login required) like the rest of the marketing site.
- Each tier's "Enroll" button opens a pre-filled WhatsApp message naming the chosen plan, rather than routing back through the pre-trial `/enroll` lead-capture form — these are leads past that stage already; the honest next step is a conversation with admissions, not a form meant for first-contact lead generation. No payment gateway integration exists yet, so this doesn't claim to process payment — it starts the human conversation that would lead to it.

### Database Migration Added

None.

### APIs Added

None.

### Environment Variables Required

None new.

### Known Issues / Limitations

- **Class 8 pricing was not specified by the user** — only "9th and 10th" and "1st and 2nd year" were given exact figures. The Pricing page's "Class 8 – 10" price band assumes Class 8 shares the same rate as Class 9–10, matching how every other part of this app already groups those three levels together as the "Matric" track (identical subject list on the Programs page, same board options). **This is an assumption, not a confirmed figure — please confirm or correct before this page is shared with any real lead.**
- The third pricing tier mentioned ("we will make 1 more tier later on") has no page presence beyond the one-line "coming soon" note — no placeholder card, no name, no feature guesses, since none of that was specified and guessing would risk setting the wrong expectation with a lead who sees this page.
- `TESTIMONIALS` array is empty by design (see the flagged exception above) — this is the one part of the request not fully built as literally asked, with the reasoning documented in code and here.

## Post-3F(t) — Enroll-Form Leads Now Assignable to a Counselor

**Status: Complete and verified.** Direct request: leads from the public `/enroll` form should automatically land in "the leads section." Investigating found the lead row itself was already being created correctly (confirmed in Post-3F(l)/(m) end-to-end testing) — the real gap was downstream: an enroll-form lead is created with no `assignedCounselorId`, and the Counselor's own "My Leads" board/list ([leads.ts:54](src/lib/services/leads.ts:54)) filters strictly to `assignedCounselorId = <that counselor's id>`, so an unassigned lead is invisible there. Worse, [`assertCanManageLead`](src/lib/access.ts:44) only lets a `COUNSELOR` act on a lead already assigned to them — `STAFF_ROLES` (Admin/Super Admin) is the only role that can touch an unassigned lead at all — and until this fix, there was no UI anywhere to actually assign one. So the lead technically existed in the database and was visible to Admin (correctly labeled "Unassigned" in the `/admin/leads` table), but was a practical dead end: no counselor could see it, and no one could assign it to a counselor either.

Discussed the fix directly with the user: rather than auto-assigning a counselor at creation time (e.g., round-robin), the user's own admissions workflow is that a new lead goes to Admin/Super Admin first, who then assigns it to a counselor — so the fix built is a manual assignment control, not automatic counselor assignment.

### Features Completed

**New `CounselorSelect` component** ([counselor-select.tsx](src/app/(dashboard)/leads/[id]/counselor-select.tsx)) — mirrors the existing `StageSelect` pattern exactly (a `Select` that fires a server action on change with toast feedback), placed on the lead detail page's Overview tab in the same row the read-only "Counselor" text used to occupy. Only rendered for `isStaff` (Admin/Super Admin); a Counselor viewing one of their own assigned leads still sees the old plain read-only text, since assignment is explicitly an admin-level action per the user's clarification, not something counselors do to themselves or each other.

**New `assignLeadCounselorAction`** ([leads/actions.ts](src/app/(dashboard)/leads/actions.ts)) — gated to `STAFF_ROLES` only (not the broader `COUNSELOR_ROLES` every other lead action in this file uses), calls the existing `leadService.updateLead()` with the chosen `assignedCounselorId` (or `null`, via an "Unassigned" option in the dropdown, to support deliberately un-assigning a lead too), logs an audit entry, and revalidates every path that renders lead data (lead detail, both leads lists, both dashboards).

**`CreateLeadInput.assignedCounselorId`** widened from `string | undefined` to `string | null | undefined` ([leads.ts:20](src/lib/services/leads.ts:20)) so the existing generic `updateLead()` helper could be reused for the null case instead of writing a separate one-off Prisma call.

**Verified live, end-to-end**, exactly the workflow the user described: submitted a real lead through `/enroll`, confirmed it appeared in `/admin/leads` as "Unassigned," opened it as Admin and used the new selector to assign it to the seeded counselor (Zainab Siddiqui), confirmed the assignment persisted after a reload, then signed in as that counselor and confirmed the lead now appears at the top of her own "My Leads" list — tagged with its real `Facebook Ads` source and `New` stage, fully manageable from there on (the `assertCanManageLead` check now passes automatically once `assignedCounselorId` matches). Test lead deleted afterward.

### Database Migration Added

None — `Lead.assignedCounselorId` was already a nullable column; only the TypeScript-level service type changed.

### APIs Added

None.

### Environment Variables Required

None new.

### Known Issues / Limitations

- Assignment is per-lead and manual — there's no bulk-assign action from the `/admin/leads` table (select multiple rows, assign to one counselor at once). Fine at this academy's current lead volume; worth a follow-up if volume grows enough that assigning one at a time becomes a bottleneck.
- The same underlying gap (no `assignedCounselorId` set at creation) also applies to `/refer/[code]` referral-driven leads, not just `/enroll` — this fix covers both the same way, since they both flow through the same `assertCanManageLead`/counselor-board filtering that was actually broken, but it's worth knowing this wasn't an enroll-specific bug.

## Post-3F(u) — Lead Assessment Now Requires an Uploaded Document, Not Just a Typed Score

**Status: Complete and verified.** User asked how the initial assessment currently works; the answer surfaced that the "Assessment" tab was pure manual data entry (a counselor types in a score after conducting the assessment some other way — a call, in-person, a paper test — entirely outside the app). User wanted the assessment to stay conducted outside the app (no in-app test-taking system), but wanted the *recording* of it to stop being manual. Presented two options — plain file upload (score fields stay, backed by real evidence) vs. file upload + AI auto-fill of the score fields — user chose the former.

### Features Completed

**`Assessment.documentFileId`** (new nullable column, [schema.prisma:1359](prisma/schema.prisma:1359)) — reuses the app's existing generic file-upload infrastructure ([uploaded-files.ts](src/lib/services/uploaded-files.ts), the same one already used for payment receipts, homework submissions, and support attachments) rather than building new upload/storage handling. New `LEAD_ASSESSMENT` value added to the `FilePurpose` enum.

**Document upload is now required, not optional**, when recording an assessment — [`recordAssessmentAction`](src/app/(dashboard)/leads/actions.ts) was rewritten to take `FormData` instead of a plain object (matching the existing `submitParentPaymentAction` pattern exactly), rejects the submission if no file is attached, uploads it via the shared `uploadedFilesService.uploadFile()`, and only then creates the `Assessment` row with the returned `documentFileId`. The score/weak-subjects/recommended-program fields stay as optional supplementary context, per the option the user chose — the document itself is now the actual evidence backing the record, not the possibly-fabricated number.

**[`AssessmentTab`](src/app/(dashboard)/leads/[id]/assessment-tab.tsx)** — added a required file input (accepts PDF/Word/PNG/JPEG/WEBP, 10MB max, same constraints as every other upload in the app) above the existing score fields, with copy explicitly stating the assessment happens outside the app and this just records it. Every past assessment in the history list now shows a "View Assessment Document" link when one exists.

**Access control extended, not bypassed** — added a `LEAD_ASSESSMENT` branch to the shared file-serving route's `assertCanReadFile` ([api/files/[id]/route.ts](src/app/api/files/[id]/route.ts)), looking up the assessment's `leadId` and reusing the exact same `assertCanManageLead` check every other lead action already uses (Admin/Super Admin always; a Counselor only for leads assigned to them). No new, parallel access rule was invented.

**Verified live, end-to-end:** recorded a real assessment on a live lead with a real uploaded file (score 62, weak subjects Physics/Chemistry, recommended Pre-Medical) — confirmed the lead's stage auto-advanced to "Assessment Completed," the "View Assessment Document" link fetched the exact uploaded bytes back with the correct content-type, and — the important negative test — a Student session hitting the same file URL directly got a genuine `403 Forbidden`, proving the access-control branch isn't just present but actually enforced. Test assessment, its uploaded file (both the database row and the physical file under `.uploads/`), and the lead's stage were all cleaned up afterward.

### Database Migration Added

Yes — `20260907155406_lead_assessment_document`: adds `Assessment.documentFileId` (nullable) and the `LEAD_ASSESSMENT` value to the `FilePurpose` enum. Purely additive.

### APIs Added

None (existing `/api/files/[id]` route extended with one more purpose branch).

### Environment Variables Required

None new.

### Known Issues / Limitations

- Every assessment recorded **from now on** requires a document; assessments recorded before this change (there weren't any in the seed data) would simply have `documentFileId: null` and show no document link — not a data-loss concern, just worth knowing the requirement isn't retroactive.
- The score/weak-subjects/recommended-program fields remain freely-typed manual entry, same as before — only the document itself is now mandatory. If stronger enforcement is wanted later (e.g., requiring the score to match what's visible in the uploaded document), that would need the AI-auto-fill direction the user didn't choose this time.

## Post-3F(v) — Full-System Gap Audit and Fixes

**Status: Complete and verified**, with a small number of items deliberately deferred (documented below). Direct request: "check if there is anything missing in the entire system, streamline the marketing stuff, and fix what's missing." Ran a background agent to do a read-only audit of the whole system (cross-referencing every `PHASE_COMPLETION.md` "Known Issues" entry against current code, checking nav-vs-routes integrity, scanning the Prisma schema for dead models, and checking for standard-but-missing pieces like robots.txt/sitemap/favicon/password-reset), while working the marketing-page metadata/SEO pass directly in parallel. Then triaged every finding and fixed everything that was safe and well-scoped.

### Features Completed

**Nav fixes — three genuine oversights, one deliberate non-fix.** `src/lib/nav-config.ts`: added **Exam Prep** and **Study Assistant** to the Student nav, and **Homework** (the cross-batch aggregate view) to the Teacher nav — all three were fully-built, working pages with dedicated icons already defined in `icon-map.tsx` that had simply never been wired into a nav array, reachable only by typing the URL directly. The audit also flagged `/teacher-assistant` as orphaned — **deliberately left unlinked**, since removing it from both Teacher and Admin nav was an explicit, direct user instruction earlier this same session, not an oversight; re-adding it would have silently reversed a decision the user already made.

**Rate limiting on public, unauthenticated lead-capture forms** — `src/app/enroll/actions.ts` and `src/app/refer/[code]/actions.ts` had zero abuse protection despite being reachable by anyone (including bots) now that ad traffic is the whole point of `/enroll`. Added two layers using the existing `checkRateLimit()` primitive (same one already protecting login): a per-phone cap (3/hour — stops one number being resubmitted repeatedly) and a coarse global backstop (30/5min — catches a volumetric flood using many fake numbers). Verified live: submitted the same phone 4 times, confirmed exactly 3 leads were created and the 4th was blocked with a friendly message, not a raw error.

**SEO/discoverability basics that didn't exist at all:**
- Per-page `<title>`/description metadata for every marketing page (`src/app/(marketing)/*/page.tsx`, `src/app/enroll/page.tsx`) — previously every single page shared one generic site-wide title from the root layout, meaning a shared `/programs` or `/contact` link showed the homepage's title in browser tabs and search results. Root layout (`src/app/layout.tsx`) now uses Next.js's title-template pattern (`"%s | Parent-First Online Academy"`) so each page just sets its own specific title. Home and Enroll also got explicit Open Graph title/description (the two pages most likely to be advertised or shared) plus site-wide OG/Twitter defaults.
- `src/app/robots.ts` and `src/app/sitemap.ts` (new, Next.js App Router's native convention) — allow the 5 real public pages, disallow the entire authenticated dashboard tree, and explicitly disallow `/pricing` (already kept out of search via its own page-level `robots: {index:false}` — this reinforces it at the crawl level too).
- A real favicon (`src/app/icon.svg`) — there was none at all before. **Discovered and worked around a real environment bug along the way**: Next.js's dynamic `ImageResponse`-based icon generation (`next/og`) is broken on this specific Windows checkout because the project path contains a space (`Business Redirectors`) — `@vercel/og`'s bundled font-loading code constructs an invalid `file://` URL from that path and 500s on every request. Switched to a plain static `icon.svg` (matching the header's own brand mark: a rounded blue square) instead, which sidesteps server-side rendering entirely and works everywhere.
- Fixed a bug introduced by the robots/sitemap/icon additions themselves: `middleware.ts`'s matcher only excluded `favicon.ico`, so the newly-added `/robots.txt`, `/sitemap.xml`, and `/icon` routes were being caught by the auth check and redirected to `/login` for anyone not signed in — including Google's crawler. Extended the matcher's exclusion list to cover all of them.

**Privacy Policy and Terms of Service** (`/privacy`, `/terms`, new) — the enroll and referral forms collect a minor's name and a parent's phone number with zero privacy disclosure anywhere on the site before this. Written as an honest, plain-language draft grounded in what the app actually does (what's collected, why, who can see it, how to request deletion) — explicitly labeled in-page as a draft that needs a lawyer's review before being relied on as binding, not presented as finished legal work. Linked from the footer's copyright bar on every marketing page, and the `/enroll` form now has a "By submitting, you agree to our Privacy Policy" line linking to it.

**Password reset flow** (new, end-to-end) — there was no self-service or admin-assisted account-recovery path at all; a locked-out staff member had no way back in short of direct database access. Built the standard token flow:
- `PasswordResetToken` model (migration `20260908103908_password_reset_tokens`) — stores only a SHA-256 hash of the token, never the raw value, same reasoning as never storing a plaintext password.
- [`password-reset.ts`](src/lib/services/password-reset.ts) — `requestPasswordReset()` always behaves identically whether or not a matching account exists (never lets the endpoint be used to enumerate which emails have accounts); silently no-ops for phone-only accounts (no email delivery channel exists for those — the UI says so explicitly rather than pretending it'll work). `resetPassword()` verifies the token is unused and unexpired, updates the password, marks the token used, and — defense in depth — invalidates any *other* outstanding tokens for that user in the same transaction.
- `/forgot-password` and `/reset-password/[token]` (new, in `(auth)`) — reuse the exact visual style of the existing login page. A "Forgot password?" link was added next to the login form's password field.
- The reset email itself reuses the existing `emailService.sendMessage()` — the same SMTP infrastructure from Post-3F(b), no new delivery mechanism.
- **Verified live, the complete real flow**: requested a reset for a real seeded account, pulled the actual token out of the queued `EmailMessage` row in the database (since SMTP isn't configured in this dev environment — the email generation and queueing worked perfectly, only the final SMTP send failed, which is expected and matches how every other email in this app currently behaves in dev), used it to set a new password, confirmed login with the new password works, confirmed the *old* password no longer works, and confirmed the same token is rejected as "invalid or expired" on a second use (single-use enforcement). Restored the test account's original seeded password and deleted all test tokens/emails afterward.

### Database Migration Added

Yes — `20260908103908_password_reset_tokens`: adds the `PasswordResetToken` model and its back-relation on `User`. Purely additive.

### APIs Added

None (all new server actions, not REST endpoints).

### Environment Variables Required

None new — the password-reset email reuses whatever SMTP configuration already exists (Settings → Integrations, or the `SMTP_*` env fallback from Post-3F(b)).

### Known Issues / Limitations — deliberately deferred, not overlooked

- **Unbounded `findMany` queries on `/admin/leads`, `/admin/support`, `/admin/at-risk`, `/admin/engagement`, `/admin/predictive-risk`** — confirmed still true by the audit, previously self-documented as a known gap in an earlier phase and never fixed since. Left alone this pass: real but low-urgency at this academy's current data volume, and fixing five separate pages' pagination is a distinct, sizable piece of work from an "audit and patch gaps" pass — worth its own dedicated pass if data volume grows.
- **In-memory rate limiter won't survive a multi-instance deployment** — `src/lib/rate-limit.ts`'s own top-of-file comment already discloses this (state lives in one Node process's memory). The new `/enroll`/`/refer`/`/forgot-password` rate limits inherit this same limitation. Fine for a single-instance deployment; would need a shared store (Redis/Upstash) behind the same `checkRateLimit()` signature for a horizontally-scaled production deployment.
- **No email verification for staff accounts** — audited and deliberately not built: staff accounts are created by an Admin (Settings → Users), so the email is already trusted at creation time rather than self-registered: unlike a public-signup product, there's no untrusted-email problem to solve here.
- **No maker-checker / dual-approval anywhere in the app** — confirmed still true, consistent with every earlier phase's own disclosure of this. Out of scope for a gap-and-patch pass; would be a deliberate architectural addition if ever wanted.
- **Privacy Policy / Terms content needs real legal review** — flagged explicitly, in-page, to the site's own visitors-who-operate-it (not just here): written to be honest about actual current practice, not to be legally bulletproof. Get a lawyer's eyes on the fee/refund/liability language in Terms and the data-retention language in Privacy before treating either as binding, especially given minors' data and Pakistan-specific regulatory considerations neither this session nor the audit agent is qualified to certify compliance with.

## Post-3F(w) — Full-System Live Regression Sweep

**Status: Complete — no regressions found.** Direct request: "check the entire system live for regressions." Post-3F(v) had touched `middleware.ts` twice, changed `nav-config.ts`, restructured root `layout.tsx` metadata, and applied two new Prisma migrations — enough surface area to warrant re-verifying every role portal and the marketing site live in one pass, rather than trusting each feature's own earlier isolated verification.

### What Was Checked

Logged into every role in turn (`owner@parentfirst.pk`, `admin@parentfirst.pk`, `usman.tariq@parentfirst.pk`, `hamza.sheikh2@student.parentfirst.pk`, `03023000001`, `counselor@parentfirst.pk` — all `password123`), reading live page content and the browser console after each navigation rather than relying on screenshots (a stale-frame issue when the browser pane is backgrounded was hit and cross-checked away several times earlier this session, so console/DOM checks were treated as the source of truth throughout):

- **Super Admin** — dashboard, `/admin/leads`, `/admin/academics`, `/admin/settings/users`, `/admin/communication`, `/admin/students`, a Student 360 profile, and a lead detail page (confirmed the counselor-assignment from earlier in the session persisted correctly). Signed out and confirmed `/admin` still correctly redirects an unauthenticated request (`opaqueredirect`), proving the twice-edited middleware still protects the dashboard tree.
- **Teacher** — dashboard, `/teacher/batches`, `/teacher/homework` (newly nav-linked in Post-3F(v)), `/teacher/timetable`, and `/teacher-assistant` directly by URL (confirmed it still works despite being deliberately unlinked from nav).
- **Student** — dashboard (new Next Actions card rendering a real "Revise a weak chapter" recommendation), `/student/exam-prep` and `/student/study-assistant` (both newly nav-linked), `/student/homework`, `/student/tests`.
- **Parent** — dashboard (Next Actions card, and the fee-reminder banner contrast fix from the earlier "make the front end better" pass still legible), `/parent/payments`.
- **Counselor** — dashboard, and `/counselor/leads` board view across all pipeline stages.
- **Marketing site** — `/home`, `/programs`, `/about`, `/contact`, `/enroll`, `/pricing`, `/privacy`, `/terms`, `/forgot-password`, confirming each page's own per-page `<title>` (the Post-3F(v) title-template fix) rendered correctly rather than the generic site-wide default.
- **Root routing** — confirmed `/` still redirects a logged-out visitor to `/login` (the app's own sign-in page), not `/home` — the explicit "home page should be on /home, on / we have our app" correction from earlier this session is still intact after all the subsequent middleware edits.

### Result

Zero console errors on any page across all six portals and the marketing site. No broken links, no misrouted redirects, no stale UI state. The two mid-session middleware edits, the nav-config additions, the metadata restructure, and both new migrations (`lead_assessment_document`, `password_reset_tokens`) are all confirmed working together correctly, not just individually.

### Database Migration Added

None — this was a verification-only pass, no code changes.

### APIs Added

None.

### Environment Variables Required

None new.

### Known Issues / Limitations

None found. The previously-documented deferred items from Post-3F(v) (unbounded `findMany` queries, in-memory rate limiter, no dual-approval, Privacy/Terms needing legal review) remain open and unchanged — this pass didn't re-triage them, only confirmed nothing new broke.

## Post-3F(x) — Portal Rebrand Onto the Marketing Site's Color Palette

**Status: Complete and verified.** Direct request: "change the complete designing of the portals, make best and pro level ui, use the color palette of marketing pages in the portal as well." Until now the public marketing site (built earlier this session under its own "Skylight" theme, scoped to `.theme-skylight`) and the six role portals ran two different brand blues side by side — a deep indigo (`224 76% 38%`) in the app, a softer sky blue in the marketing pages — so a parent moving from an ad to the enroll form to their actual dashboard was crossing what looked like two different products.

### Approach

Inspected the codebase before touching anything: every dashboard surface (`Button`, `Card`, `Badge`, `StatCard`, `SidebarNav`, `DashboardShell`, the Recharts wrappers) is already 100% token-driven — confirmed with a grep across `src/app/(dashboard)` and `src/components` for any hardcoded Tailwind color literal (`bg-blue-600` etc.); zero hits. That meant a full portal rebrand was achievable at the CSS-variable layer alone, cascading correctly everywhere with no risk of missed hardcoded spots — the actual per-page work was verification, not remediation.

### Features Completed

**Unified brand blue** — `src/app/globals.css`'s `:root` (light) and `.dark` tokens were re-derived from the marketing Skylight palette's exact hue family (`~217°`) instead of the old indigo (`224°`). Kept deliberately *not* identical to Skylight's own values: the marketing primary (`216 51% 53%`) is mostly used there for text links, icon rings, and badges rather than full-contrast solid buttons, so it can afford to sit lighter/airier; the dashboard paints this same color as solid button fills and the sidebar's active-nav-item background at small sizes, which needs more depth to hold contrast against white text — so the app's `--primary` landed at `217 65% 45%`, same hue, tuned for its actual job. `--warning` was also nudged from `32°` to `38°` (more amber/gold) specifically so it stays visually distinct from the new `--cta` accent (`25°`, terracotta) now that both live in the same token scope — a warning badge and a call-to-action button should never look like the same color family.

**The marketing site's reserved CTA accent now exists in the app, too** — `--cta`/`--cta-hover`/`--cta-foreground`/`--cta-wash` (previously scoped only to `.theme-skylight`) were added to `:root` and `.dark`, and a matching `cta` variant was added to the shared `Button` component (`src/components/ui/button.tsx`). Deliberately **not** sprinkled onto every primary action in the app — that would dilute the "reserved for the one real call to action" principle the marketing site already established, and turn "pro and considered" into "busy." Applied it only where a portal user is doing the literal same real-world thing the marketing CTA sells (paying money): the parent dashboard's fee-reminder banner "Pay now" link (`src/app/(dashboard)/parent/monthly-fee-banner.tsx`, upgraded from a plain underlined link to a small terracotta pill) and both the trigger and submit buttons on the Submit Payment dialog (`src/app/(dashboard)/parent/payments/submit-payment-dialog.tsx`). Staff-side payment recording (`students/[id]/payments-tab.tsx`) was deliberately left on the ordinary blue `default` button — that's internal data entry, not a parent-facing conversion moment, so extending the accent there would have been arbitrary rather than meaningful.

**Brand chrome updated to match** — `src/app/layout.tsx`'s `viewport.themeColor` (the mobile browser-chrome tint) and `src/app/icon.svg`'s favicon fill both moved from the old indigo hex to the new primary's hex (`#2861bd`), so the browser tab icon and mobile address-bar color agree with the app's own new primary color instead of a third, orphaned shade.

**Verified live across every portal**, screenshotting after each: Super Admin dashboard, Leads pipeline, Communication Center, Academic Structure; Teacher dashboard; Parent dashboard (fee banner CTA) and Payments page (Submit Payment CTA); Counselor dashboard. Confirmed the new `--warning` hue reads as a distinct golden-amber against the terracotta `--cta` wherever both appear near each other (e.g., a Lead's "Payment Pending" badge next to a page that also has a CTA button). `npx tsc --noEmit` clean; zero console errors on any checked page.

### Database Migration Added

None — CSS/token and component-class changes only.

### APIs Added

None.

### Environment Variables Required

None new.

### Known Issues / Limitations

- **`.dark` mode remains unreachable** — no theme toggle or `next-themes` provider exists anywhere in the app (confirmed by grep), so the `.dark` token block updated in this pass is future-proofing for if dark mode is ever wired up, not something a real user can currently trigger.
- **The `cta` accent's reach is intentionally narrow** — only the two parent-facing payment touchpoints use it today. If a future pass wants to extend the "real call to action" treatment further (e.g., a lead's "Convert"/stage-advance action, a campaign's "Send Now"), that should stay a deliberate, one-at-a-time decision per surface, not a blanket find-and-replace onto every `Button` default — that discipline is what keeps the accent meaningful.

## Post-3F(y) — Payments Section Rebuilt Into a Real Per-Student Ledger

**Status: Complete and verified.** Direct request, after the redesign, pointed at a real functional gap the palette pass hadn't touched: "what is this payment section? it's not clickable... there should be filters class wise name wise... we should be able to send notifications... if we click a student there should open his payment profile — how much he has paid, evidence of payments, overdue payments, current status, upcoming payment." Inspecting `/admin/payments` confirmed the complaint exactly — it was two flat, unfiltered tables (pending/overdue installments, recent payments) with plain-text student names, no way to drill into one student, and no send-a-reminder action anywhere.

### Features Completed

**A real per-student payment ledger, not just installment rows** — new [`paymentsService.listStudentsPaymentOverview()`](src/lib/services/payments.ts) returns one row per student (fee total, paid-to-date, remaining, the single most-relevant next-or-overdue installment, and a computed `NO_PLAN | OVERDUE | PENDING | PAID_UP` status) instead of a flat list of installments with no student-level rollup. Paginated and filtered **at the database level** (Prisma relational `where` clauses on `paymentPlans.installments`, mirroring the exact `buildXWhere` + `skip`/`take` + `count` pattern already established by [`leadService.listLeads`](src/lib/services/leads.ts)) rather than fetching everything and filtering in JS — filtering by status (e.g. "page 2 of overdue Class 9 students") had to mean the real 16th–30th such student, not a page miscounted by post-fetch filtering.

**Filters exactly as asked** — [`admin/payments/page.tsx`](src/app/(dashboard)/admin/payments/page.tsx) now has a name search box plus Class (academic level), Batch, and Status dropdowns, reusing the app's existing `FilterBar`/`FilterSelect`/`Pagination` shared components (the same ones the Leads list already uses) rather than inventing new filter UI.

**Every student row is clickable** — wired via `DataTable`'s existing `rowHref` prop (already used by the At-Risk Students and Leads lists, just never applied to Payments) to `/students/{id}?tab=payments`. That destination — total fee, paid, remaining, each installment's due date and status, full payment history with method/reference and a receipt link when one was uploaded — already existed as the student profile's Payments tab; it just wasn't reachable from anywhere on the Payments page before. The click-through needed one small platform addition: the student profile page ([`students/[id]/page.tsx`](src/app/(dashboard)/students/[id]/page.tsx)) now reads a `?tab=` search param and passes it as the Tabs' `defaultValue`, so a link can deep-link straight to Payments instead of always landing on Overview.

**"Send Reminder" — reuses the real automated channel, on demand** — new [`paymentsService.sendManualPaymentReminder()`](src/lib/services/payments.ts) fires the exact same `PAYMENT_REMINDER` notification + WhatsApp + email dispatch the scheduled job in [`src/lib/jobs/payment-reminders.ts`](src/lib/jobs/payment-reminders.ts) already sends automatically — same `dispatchAlert()` call, same template — but callable immediately by staff for one specific student, bypassing that job's once-per-day dedup marker since a deliberate manual send is a distinct action, not a duplicate. A `Send Reminder` button (new [`send-reminder-button.tsx`](src/app/(dashboard)/admin/payments/send-reminder-button.tsx)) appears on every row that's Overdue or Pending, targeting that student's oldest unpaid installment.

**`StatusBadge`** ([status-badge.tsx](src/components/shared/status-badge.tsx)) gained two new label mappings (`PAID_UP`, `NO_PLAN`) for the per-student aggregate status — purely additive to the existing lookup table, nothing else changed.

**Verified live, end-to-end**: filtered by Class 8 (5 students, all correctly Class 8) and by Overdue status (every row genuinely overdue); clicked a student row through to their Payments tab and confirmed it landed there directly, not on Overview; clicked Send Reminder on a real overdue installment and confirmed — by querying the database directly, not just watching the UI — that it created a real `Notification` row, a real `WhatsAppMessage` row (status `SENT`, correct template/variables), and an `AutomationLog` entry tagged `manually sent by staff`; then deleted those three test rows afterward. Re-checked all six portals (Super Admin, Teacher, Student, Parent, Counselor, plus a shared student-profile view) for regressions from this change — all clean, zero console errors. `npx tsc --noEmit` clean.

### Database Migration Added

None — every field this reads already existed (`PaymentPlan`, `Installment`, `Payment`, `Student.academicLevelId`, `BatchStudent`).

### APIs Added

None (new server action `sendPaymentReminderAction`, not a REST endpoint).

### Environment Variables Required

None new.

### Known Issues / Limitations

- **One reminder per click, targeting the oldest unpaid installment** — if a student has several overdue installments at once, "Send Reminder" nudges about the single oldest one rather than listing all of them. Matches how the automated job already treats reminders (one alert per installment-stage transition), so this isn't a new limitation, just carried forward.
- **The Send Reminder button sits inside a `rowHref` row** — on the desktop table this is safe (the row-link overlay only covers the first column, confirmed by reading `DataTable`'s implementation), but on the mobile card layout the whole card is the link, so the button is technically nested inside an anchor. This is a pre-existing pattern already present on the At-Risk Students list (its `CreateInterventionButton` has the same shape), not something newly introduced here — flagged for awareness, not fixed, since fixing it would mean changing shared `DataTable` behavior relied on elsewhere.

## Post-3F(z) — Bulk "Remind All Overdue" on the Payments Page

**Status: Complete and verified.** Direct follow-up request: "add a bulk reminder button to send to all overdue at once." The per-student Send Reminder button from Post-3F(y) only ever targeted one installment at a time — reasonable for a one-off nudge, but tedious for a staff member who wants to clear the whole overdue list in one pass.

### Features Completed

**One reminder per overdue student, academy-wide — not per page, not per installment.** New [`paymentsService.sendBulkOverdueReminders()`](src/lib/services/payments.ts) finds every currently-overdue installment academy-wide (ignoring the page's own filters/pagination — "all overdue" means the real total, matching the "Overdue Amount" stat card above it, not just the 15 rows on screen), then de-duplicates down to one reminder per *student* — a student with two overdue installments gets a single message about the older one, reusing the exact same "oldest unpaid first" rule the per-row button already applies, rather than double-messaging their parent. Internally it just calls the existing [`sendManualPaymentReminder()`](src/lib/services/payments.ts) once per student in a sequential loop, wrapped in a per-student try/catch — the same "one bad contact must never sink the whole batch" precedent already established by the Communication Center's own campaign sends, so nothing about the underlying send/template/dedup logic was duplicated or reinvented.

**A real confirmation step, not a one-click blast** — new [`send-bulk-reminder-button.tsx`](src/app/(dashboard)/admin/payments/send-bulk-reminder-button.tsx) shows the exact count ("Remind All Overdue (15)"), and clicking it opens a confirmation dialog stating plainly what will happen (one WhatsApp + email-if-on-file + in-app notification per overdue student, "cannot be undone") before anything sends — this fans out to potentially dozens of parents at once, so it doesn't fire on the first click the way the single-student version reasonably does. The button hides itself entirely when there are zero overdue students, via a new [`paymentsService.countOverdueStudents()`](src/lib/services/payments.ts) reusing the exact same filter builder the Status dropdown already filters by, so the count in the button's own label can never drift out of sync with what "Overdue" actually means elsewhere on the page.

**Verified live, end-to-end against the real seed data**: clicked through the confirmation on all 15 real overdue students, then confirmed via direct database queries (not just the toast) that it produced exactly 15 `WhatsAppMessage` rows, 15 `AutomationLog` entries (one per student, each individually tagged "manually sent by staff" — identical to what a single manual send produces), 9 `Notification` rows (fewer than 15 because some parent contacts are phone-only with no linked user account, which is the existing, expected contact model — not a bug), and one summary `AuditLog` row (`entityId: "bulk-overdue"`) recording `{studentsProcessed: 15, studentsNotified: 15, parentsNotified: 15}`. All test rows deleted afterward. Re-confirmed the Payments page still renders correctly post-send (sending a reminder doesn't change any installment's status, so the overdue count correctly stayed at 15). `npx tsc --noEmit` clean.

### Database Migration Added

None.

### APIs Added

None (new server action `sendBulkOverdueRemindersAction`, not a REST endpoint).

### Environment Variables Required

None new.

### Known Issues / Limitations

- **Sequential, not parallel** — a bulk send to N overdue students takes roughly N times one message's round-trip (observed ~54 seconds for 15 students against the console provider in dev; a real WhatsApp/SMTP provider would be slower still). Deliberate, matching the Communication Center campaign precedent (keeps provider rate limits honest), but worth knowing this is a "click it and wait" action, not instant — the button's own pending state ("Sending…") communicates this rather than the page freezing silently.
- **Ignores the page's current filters** — "Remind All Overdue" always targets every overdue student academy-wide, even if the Class/Batch filters are narrowed to one class. This was a deliberate simplification (the request was "send to all overdue at once," not "send to all overdue in the current filter"); if a future ask wants a filter-scoped bulk send instead, that's a distinct, easy follow-up (pass the same `academicLevelId`/`batchId` into the bulk query) rather than a redesign.

## Post-3F(aa) — Two Homework/Test Records Restored for Students, AI Access Removed for Students

**Status: Complete and verified.** Two related but distinct requests in the same session. First: "how does homework work" led to the user noticing students could never see back what they'd actually submitted, and separately that a graded test only ever showed a bare score with no per-question review — both real gaps for a use case the user cares about ("this will help the student prepare for the exam later"). Second, immediately after: "remove study assistant link from students portals, i dont wanna give students any access of ai" — investigating that literal request surfaced two *other* AI surfaces reachable by students beyond the one named link, so the actual scope was clarified with the user before touching anything.

### Features Completed

**Student's own homework submission is now visible to them** ([student/homework/subject/[subjectId]/page.tsx](src/app/(dashboard)/student/homework/subject/[subjectId]/page.tsx)) — a "Your submission:" block now shows the link they submitted, a link to their uploaded file, and their typed comments, once submitted. The data already existed (`HomeworkSubmission.attachmentUrl/attachmentFileId/studentComments`) and file access control already correctly scoped a student to their own file — the gap was purely that nothing on the student's own page ever rendered it back. Verified live end-to-end: assigned a real homework as a teacher, submitted it as the student with a real link+comment, confirmed it displayed back immediately, graded it as the teacher, and confirmed the student then saw marks + feedback + their own original submission together.

**Graded tests now show a full per-question review, not just a score** ([student/tests/[id]/page.tsx](src/app/(dashboard)/student/tests/[id]/page.tsx)) — `ResultView` was extended to walk every question alongside the student's stored answer (`TestAttempt.answers`, already recorded at submit time) and show, per question: marks awarded/max, and for MCQ every option with the student's pick and the correct one both highlighted (green for correct, red for their wrong pick), or for numerical/subjective questions their answer text plus the correct answer when they got it wrong. This is a pure read/render addition — no new data collection, no schema change; the answer data was already being captured, just never displayed back. Verified live against a real graded test result (5 questions, mixed MCQ/numerical/short-answer) — rendered correctly including a case where the seeded answer data didn't match any real option text, which correctly fell through to "no option highlighted as the student's pick" rather than mis-attributing an answer.

**All AI access removed for the Student role** — investigating "remove study assistant link" surfaced three AI surfaces, not one; presented all three to the user and confirmed full removal (their explicit choice, not assumed) before proceeding:
- `/student/study-assistant` (the chat) — nav link removed ([nav-config.ts](src/lib/nav-config.ts)), and the page itself now unconditionally redirects to `/student` for anyone who reaches it by a stale bookmark or typed URL, rather than just being unlinked-but-reachable (the precedent set earlier this session for `/teacher-assistant`, which was a declutter request, not an access-removal one — this is a different, stronger instruction and got a different, stronger fix).
- `/student/study-plan` — never linked in nav, but the Next Actions card's "Revise a weak chapter" recommendation linked straight to it for every student with a recent weak test score. Same redirect-to-`/student` treatment, **and** the link source itself was fixed — [`next-actions.ts`](src/lib/services/next-actions.ts) now points that recommendation at `/student/exam-prep` instead, which already surfaces the same underlying "which chapter is weak" data with zero AI involved.
- `/student/exam-prep` — this page is mostly *not* AI (a countdown, a weak-chapters list, and a study-progress bar are all plain data queries) and stays fully intact and nav-linked; only its "Recommended Revision Plan" card — the one part that called `getAIProvider()` — was removed from [exam-prep-view.tsx](src/app/(dashboard)/student/exam-prep/exam-prep-view.tsx), along with the now-fully-unused [exam-prep/actions.ts](src/app/(dashboard)/student/exam-prep/actions.ts) (deleted) and the plan-fetching code in its `page.tsx`. The underlying `generateExamPrepPlan`/`getLatestExamPrepPlan` functions in `src/lib/services/exam-prep.ts` were deliberately left in place rather than deleted — they're generic, reusable AI-plan infrastructure not intrinsically student-specific, and deleting library code that was never the actual target (the student-facing trigger points were) would have been a bigger, less reversible change than what was asked.

Verified live: nav no longer lists Study Assistant; direct navigation to both `/student/study-assistant` and `/student/study-plan` redirects straight to `/student`; the Next Actions "Revise a weak chapter" link now points at `/student/exam-prep`; Exam Prep Mode itself still loads cleanly with its updated (AI-free) description and zero console errors; Parent dashboard (which renders the same Next Actions data) also verified clean. `npx tsc --noEmit` clean throughout.

### Database Migration Added

None.

### APIs Added

None.

### Environment Variables Required

None new.

### Known Issues / Limitations

- **Underlying AI feature code (chat component, service functions) was not deleted, only disconnected** — `study-assistant-chat.tsx`, `study-assistant/actions.ts`, and the exam-prep service's AI plan functions all still exist in the codebase, just unreachable from the student role. This was deliberate (matches "remove access," not "delete the feature," and keeps the change easily reversible), but means a future contributor could accidentally re-wire one of these back in without realizing it was a deliberate product decision — worth a code comment if that risk ever materializes in practice.
- **Only the STUDENT role was touched** — Study Assistant and Study Plan were always student-only features (their server actions already threw for any other role), so no other role's access changed. If "no AI access" is ever meant to extend to another role, that would need its own explicit instruction — nothing here assumes it.

## Post-3F(bb) — Study Material Locked to View-Only, Parent Access Removed, Notes-by-Post Subscription Built

**Status: Complete and verified.** Three related requests handled as one phase: (1) students shouldn't be able to download study material, only view it; (2) parents shouldn't have access to study material or recordings at all — "any private material of the academy"; (3) a new physical-mail subscription service, Rs 1,500/subject/student/month, parent-paid, academy-fulfilled. Explicitly asked to research before building, so the actual current architecture was inspected first rather than assumed.

### What research found, before any code changed

Study Material worked exactly like Class Recordings already did: `StudyMaterial.fileUrl` was a plain pasted external link (Google Drive, in the seed data) with zero upload flow — meaning the app never controlled the file at all, and "prevent download" was structurally impossible for anything already built this way, the same hard ceiling hit earlier this session with recording videos. Unlike video, though, study material is small documents (PDFs/images) — well within reach of this app's *existing* `UploadedFile` + `/api/files/[id]` infrastructure (already used for homework submissions and payment receipts), which serves every file `Content-Disposition: inline` and re-checks access on every request. That made a real, meaningfully stronger guarantee achievable here in a way it wasn't for video: no public link ever exists to leak or forward, and access is re-verified server-side per request, not just hidden behind a missing UI button.

Separately, inspecting the Student 360 profile (`students/[id]/page.tsx`) confirmed parents currently *could* open the Study Material tab (only the Recordings tab was already parent-excluded) — a real, concrete gap against "parents should not have access," not a hypothetical one.

For the subscription piece: Subjects in this schema are global, not scoped per academic level (`Subject.academicLevelId` is unused catalog metadata) — a first design used it to filter "subscribable subjects" and produced an empty list for every real student; caught live during verification and fixed to source subjects from the student's own batch (`BatchSubject`, the same source of truth the batch's Homework/Tests tabs already use for "what does this student take"). Payments confirmed to have no real gateway behind them anywhere in the app (`admin/settings/payment-gateway` explicitly says so) — so the subscription's billing reuses the exact same self-reported-then-staff-verified shape as tuition payments, not a new mechanism.

### Features Completed

**Study Material is now uploaded, not linked** — `StudyMaterial.fileUrl` became nullable, a new `fileId` (`UploadedFile`, `STUDY_MATERIAL` purpose) was added alongside it. The admin "Upload Study Material" dialog ([level-material-list.tsx](src/app/(dashboard)/admin/study-material/[levelId]/level-material-list.tsx)) now takes a real PDF/image file (Word documents deliberately excluded — no browser can show one view-only) instead of a URL text field; existing pasted-link material keeps working exactly as before (`fileUrl` fallback, flagged in the admin list as "Legacy link — not view-protected" so staff know which items are and aren't actually protected).

**Students can view but not download** ([material-item.tsx](src/app/(dashboard)/student/study-material/material-item.tsx)) — PDFs render inline via an iframe (`#toolbar=0`, hides Chrome's built-in download button), images render inline with right-click and drag disabled — the same deterrent pattern already applied to recording video this session. No "open in new tab" link is ever shown for uploaded material, since that would just hand back a downloadable same-origin URL. As disclosed honestly for the video case too: this is a strong, real access-control guarantee (no public link exists, every request is re-checked server-side) layered with UI-level download deterrents — not literal DRM. A screenshot or browser-devtools capture remains possible; nothing served to a browser can fully prevent that.

**`/api/files/[id]` gained a `STUDY_MATERIAL` branch** that deliberately has no PARENT case at all — a parent's request for a material file is simply refused (`403`), the strongest possible enforcement of "no access," verified live by hitting the endpoint directly as a parent and getting `Forbidden`, not just relying on a hidden UI link.

**Parents lost the Study Material tab entirely** on the Student 360 profile ([students/[id]/page.tsx](src/app/(dashboard)/students/[id]/page.tsx)) — both the `TabsTrigger` and `TabsContent` now wrapped in the same `{!isParentViewer && ...}` guard Recordings already used. Verified live: the tab list for a parent viewing their child now reads Overview/Attendance/Homework/Tests/Payments/Performance/Parent Reports/Communication/Engagement — no Recordings, no Study Material.

**New Notes-by-Post subscription feature**, built as two new models (`NotesSubscription`, `NotesSubscriptionPayment`) plus a new `notes-subscriptions.ts` service:
- **Parent-facing** ([parent/notes-subscription](src/app/(dashboard)/parent/notes-subscription/page.tsx), new nav item "Notes by Post") — one card per subject the student's batch actually teaches; not-yet-subscribed subjects show a "Subscribe" dialog collecting a full delivery address (name/address/city/phone, prefilled from the student's name and the parent's own phone, editable); an active subscription shows the delivery address on file, this month's payment status, a "Pay This Month — Rs 1,500" flow (method + reference + receipt upload, identical shape to the existing tuition Submit Payment dialog), and a Cancel option.
- **Admin-facing** ([admin/notes-subscriptions](src/app/(dashboard)/admin/notes-subscriptions/page.tsx), new nav item "Notes Subscriptions") — active-subscription count, expected monthly revenue, and a paid-awaiting-shipment count as headline stats; a review queue for pending payments (approve/reject, mirroring the tuition `ReviewQueue` exactly); a full subscription table with delivery address and a "Mark Shipped" action (optional tracking note) once a month is paid.
- **Receipt files** get their own `NOTES_SUBSCRIPTION_RECEIPT` purpose on `/api/files/[id]`, readable by the owning student, any linked parent, or staff — the same access shape as `PAYMENT_RECEIPT`.
- Price (`Rs 1,500`) is a named constant (`NOTES_PRICE_PER_MONTH`) snapshotted onto each subscription at signup, so a future price-list change never rewrites what an existing subscriber already agreed to pay.

**Verified live, the complete real flow**: uploaded a real PDF as staff, confirmed a student could view it inline with no download link and zero console errors, confirmed a parent got `403 Forbidden` requesting the same file directly by URL; subscribed a real student to English notes as their parent (full delivery address), submitted a real month's payment with a receipt, approved it as staff, marked it shipped, and confirmed the parent saw "Paid" then "Mailed [date]" — all against real data, not a stub. All test rows (subscription, payment, receipt file, study material, uploaded file) deleted afterward.

### Database Migration Added

Yes, additive — `FilePurpose` gained `STUDY_MATERIAL` and `NOTES_SUBSCRIPTION_RECEIPT`; `StudyMaterial.fileUrl` became nullable and gained `fileId`; two new models (`NotesSubscription`, `NotesSubscriptionPayment`) and a new `SubscriptionStatus` enum. **Applied via `prisma db push`, not a named `prisma migrate dev` migration** — this environment's non-interactive shell can't get past `migrate dev`'s confirmation prompt (it hard-refuses non-TTY input rather than reading from stdin, even with `--create-only`), so there's no migration file recording this change under `prisma/migrations/`, only the live schema-sync. Worth doing a proper `migrate dev` from an interactive terminal at some point to backfill a real migration file for this change.

### APIs Added

None (all server actions).

### Environment Variables Required

None new.

### Known Issues / Limitations

- **No automated monthly billing cycle** — a parent (or staff) has to actively submit/record each month's Rs 1,500 payment; nothing auto-generates next month's due amount or reminds anyone it's due. Given the academy has no live payment gateway to charge automatically anyway, this matches how tuition itself already works (installments are pre-generated at plan-creation time, not on a rolling monthly basis) — a deliberate scope match, not an oversight, but worth automating later if volume grows (e.g., a scheduled job that creates next month's `NotesSubscriptionPayment` row a few days before it's due, mirroring `payment-reminders.ts`'s existing rule shape).
- **Orphaned files on disk after deletion** — deleting a `StudyMaterial` row (or a notes-subscription payment) removes the database record but not the underlying file bytes under local disk storage. Confirmed this is a pre-existing gap shared by every other delete path in the app (homework attachments, payment receipts never clean up their physical file either) — not something newly introduced here, and not fixed here since it's a broader, separate cleanup job across every upload purpose, not specific to this phase's work.
- **Legacy study material stays permanently unprotected** — any material uploaded before this change (pasted Drive/external links) keeps working via the old `fileUrl` path with zero view-only enforcement, flagged in the admin list so staff can tell which items still need re-uploading if they want the new protection retroactively. Nothing here migrates old links to real uploads automatically.
- **No automated shipping-label generation or courier integration** — "Mark Shipped" is a manual staff action with a free-text tracking note; there's no actual courier API wired in. Reasonable for a first version at this academy's scale.

## Post-3F(cc) — Rebrand to "Head Mark Coaching" (New Logo, App-Wide Name Change)

**Status: Complete and verified.** The app (previously "Parent-First Online Academy") was rebranded to **Head Mark Coaching**, including a newly-designed logo mark. The user provided a reference logo image twice, but both copies (identical 618,956-byte payloads, confirmed via extracting their embedded base64 pixel data) turned out to be the same background-removal-damaged file — visible blue haloing and red/orange pixel noise baked directly into the RGB data, not an alpha-channel or format issue, so no amount of re-encoding or cropping could recover a clean copy. This was explained to the user directly rather than repeatedly asking for "the real file," and the user then supplied a full written design specification instead (exact palette, required composition, explicit prohibitions on raster/gradients/3D/human imagery, semantic SVG structure) to build the mark from scratch as true vector art.

### Logo construction

Built as hand-authored SVG geometry (not traced from any image) — a graduation cap over an "HM" monogram (stroked skeleton paths for even line-weight on the diagonal strokes, rather than filled outline polygons), a small diagonal "growth" mark, and an open-book base, using the app's existing Skylight palette hex values so the mark and the UI share one true source of color. Delivered as four standalone SVG files (icon-only, wordmark-no-tagline, full lockup, and a version with background) plus a `preview.html`, all under [head-mark-coaching/](head-mark-coaching/) with production copies under [public/brand/](public/brand/). Two real visual defects were caught and fixed during a self-review pass before finalizing (required explicitly by the user's spec): the growth-mark originally crossed through and visually tangled with the cap's tassel — shortened to stay within the monogram's own bounds; the open-book was originally built from curved Bezier "highlight" shapes that read as a blobby, indistinct shape — rebuilt as flat quadrilateral wedges with thin fold-lines, reading clearly as book pages.

A single reusable component, [head-mark-emblem.tsx](src/components/shared/head-mark-emblem.tsx), wraps the monogram-only mark as inline React SVG (fixed brand colors, not theme tokens, since a brand mark should not shift with dashboard theming) and is now the one place the emblem's geometry lives — every other file below just imports and sizes it.

### Where it was applied

- **Favicon** — [src/app/icon.svg](src/app/icon.svg) rewritten to the new mark with a rounded backdrop for legibility at tiny sizes.
- **Dashboard sidebar** (all portals) — [sidebar-nav.tsx](src/components/shared/sidebar-nav.tsx) badge replaced with `<HeadMarkEmblem>`, text updated to "Head Mark" / "Coaching".
- **Marketing header and footer** — [marketing-header.tsx](src/app/(marketing)/marketing-header.tsx), [marketing-footer.tsx](src/app/(marketing)/marketing-footer.tsx) — badge and all brand-name text updated, including the footer's `©` line.
- **Auth pages** — [login-form.tsx](src/app/(auth)/login/login-form.tsx), [forgot-password-form.tsx](src/app/(auth)/forgot-password/forgot-password-form.tsx), [reset-password-form.tsx](src/app/(auth)/reset-password/[token]/reset-password-form.tsx) — badge replaced on all three.
- **Enroll (public trial-booking) page** — [enroll/page.tsx](src/app/enroll/page.tsx) — badge, on-page text, and `metadata` (description, OpenGraph title) updated.
- **Root metadata** — [layout.tsx](src/app/layout.tsx) — `title.default`, `title.template`, `openGraph.siteName`.
- **Remaining marketing pages and service copy** — plain-text brand name swapped across [home](src/app/(marketing)/home/page.tsx), [about](src/app/(marketing)/about/page.tsx), [contact](src/app/(marketing)/contact/page.tsx), [pricing](src/app/(marketing)/pricing/page.tsx), [privacy](src/app/(marketing)/privacy/page.tsx), [terms](src/app/(marketing)/terms/page.tsx), [refer/[code]](src/app/refer/[code]/page.tsx), the AI assistant's system prompt ([ai-assistant.ts](src/lib/services/ai-assistant.ts)), and the password-reset email subject line ([password-reset.ts](src/lib/services/password-reset.ts)).

The old placeholder (a generic `GraduationCap` icon in a colored square, used only as the logo badge) was removed everywhere it stood in for the brand mark. `GraduationCap` remains in use elsewhere in the app purely as a generic education icon (e.g. stat cards, nav icons) — those are unrelated to the logo and were correctly left alone.

### Verified live

Confirmed via a running dev server and `tsc --noEmit` (clean, zero errors): the new emblem and "Head Mark Coaching" text render correctly in the sidebar (all portals), the marketing homepage header and footer, and the favicon tab; page `<title>` reflects the new name and template on both a dashboard route and a marketing route; footer copyright line reads "© 2026 Head Mark Coaching."

### Database Migration Added

None — this phase is UI/branding/copy only, no schema changes.

### APIs Added

None.

### Environment Variables Required

None new.

### Known Issues / Limitations

- **The contact email address (`hello@parentfirst.pk`) was deliberately left unchanged** — changing a live contact email is an infrastructure/business decision (DNS, inbox ownership), not a rename-sweep text edit, so it was explicitly scoped out rather than silently changed.
- **Two corrupted source logo files remain on disk** under `Downloads/` as the user originally provided them — not deleted, since they weren't created by this session and may still hold sentimental/reference value to the user even though they weren't usable as-is.
