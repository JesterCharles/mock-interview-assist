# Phase 10: Automated Interview Pipeline - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning
**Depends on:** Phase 9 (Associate PIN Auth)
**Patched:** 2026-04-14 (Codex findings #3 split endpoints, #5 readiness repair, #6 Postgres canonical)

<domain>
## Phase Boundary

Wire automated-interview completion into the gap/readiness pipeline that trainer-led sessions already use (`/api/history`). **Per Codex finding #3, endpoints are split:**

- **Anonymous** automated sessions continue completing via `/api/public/interview/complete`. The route MUST unconditionally strip/null `associateSlug` from the client payload before calling `persistSessionToDb()` — preventing forged linkage to real associates. No readiness fan-out for anonymous.
- **Authenticated** associate automated sessions (launched from `/associate/[slug]/interview` — Phase 9 D-26) complete via a NEW `/api/associate/interview/complete` endpoint that requires a valid `associate_session` cookie and derives identity EXCLUSIVELY from `getAssociateSession()` (version-checked via Plan 09-02). Client payload identity is ignored. Success triggers `saveGapScores → updateAssociateReadiness` fan-out.

**Per Codex finding #5, readiness recompute has a DB-backed repair path:**

- `Session.readinessRecomputeStatus` column (enum-ish string: `pending` / `done` / `failed`) added in Phase 8 schema.
- The completion pipeline sets it to `pending` on write, then `done` after successful recompute, or `failed` if the helper throws.
- A new sweep endpoint `/api/admin/readiness-sweep` (trainer-auth) re-processes `pending`/`failed` rows. Cron-ready.

**Per Codex finding #6, Postgres is now canonical for v1.1:**

- File storage is demoted to "transitional export/backup" for trainer-led sessions only. No NEW code path in v1.1 writes to file-history.
- Automated sessions (both anonymous and authenticated) remain DB-only as before.
- `/api/sync-check` remains as an export-parity advisory; it is no longer a safety-critical gate.

Out of scope: UI changes (Phase 9 covers), PIN entry flow, cohort linkage (Phase 11), curriculum filtering (Phase 13), design pass (Phase 14), deleting the file-history write path (deferred).

</domain>

<decisions>
## Implementation Decisions

### Identity Resolution (REVISED per Codex finding #3)
- **D-01 (REVISED):** Two endpoints, two identity policies:
  - `/api/public/interview/complete` (anonymous only): NEVER trust client `associateSlug`. Unconditionally strip/null it BEFORE `persistSessionToDb()` so no anonymous caller can forge linkage to a real associate.
  - `/api/associate/interview/complete` (authenticated only): identity derived EXCLUSIVELY from `getAssociateSession()` (cookie, version-checked per Phase 9 Plan 09-02). Client `associateSlug` is ignored; server-resolved slug is injected.
- **D-02:** Helper `getAssociateSession()` lives in `src/lib/auth-server.ts` (Phase 9 Plan 09-02). Returns `{ associateId, slug } | null`. Phase 10 consumes; Phase 9 implements.
- **D-03:** If the authenticated endpoint receives no cookie or a stale/invalid cookie → return 401. Do NOT silently fall through to anonymous behavior. Anonymous callers use the anonymous endpoint.

### Anonymous Path Hardening (REVISED per Codex finding #3)
- **D-04 (REVISED):** `/api/public/interview/complete` preserves its 200 response contract for anonymous callers, but the route handler MUST strip `associateSlug` (and any other identity fields) from the inbound session before calling `persistSessionToDb()`. Persisted anonymous Session rows always have `associateId = null`. No fan-out.
- **D-05:** `Session.mode` set to `"automated"` for all automated completions (both endpoints). Enables downstream analytics to distinguish automated vs trainer-led.

### Pipeline Fan-Out (REVISED per Codex finding #5)
- **D-06:** Fan-out order: `persistSessionToDb` → mark `Session.readinessRecomputeStatus = 'pending'` → (async) `saveGapScores(associateId)` → `updateAssociateReadiness(associateId, threshold)` → mark `done`. On any pipeline error: mark `failed` and log.
- **D-07:** Fire-and-forget from the HTTP response's perspective — never block 200. But the DB-backed status column means a failed fan-out is REPAIRABLE via sweep, unlike the v1.0 "log and continue" model.
- **D-08:** Threshold fetched via `getSettings()` with fallback to 75 on failure.

### Readiness Repair / Sweep (NEW per Codex finding #5)
- **D-16:** New endpoint `POST /api/admin/readiness-sweep` (trainer-auth-only). Queries `Session` where `readinessRecomputeStatus IN ('pending','failed') AND associateId IS NOT NULL`, groups by `associateId`, re-runs `runReadinessPipeline(associateId)` for each distinct associate, updates status rows on success.
- **D-17:** Sweep is idempotent — running twice is safe. It processes a bounded batch per call (e.g. 50 associates) to avoid long requests; cron/schedule can call it every N minutes. For v1.1 we don't wire a scheduler — trainer triggers manually from a dashboard button OR an external cron hits the endpoint.
- **D-18:** Schema addition: `Session.readinessRecomputeStatus String @default("not_applicable")`. Values: `not_applicable` (trainer-led OR anonymous — no recompute expected), `pending` (queued), `done`, `failed`. This column is ADDED in Phase 8 (see Phase 8 patch).

### Error Handling
- **D-09:** Session persistence failure (`persistSessionToDb` returns false) → return 500. Do not attempt fan-out.
- **D-10:** Gap/readiness failures inside fan-out → mark `Session.readinessRecomputeStatus = 'failed'`, log via `console.error('[readiness-pipeline] failed:', err)`, never surfaced to client.
- **D-11:** Cookie read errors on anonymous endpoint are moot (no cookie expected). On authenticated endpoint, any cookie failure returns 401.

### Data Linkage
- **D-12:** On the authenticated endpoint: inject `session.associateSlug = assocSession.slug` (override ANY client-supplied value). Reuses the existing upsert-by-slug path in `sessionPersistence.ts`. `persistSessionToDb` contract unchanged.
- **D-13:** Alternative (extending `persistSessionToDb` with an `associateId` override) remains rejected — slug injection is less invasive.

### Verification / Sync-Check (REVISED per Codex finding #6)
- **D-14:** Postgres is canonical for v1.1. `/api/sync-check` is demoted from a safety gate to an advisory export-parity check for trainer-led sessions. Automated sessions (DB-only) are excluded from divergence by construction.
- **D-15:** Every authenticated automated session appears in DB with non-null `associateId` AND a `readinessRecomputeStatus` that eventually reaches `done` (or `failed` that the sweep can retry). Integration tests verify.

### Claude's Discretion
- Exact test harness choice (Vitest with mocked Prisma vs integration with test DB).
- Whether to extract a shared `runReadinessPipeline(associateId, sessionId)` helper to DRY up `/api/history` + `/api/associate/interview/complete` (RECOMMENDED — the helper is responsible for updating `readinessRecomputeStatus`).
- Sweep batch size and cron frequency — document but don't wire.

</decisions>

<specifics>
## Specific Ideas

- Mirror the fire-and-forget block from `src/app/api/history/route.ts` lines 53-70, but wrap it in the new helper that also updates `Session.readinessRecomputeStatus`.
- Extract `runReadinessPipeline(associateId: number, sessionId?: number)` into `src/lib/readinessPipeline.ts`. Updating `readinessRecomputeStatus` only makes sense when `sessionId` is provided.
- Cookie name per Phase 9: `associate_session` (HttpOnly, SameSite=Strict, 24hr, version-checked).
- Authenticated endpoint is POST-only, JSON body — no public surface concern beyond the cookie check.

</specifics>

<canonical_refs>
## Canonical References

### Requirements & Roadmap
- `.planning/ROADMAP.md` §"Phase 10: Automated Interview Pipeline" — success criteria
- `.planning/REQUIREMENTS.md` §Pipeline Integration — PIPE-01, PIPE-02

### Research
- `.planning/research/ARCHITECTURE.md` §public interview / pipeline
- `.planning/PIPELINE-PLAN-CODEX.md` §Findings 3, 5, 6

### Existing Code Anchors
- `src/app/api/public/interview/complete/route.ts` — anonymous endpoint (hardened in this phase)
- `src/app/api/public/interview/start/route.ts`, `agent/route.ts` — sibling routes, no changes
- `src/app/api/history/route.ts` — reference implementation for fan-out pattern; migrate to helper
- `src/lib/sessionPersistence.ts` — `persistSessionToDb()` (reused, not modified)
- `src/lib/gapPersistence.ts` — `saveGapScores()`
- `src/lib/readinessService.ts` — `updateAssociateReadiness()`
- `src/lib/settingsService.ts` — `getSettings()` for threshold
- `src/lib/auth-server.ts` — extended by Phase 9 with `getAssociateSession()` (version-checked)

### Phase Dependencies
- Phase 9 must land first — this phase consumes `getAssociateSession()` (version-checked) and the `associate_session` cookie contract, AND expects the `/associate/[slug]/interview` route to exist as the legitimate authenticated caller.
- Phase 8 provides `Session.mode` column AND the new `Session.readinessRecomputeStatus` column (added per this patch — see Phase 8).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `persistSessionToDb()` — handles slug→Associate upsert→associateId linkage. No modification needed.
- `getSettings()` with fallback pattern — reuse verbatim.

### Established Patterns
- Rate-limit check first, then shape validation, then persistence.
- Error responses use `NextResponse.json({ error }, { status })`.
- Log prefix convention: `[public-interview-complete]`, `[associate-interview-complete]`, `[readiness-pipeline]`, `[readiness-sweep]`.

### Integration Points
- `/api/sync-check` — automated sessions are DB-only; no divergence expected.
- Postgres canonical (Codex #6) — no new file-history write paths in v1.1.

</code_context>

<deferred>
## Deferred Ideas

- Cohort linkage on automated sessions (`Session.cohortId` population from Associate.cohortId) — Phase 11.
- Curriculum-scoped gap filtering — Phase 13 / v1.2.
- Notification on readiness change post-automated-session — v1.2 (NOTIF-01).
- Cron/scheduler wiring for the readiness sweep — out of scope; trainer can trigger manually or call the endpoint from external cron.
- Deleting the file-history write path entirely — later milestone; v1.1 keeps it as export-only (Codex #6).
- Strengthening `/api/sync-check` beyond "count + last 5" — later milestone; no longer safety-critical in v1.1.

</deferred>

---

*Phase: 10-automated-interview-pipeline*
*Context gathered: 2026-04-14*
*Patched 2026-04-14 for Codex findings #3, #5, #6*
