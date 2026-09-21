# API Architecture

## Server Actions (the primary interface, Phase 1 onward)

Every mutation and most reads go through Next.js Server Actions, colocated under each route's `actions.ts`, which call a shared `src/lib/services/*` layer. That service layer is what a public REST API (below) or a future mobile app would call, without needing to touch business logic — it's already the single source of truth for every rule (RBAC scoping, validation, side effects).

## Public REST surface — `/api/v1/*` (Phase 3E)

One representative endpoint (`GET /api/v1/students`) demonstrates the documented conventions the spec asked for in preparation for a future mobile app/external integration — not a full REST surface for every entity. Extending the pattern to more resources is mechanical once a real external consumer needs it: reuse `parsePagination`/`paginatedResponse`/`requireApiKey` from `src/lib/api-utils.ts`.

**Auth**: `Authorization: Bearer <key>`, a separate credential from a user's browser session (`ApiKey` model, managed at `/admin/settings/api-keys`). Only the SHA-256 hash is ever stored — the real key is shown to its creator exactly once, at creation.

**Pagination**: `?page=1&pageSize=20` (capped at 100/page). Response shape:
```json
{ "data": [...], "pagination": { "page": 1, "pageSize": 20, "total": 143, "totalPages": 8 } }
```

**Filtering**: plain query params matching the resource's own filterable fields (e.g. `?status=ACTIVE&academicLevelId=...`).

**Rate limiting**: 60 requests/minute per API key (`src/lib/rate-limit.ts`). **Known limitation**: the limiter is in-memory — it resets on redeploy/restart and does not share state across multiple server instances. A real multi-instance production deployment would need a shared store (Redis/Upstash) behind the same `checkRateLimit()` signature; the interface is already shaped so that's a drop-in swap, not a rewrite.

## Existing internal endpoints

- `POST/GET /api/auth/[...nextauth]` — NextAuth session/credentials.
- `POST /api/cron/[job]` — server-to-server, bearer-secret auth (not session-based), for an external scheduler.
- `GET /api/files/[id]` — serves an uploaded file's bytes after re-checking the same access rule as the record that references it (see File Management below). Never a public path.

## File Management (Phase 3E)

`src/lib/storage/provider.ts` defines a `FileStorageProvider` interface (`save`/`read`/`delete`), selected via `FILE_STORAGE_PROVIDER` (`local` default). Unlike the AI/WhatsApp/Payment console providers, `LocalFileStorageProvider` is a **real, working default** — it genuinely writes to local disk (a server-only `.uploads/` directory, never under `public/`), since local storage needs no paid API key to function. A future S3/Supabase Storage provider plugs in behind the same interface.

`UploadedFile` tracks metadata (filename, mimeType, sizeBytes, purpose, uploadedById) — never the file's actual storage path exposed to the client. Upload validation: max 10MB, allowlisted mime types (PDF, Word, PNG/JPEG/WEBP).

Wired into: Homework submission (student can paste a URL **or** upload a real file — both work, and a teacher grading the submission sees a link to either). Support ticket attachments intentionally stay pasted-URL-only for now — extending the shared `EntityDialog` component with a file-field type is a natural, separate follow-up once needed elsewhere, and was judged out of scope for this pass given the risk of touching a widely-shared component under time pressure.

## Multi-Academy / SaaS readiness (Phase 3E — schema-only)

`Organization`, `OrganizationSettings`, `OrganizationUser` exist as schema-only groundwork — zero rows, zero wiring into any existing query, same precedent as Phase 1's Phase-2/3 stub models. The spec's own instruction was "do not break the current single-academy implementation," so nothing existing was reshaped to add tenancy; these three models exist purely so a future multi-academy phase doesn't need a risky retrofit of live tables.
