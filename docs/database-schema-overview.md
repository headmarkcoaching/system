# Database Schema Overview

Full source of truth: `prisma/schema.prisma`. This is a map of what lives where, not a field-by-field reference — see `PHASE_COMPLETION.md` for what shipped in which phase, and the schema file itself (organized in the same phase order, with section-header comments) for exact fields.

## Core identity & structure

- `User` — one row per login, `roleKey` drives all RBAC. Linked 1:1 to a `Student`/`Parent`/`Teacher`/`Counselor` profile via optional `userId`.
- `AcademicLevel`, `Board`, `Group`, `Program`, `Subject` — the academy's own taxonomy, referenced (mostly via nullable FKs) by nearly everything else for scoping.
- `Batch`, `BatchStudent`, `BatchTeacher`, `BatchSubject` — the class-group unit everything schedules around.

## People

`Student`, `Parent`, `StudentParentRelationship` (multi-child support), `Teacher`, `Counselor`.

## Academic operations (Phase 1–2)

`Timetable`, `LiveClass`, `Attendance`, `ClassRecording`, `StudyMaterial`, `Homework`/`HomeworkSubmission`, `Test`/`TestQuestion`/`TestAttempt`/`TestResult`, `StudentPerformance`, `PerformanceConfig`, `ParticipationScore`, `PaymentPlan`/`Installment`/`Payment`.

## Growth & retention (Phase 3)

`Lead`/`LeadActivity`/`LeadFollowup`, `Assessment`, `Trial`, `Announcement`/`Notification`, `ParentReport`, `CommunicationLog`.

## Automation & WhatsApp (Phase 4A)

`AutomationRule`/`AutomationLog`, `MessageTemplate`, `WhatsAppMessage`, `CommunicationPreference`.

## Analytics (Phase 4B)

`AnalyticsEvent` (forward-looking event log — not read by any report, present for future event-driven analytics). `Student.statusChangedAt` (retention calculations).

## Gamification, Referrals, Support, Engagement (Phase 4C)

`StudentPoint`, `Badge`/`StudentBadge`, `PointsConfig`, `Referral`/`ReferralReward`, `SupportTicket`/`SupportMessage`, `EngagementScore`, `Intervention`.

## AI (Phase 3A–3C)

`AIInteraction` (universal call log — provider/model/tokens/latency/status), `KnowledgeDocument`, `PredictiveRiskScore`.

## Learning Experience (Phase 3D)

`ContentProgress` (polymorphic — `contentKind` + `contentId` — video/study-material watch progress), `StudentGoal`.

## Platform (Phase 3E)

- `Organization`/`OrganizationSettings`/`OrganizationUser` — **schema-only** multi-tenant groundwork, zero rows, zero wiring into any existing query.
- `ApiKey` — bearer auth for `/api/v1/*`.
- `UploadedFile` — real file metadata (see `docs/api-architecture.md`'s File Management section); `HomeworkSubmission.attachmentFileId` and `SupportTicket.attachmentFileId` reference it alongside the pre-existing pasted-URL fields.
- `JobRun` — persisted outcome of every scheduled job run.
- `AIUsageConfig` — singleton, informational cost-control settings.

## Conventions worth knowing before adding a model

- **Singleton config pattern**: `id: "singleton"`, `upsert()` on every read — see `PerformanceConfig`, `PointsConfig`, `AIUsageConfig`.
- **Polymorphic reference pattern**: a `xxxType` + `xxxId` pair of plain fields instead of two real FKs, when a row can reference one of several unrelated tables — see `AuditLog` (`entityType`/`entityId`), `AnalyticsEvent`, `ContentProgress` (`contentKind`/`contentId`).
- **Schema-only stub models**: defined now so a future phase doesn't need a risky reshape of a live table later — always zero rows, zero application code reading/writing them, until the phase that actually builds the feature. Every phase's own "Known Issues" section in `PHASE_COMPLETION.md` says which stubs are still just schema.
- **Additive-only migrations are the default**: new nullable/defaulted columns and new enum values apply via a plain `npx prisma migrate dev` non-interactively. A reshape (dropping a column, widening a required field) on a table with real rows needs the diff-based workaround documented in `PHASE_COMPLETION.md`'s Phase 3A section.
