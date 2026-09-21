# Automation Engine

8 typed rules (`AutomationRuleKey`), each an `AutomationRule` row with an `isActive` toggle and a `config` JSON blob of tunable thresholds, edited from Settings → Automation Rules. This is a deliberate scope simplification — 8 fixed, typed rules with configurable thresholds, not a generic no-code trigger/condition/action rule builder.

## Event-driven (fires immediately, no schedule needed)

Hooked directly into the service functions that already handle the underlying write, so no separate polling process is required:

- **Student Misses Class** — `batches.ts`'s `markAttendance()`. 2 consecutive absences (configurable) → notifies teacher + parent + admin.
- **Low Test Performance** — `tests.ts`'s auto-grading and manual grading paths. Below-40% (configurable) → flags for teacher review; repeated → notifies parent.

## Scheduled (need something calling them on a timer)

Homework Overdue, Payment Reminders, Student Inactivity, Trial Expiry, Lead Follow-up, Class Reminders, Weekly Parent Reports, Engagement Score recalculation, Predictive Risk recalculation. See `src/lib/jobs/*.ts` — one pure function per job.

Two ways to trigger them:
1. **Production**: any external scheduler → `POST /api/cron/<job>` with `Authorization: Bearer <CRON_SECRET>`.
2. **Local dev**: `npm run jobs:watch` (real cadence via `node-cron`) or `npm run jobs:run` (once).

Both paths call the exact same code (`runJob()` in `src/lib/jobs/index.ts`) — there is only one place job logic lives, and only one place its outcome is logged.

## Observability (Phase 3E)

Every `runJob()` call now persists its outcome to `JobRun` (`jobKey`, `status`, `itemsProcessed`, `errorMessage`, `startedAt`/`finishedAt`) — this closes a real gap found during the Phase 3E review: `/api/cron/[job]` already returned a job's error in its HTTP response, but nothing persisted that anywhere queryable, so a failure called by an external scheduler with nobody watching the response body was effectively invisible. `/admin/system-health` shows the latest run per job plus recent history.

Every rule firing (event-driven or scheduled) also writes an `AutomationLog` row (rule, student/lead, action, status) — the **Automation → Activity Log** page. Rows are capped at the 200 most recent (a hard recency cap, not true pagination — acceptable at today's scale, documented as a known limitation for very high-volume future usage).

## Dispatch

`dispatchAlert()` (used by automation, referrals, gamification, support) is the one shared function that creates an in-app `Notification` and, per-user WhatsApp preference, queues a `WhatsAppMessage` — new features never need to reimplement "notify someone."
