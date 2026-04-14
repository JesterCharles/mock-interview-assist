# Phase 10: Automated Interview Pipeline - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning
**Depends on:** Phase 9 (Associate PIN Auth)

<domain>
## Phase Boundary

Wire `/api/public/interview/complete` into the gap/readiness pipeline that trainer-led sessions already use (`/api/history`). Authenticated automated sessions (via Phase 9 associate_session cookie) persist with a non-null `associateId` and trigger `saveGapScores → updateAssociateReadiness` fan-out. Anonymous (non-PIN) automated sessions continue working unchanged for backward compat.

Out of scope: UI changes, PIN entry flow (Phase 9), cohort linkage (Phase 11), curriculum filtering (Phase 13), design pass (Phase 14).

</domain>

<decisions>
## Implementation Decisions

### Identity Resolution
- **D-01:** Identity is derived server-side from the `associate_session` HttpOnly cookie (set by Phase 9), NOT from client-supplied `session.associateSlug`. Client payload `associateSlug` is ignored in the public complete route when a valid associate session exists — prevents identity spoofing.
- **D-02:** Helper `getAssociateSession()` lives in `src/lib/auth-server.ts` (extended from Phase 9). Returns `{ associateId, slug } | null`. Phase 10 consumes; Phase 9 implements.
- **D-03:** If cookie is present but invalid/expired, treat as anonymous (do not 401) — preserves Success Criterion 4 (anonymous path works).

### Anonymous Path Preservation
- **D-04:** When no associate session cookie present, existing behavior is preserved exactly: rate-limit check, shape validation, `persistSessionToDb(session)` with `associateId: null`. No gap/readiness fan-out.
- **D-05:** `Session.mode` set to `"automated"` for all public-interview-complete writes (regardless of auth state). Enables downstream analytics to distinguish automated vs trainer-led.

### Pipeline Fan-Out
- **D-06:** Fan-out order matches `/api/history` exactly: `persistSessionToDb` → (if associateId) → `saveGapScores(associateId)` → `updateAssociateReadiness(associateId, threshold)`. Sequential per Pitfall 3 (readiness depends on gap scores being current).
- **D-07:** Fire-and-forget pattern (same as `/api/history` line 53-70) — never block the HTTP response on gap/readiness work. Errors logged, not returned.
- **D-08:** Threshold fetched via `getSettings()` with fallback to 75 on failure (matches existing pattern).

### Error Handling
- **D-09:** Session persistence failure (`persistSessionToDb` returns false) → return 500 with `{ error }`. Do not attempt fan-out.
- **D-10:** Gap/readiness failures inside fan-out → logged via `console.error('[public-interview-complete] pipeline failed:', err)`, never surfaced to client. Session row already persisted.
- **D-11:** Cookie read errors → treat as anonymous (D-03), log at debug level.

### Data Linkage
- **D-12:** When authenticated, `persistSessionToDb` must receive a session with `associateSlug` injected from the cookie's resolved slug (override any client-supplied value). This reuses the existing upsert-by-slug path in `sessionPersistence.ts` without modifying that helper.
- **D-13:** Alternative considered: extend `persistSessionToDb` to accept an `associateId` override. Rejected — slug injection is less invasive and preserves the existing contract.

### Verification / Sync-Check Parity
- **D-14:** `/api/sync-check` contract holds: every authenticated automated session appears in DB with non-null `associateId`. Verification plan explicitly hits sync-check post-completion.
- **D-15:** Anonymous automated sessions have `associateId = null` and are treated as ephemeral by sync-check (not counted as divergence — matches v1.0 anonymous behavior).

### Claude's Discretion
- Exact test harness choice (Vitest with mocked Prisma vs integration with test DB) — planner decides per existing test patterns.
- Whether to extract a shared `runReadinessPipeline(associateId)` helper to DRY up `/api/history` + `/api/public/interview/complete` — recommended but optional.

</decisions>

<specifics>
## Specific Ideas

- Mirror the fire-and-forget block from `src/app/api/history/route.ts` lines 53-70 — same shape, same error handling.
- Consider extracting `runReadinessPipeline(associateId: number)` into `src/lib/readinessPipeline.ts` to eliminate duplication across the two routes.
- Cookie name per Phase 9: `associate_session` (HttpOnly, SameSite=Lax, 24hr expiry expected).

</specifics>

<canonical_refs>
## Canonical References

### Requirements & Roadmap
- `.planning/ROADMAP.md` §"Phase 10: Automated Interview Pipeline" — success criteria
- `.planning/REQUIREMENTS.md` §Pipeline Integration — PIPE-01, PIPE-02

### Research
- `.planning/research/ARCHITECTURE.md` §public interview / pipeline

### Existing Code Anchors
- `src/app/api/public/interview/complete/route.ts` — route to modify
- `src/app/api/public/interview/start/route.ts`, `agent/route.ts` — sibling routes, no changes
- `src/app/api/history/route.ts` — reference implementation for fan-out pattern
- `src/lib/sessionPersistence.ts` — `persistSessionToDb()` (reused, not modified)
- `src/lib/gapPersistence.ts` — `saveGapScores()`
- `src/lib/readinessService.ts` — `updateAssociateReadiness()`
- `src/lib/settingsService.ts` — `getSettings()` for threshold
- `src/lib/auth-server.ts` — extended by Phase 9 with `getAssociateSession()`

### Phase Dependencies
- Phase 9 must land first — this phase consumes `getAssociateSession()` and the `associate_session` cookie contract.
- Phase 8 provides `Session.mode` column.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `persistSessionToDb()` — already handles associateSlug → Associate upsert → associateId linkage. No modification needed.
- Fire-and-forget fan-out pattern (`/api/history` L53-70) — copy-paste structure with associateId resolved from cookie instead of slug lookup.
- `getSettings()` with fallback pattern — reuse verbatim.

### Established Patterns
- Rate-limit check first, then shape validation, then persistence (current `complete/route.ts` order).
- Error responses use `NextResponse.json({ error }, { status })`.
- Log prefix convention: `[public-interview-complete]`.

### Integration Points
- `/api/sync-check` — verifies file↔DB parity. Phase 10 work must not introduce divergence for trainer-led sessions; automated sessions are DB-only (already the case).
- No file-history write for public sessions (per existing comment L48-49). Preserve this.

</code_context>

<deferred>
## Deferred Ideas

- Cohort linkage on automated sessions (`Session.cohortId` population from Associate.cohortId) — Phase 11.
- Curriculum-scoped gap filtering — Phase 13 / v1.2.
- Notification on readiness change post-automated-session — v1.2 (NOTIF-01).
- Shared pipeline helper refactor — optional, planner's call.

</deferred>

---

*Phase: 10-automated-interview-pipeline*
*Context gathered: 2026-04-14*
