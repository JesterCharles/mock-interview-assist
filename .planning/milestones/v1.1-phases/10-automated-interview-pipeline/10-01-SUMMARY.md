---
phase: 10-automated-interview-pipeline
plan: 01
subsystem: automated-interview-pipeline
tags: [security, pipeline, readiness, cookie-auth]
one_liner: "Split automated-interview completion into anonymous (hardened, identity-stripped) and authenticated (cookie-derived identity + readiness fan-out with DB repair marker) endpoints per Codex findings #3 and #5."
requires:
  - "Phase 9: getAssociateSession (cookie-only, version-checked)"
  - "Phase 8: Session.readinessRecomputeStatus column"
  - "persistSessionToDb, saveGapScores, updateAssociateReadiness, getSettings"
provides:
  - "runReadinessPipeline(associateId, sessionId?) — shared fan-out helper with DB-backed status marker"
  - "/api/associate/interview/complete — authenticated automated-interview endpoint"
  - "Hardened /api/public/interview/complete — unconditional slug strip"
affects:
  - "Session.readinessRecomputeStatus transitions (pending → done/failed)"
  - "Associate.readinessStatus, recommendedArea, lastComputedAt (via pipeline)"
tech-stack:
  added: []
  patterns:
    - "Cookie-only identity injection at route boundary (no client trust)"
    - "Fire-and-forget pipeline with DB-backed repair marker (no silent failures)"
    - "Route separation: anonymous vs authenticated endpoints (no dual-mode routes)"
key-files:
  created:
    - "src/lib/readinessPipeline.ts"
    - "src/lib/readinessPipeline.test.ts"
    - "src/app/api/associate/interview/complete/route.ts"
    - "src/app/api/associate/interview/complete/route.test.ts"
    - "src/app/api/public/interview/complete/route.test.ts"
  modified:
    - "src/app/api/public/interview/complete/route.ts"
decisions:
  - "Session.id is a client-supplied cuid string (not auto-increment int) — runReadinessPipeline takes sessionId as string; no DB requery needed after persist"
  - "persistSessionToDb external contract preserved (still returns boolean) — no ripple changes to callers"
  - "Anonymous route ignores cookies entirely; authenticated callers MUST use sibling /api/associate/interview/complete endpoint"
  - "Rate limit check runs BEFORE auth check on associate endpoint so abusive authenticated callers still 429 cleanly"
  - "Marker update errors swallowed (logged only) — sweep endpoint (Plan 10-03) will still find stuck sessions"
metrics:
  duration: "~25 min"
  completed: "2026-04-14"
  tasks: 3
  tests_added: 24
  tests_passing: "145/145"
---

# Phase 10 Plan 01: Hardened Automated-Interview Pipeline Summary

Closed the loop between authenticated automated interviews and the readiness engine without leaving an identity-spoofing hole on the anonymous endpoint and without silent-failure modes for readiness recompute.

## What Changed

### 1. `src/lib/readinessPipeline.ts` — Shared fan-out helper

New module exporting `runReadinessPipeline(associateId: number, sessionId?: string): Promise<void>`.

- With `sessionId`: transitions `Session.readinessRecomputeStatus` `pending → done` on success, `pending → failed` on error. Sweep endpoint (Plan 10-03) will repair any stuck-in-`pending` or `failed` rows.
- Without `sessionId`: legacy trainer-led path — never touches the marker column.
- Reads threshold from `getSettings()`; falls back to 75 if that throws.
- Never re-throws — designed for fire-and-forget callers.
- Marker update failures are swallowed (logged only) so DB hiccups on the marker never crash the helper.

### 2. `src/app/api/public/interview/complete/route.ts` — Hardened (Codex #3 / T-10-01)

- Unconditionally nulls `associateSlug` before calling `persistSessionToDb`. No client path can forge linkage to a real associate.
- Route ignores cookies entirely — authenticated callers belong on the sibling endpoint.
- Now returns 500 when `persistSessionToDb` returns false (previously returned 200 with `persisted: 'none'`).
- Regression-tested: payload `associateSlug:"victim"` produces a Session with `associateId=null`.

### 3. `src/app/api/associate/interview/complete/route.ts` — NEW authenticated endpoint (T-10-02)

- Identity derived EXCLUSIVELY from `getAssociateSession()` (Phase 9, cookie + HMAC + version-check).
- Missing/stale cookie returns 401 — no silent fallthrough to anonymous.
- Client-supplied `associateSlug` is overridden by cookie slug before persist (spoofing impossible).
- Stamps `mode='automated'` server-side.
- After successful persist, fires `runReadinessPipeline(assocSession.associateId, session.id)` without awaiting.
- Rate limit applied same as anonymous endpoint.

## Test Coverage

- `readinessPipeline.test.ts` — 8 cases (call order, threshold fallback, pending/done/failed transitions, marker-error resilience, no-sessionId legacy path)
- `public/interview/complete/route.test.ts` — 7 cases (strip with/without cookie, rate-limit 429, size 413, shape 400, persist-false 500)
- `associate/interview/complete/route.test.ts` — 9 cases (401 no/stale cookie, slug override, persist-false 500, shape 400, size 413, rate-limit 429, mode='automated')

Total 24 new tests. Full suite: 145/145 passing.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `runReadinessPipeline` sessionId type mismatch**
- **Found during:** Task 2 typecheck
- **Issue:** Plan specified `sessionId?: number`, but `Session.id` is `String @id` in `prisma/schema.prisma` (client-supplied cuid). Passing a number would cause a Prisma type error at runtime and blocked `tsc --noEmit`.
- **Fix:** Changed helper signature to `sessionId?: string`, updated tests to use string IDs.
- **Files modified:** `src/lib/readinessPipeline.ts`, `src/lib/readinessPipeline.test.ts`
- **Commit:** 93dffb6 (bundled with Task 2)

**2. [Rule 2 - Missing critical] 500 return on persist failure (public route)**
- **Found during:** Task 2 test authoring
- **Issue:** Original anonymous route returned 200 with `persisted: 'none'` even when the DB write failed — silent failure from caller's perspective. Plan Task 2 Test 7 required 500.
- **Fix:** Added explicit 500 branch when `persistSessionToDb` returns false.
- **Files modified:** `src/app/api/public/interview/complete/route.ts`
- **Commit:** 93dffb6

No architectural changes or authentication gates encountered.

## Commits

| Hash    | Task | Message |
|---------|------|---------|
| 4ff01a5 | 1    | feat(10-01): add runReadinessPipeline helper with DB-backed status marker |
| 93dffb6 | 2    | feat(10-01): harden /api/public/interview/complete — strip client identity unconditionally |
| 302b001 | 3    | feat(10-01): add /api/associate/interview/complete authenticated endpoint |

## Success Criteria (Plan)

- [x] PIPE-01 satisfied: authenticated automated sessions link to associateId via cookie (slug never accepted from client)
- [x] PIPE-02 satisfied: gap scores + readiness recomputed after authenticated automated session, with DB-backed `readinessRecomputeStatus` marker
- [x] Anonymous path cannot forge associate linkage (Codex #3 closed)
- [x] Failed recompute is repairable, not lost (Codex #5 closed — sweep endpoint in Plan 10-03 will consume the marker)
- [x] `persistSessionToDb` external contract preserved

## Threat Mitigations Applied

| Threat | Mitigation | Evidence |
|--------|------------|----------|
| T-10-01 Spoofing via public/complete | Unconditional `associateSlug = null` before persist | public/complete Test 2 |
| T-10-02 Spoofing via associate/complete | Cookie slug overrides client input | associate/complete Test 4 |
| T-10-09 Stale cookie at authenticated endpoint | `getAssociateSession` returns null → 401 | associate/complete Test 2 |
| T-10-10 Silent readiness recompute failure | `readinessRecomputeStatus='failed'` DB marker + sweep hook | readinessPipeline Tests 5–6 |
| T-10-03 Pipeline error disclosure | Errors logged server-side only, never returned | readinessPipeline Tests 5–6 |
| T-10-04 Unbounded pipeline work | Fire-and-forget + rate limit caps invocations | associate/complete Test 8 |

## Known Stubs

None. All persistence, identity, and fan-out paths are fully wired. The `readinessRecomputeStatus` marker is consumed by the sweep endpoint in Plan 10-03 (tracked in plan dependency graph).

## Self-Check: PASSED

- FOUND: src/lib/readinessPipeline.ts
- FOUND: src/lib/readinessPipeline.test.ts
- FOUND: src/app/api/public/interview/complete/route.ts
- FOUND: src/app/api/public/interview/complete/route.test.ts
- FOUND: src/app/api/associate/interview/complete/route.ts
- FOUND: src/app/api/associate/interview/complete/route.test.ts
- FOUND commit: 4ff01a5
- FOUND commit: 93dffb6
- FOUND commit: 302b001
- Full test suite: 145/145 passing
- `npx tsc --noEmit`: clean (project errors filtered — see below)
- `npm run lint`: zero issues in new files (project has pre-existing unrelated lint debt out of scope per execution rules)
