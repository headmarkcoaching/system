# Role Permissions

## Roles

`RoleKey`: `SUPER_ADMIN`, `ADMIN`, `TEACHER`, `STUDENT`, `PARENT`, `COUNSELOR`. `STAFF_ROLES = [SUPER_ADMIN, ADMIN]`, `ACADEMIC_STAFF_ROLES = [SUPER_ADMIN, ADMIN, TEACHER]` (`src/lib/permissions.ts`).

## Two layers of enforcement

1. **Middleware (`src/middleware.ts`)** — edge-safe, path-prefix based. Redirects unauthenticated users to `/login`; confines each role to its own top-level section (`/admin`, `/teacher`, `/student`, `/parent`, `/counselor`). This is a coarse gate, not the real authorization boundary.
2. **Server-side, per-action** — every Server Action re-derives the session and asserts role/ownership itself (`requireRoleSession(allowed)`, `assertRole()`). **Client-supplied role claims are never trusted** — even if middleware were bypassed, every mutation checks the real session server-side.

## Shared-route pattern

Some features need access from more than one role-prefixed section (e.g. a Teacher and an Admin both need Knowledge Base). Rather than duplicating the page under `/admin/*` and `/teacher/*`, these live at an **un-prefixed shared route** with their own in-page role check: `/knowledge-base`, `/support`, `/teacher-assistant`, `/batches/[id]`, `/students/[id]`, `/parents/[id]`, `/teachers/[id]`, `/leads/[id]`, `/tests/[id]`. This was discovered as a real architectural gap in Phase 3A (the original plan put Knowledge Base at `/admin/knowledge-base`, which would have silently blocked Teacher access under the middleware's `/admin/*` gate) and has been the standard pattern for every cross-role feature since.

## Per-record ownership checks (`src/lib/access.ts`)

Beyond role, several actions need "does this specific user own/manage this specific record":

- `assertCanManageBatch(session, batchId)` — staff always; a teacher only if assigned to that batch.
- `assertCanManageTest(session, testId)` — same shape, via the test's batch.
- `assertCanManageLead(session, leadId)` — staff always; a counselor only if assigned to that lead.
- `assertCanManageSupportTicket(session, ticketId)` — staff always; anyone else only if they raised the ticket.

**Fixed during the Phase 3E security review** (two real IDOR — Insecure Direct Object Reference — bugs found and fixed): `submitHomeworkAction` and `submitTestAttemptAction` previously trusted a client-supplied `submissionId`/`attemptId` alone, checking only that the caller's role was `STUDENT` — meaning any authenticated student could submit/overwrite **another student's** homework submission or test attempt by guessing/knowing the ID. Both now resolve the caller's own `Student` record from session server-side and require the target row's owning `studentId` to match it before any write.

## Isolation guarantees (student/parent data)

- A student can only ever act on records where the resolved-from-session `studentId` matches the target row (see the fix above; `content-progress.ts`, `learning-path.ts`, `exam-prep.ts` were all built with this check from the start).
- A parent only ever sees children linked via `StudentParentRelationship` (`getChildrenForParentUser(userId)` — the query itself is scoped by the parent's own linked children, not a filterable client parameter).
- File downloads (`/api/files/[id]`) re-check the same ownership rule as the record referencing the file — a leaked/guessed file id alone is never sufficient.
- Knowledge Base: students only ever see `APPROVED` documents, enforced at the query level (`findRelevantDocuments`), not just hidden in the UI.

## Known gaps (documented, not fixed this pass)

- No maker-checker separation anywhere in the app — the same staff member who drafts/uploads/creates something can also approve it (Knowledge Base review, Parent Report approval, Intervention creation/cancellation, Goal creation). Consistent trust level throughout, not a regression.
