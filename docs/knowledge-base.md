# Knowledge Base

`src/lib/services/knowledge-base.ts`, `KnowledgeDocument` model. Reachable at `/knowledge-base` (a shared, un-prefixed route — see the Role Permissions doc for why).

## Document shape

- `title`, `docType` (PDF/Notes/Text/Study Guide/Past Paper/Teacher Content), optional `academicLevelId`/`boardId`/`groupId`/`subjectId` scoping (`null` = applies to all, matching `Subject.academicLevelId`'s existing nullable convention), optional `chapter`/`topic` free text, optional `sourceUrl`, and a required plain-text `content` field.
- Only `content` is ever readable by the AI — `sourceUrl` is a pasted link like every other attachment in this app (no PDF parsing exists), so a document with a source link but no pasted `content` grounds nothing.

## Approval workflow

`PENDING_REVIEW` → `APPROVED` / `REJECTED`. Any `ACADEMIC_STAFF_ROLES` member can review, including self-approving their own upload — same trust level as homework grading. **Students only ever see `APPROVED` documents** — enforced at the query level in `findRelevantDocuments()`, not just in the UI, so there is no path for an unapproved document's content to leak into an AI answer.

## Retrieval

`findRelevantDocuments(question, scope, limit=3)` filters to `APPROVED` + taxonomy-scoped documents (`OR: [{field: null}, {field: value}]` per scope dimension — deliberately not Prisma's `in: [value, null]`, which is unreliable), then ranks by keyword/word-overlap between the question and title+content. This is explicitly a placeholder for a future real vector-search/RAG pipeline, not semantic search — a generic follow-up question can incidentally re-match the same document via common-word overlap.

## Consumers

Every AI feature that's meant to be grounded calls `findRelevantDocuments()` and injects the results into the prompt behind a `=== KNOWLEDGE BASE CONTEXT ===` / `=== END KNOWLEDGE BASE CONTEXT ===` delimiter, which `ConsoleAIProvider` specifically recognizes and echoes: AI Study Assistant, Study Plan, Teacher Assistant's revision topics, Question Generation, Exam Prep's revision plan. Performance Analysis and Parent Report drafting are deliberately **not** KB-grounded — they synthesize real stats, not content lookup.
