---
phase: 10-automated-interview-pipeline
plan: 03
subsystem: api
tags: [readiness, sweep, admin, cron, recovery]
one_liner: "Trainer-auth'd POST /api/admin/readiness-sweep + runReadinessSweep helper that reprocesses pending/failed readiness recomputes, bounded + deduped per associate — closes Codex finding #5."
requires:
  - phase: 10-automated-interview-pipeline
    provides: "runReadinessPipeline(associateId, sessionId) with DB-backed status marker (Plan 10-01)"
  - phase: 08-schema-migration
    provides: "Session.readinessRecomputeStatus column + index"
provides:
  - "runReadinessSweep({ batchSize }) — pure logic, deduped per associate, bounded, resilient"
  - "POST /api/admin/readiness-sweep — trainer-auth'd, cron-ready endpoint returning SweepResult"
  - "Repair path for Codex finding #5 (silent readiness recompute failures now observable + rerunnable)"
affects:
  - "Sessions stuck in readinessRecomputeStatus in (pending, failed) can be swept to done via cron/manual trigger"
tech-stack:
  added: []
  patterns:
    - "Batch repair endpoint with per-item try/catch isolation"
    - "Dedup-by-associate: one pipeline run covers N outstanding session markers via updateMany sweep"
    - "Zod-coerced query params with hard bounds (1..200) for DoS protection (T-10-12)"
key-files:
  created:
    - "src/lib/readinessSweep.ts"
    - "src/lib/readinessSweep.test.ts"
    - "src/app/api/admin/readiness-sweep/route.ts"
    - "src/app/api/admin/readiness-sweep/route.test.ts"
  modified: []
key-decisions:
  - "Most-recent session (last in asc-by-createdAt list) used as the pipeline marker — pipeline transitions it done/failed and sweep closes remaining outstanding markers via updateMany"
  - "Per-associate try/catch wraps the full pipeline+updateMany block so a single bad actor cannot abort the batch"
  - "batchSize cap hardcoded to 200 in the route Zod schema (DoS ceiling) — the pure helper has no ceiling so callers can escalate deliberately if needed"
  - "updateMany only runs when sessionIds.length > 1 to avoid a redundant no-op write in the common 1-session case"
patterns-established:
  - "Admin repair endpoints live at /api/admin/* and MUST be trainer-auth'd via isAuthenticatedSession"
  - "Sweep/cron endpoints return a structured Result object (not a boolean) so operators can log associatesProcessed + failureCount for observability"
requirements-completed: [PIPE-02]
duration: ~18min
completed: 2026-04-14
---

# Phase 10 Plan 03: Readiness Sweep Repair Path Summary

**Trainer-auth'd POST /api/admin/readiness-sweep + runReadinessSweep helper that reprocesses pending/failed readiness recomputes, bounded + deduped per associate — closes Codex finding #5.**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-04-14T15:04Z
- **Completed:** 2026-04-14T15:08Z
- **Tasks:** 2 (both TDD)
- **Files created:** 4

## Accomplishments

- Codex finding #5 closed: readiness recompute now has a concrete, observable, rerunnable repair path. If a deploy/restart/DB hiccup drops a recompute mid-flight, an operator can POST the sweep endpoint and converge state to correctness.
- Sweep is deduped per associate (one pipeline run per associate regardless of outstanding marker count), bounded by `batchSize` (default 50, max 200), and resilient to per-associate pipeline failures.
- Endpoint is cron-callable — designed for external GCE cron / Cloud Scheduler / manual trainer button.

## Task Commits

1. **Task 1 RED: runReadinessSweep failing tests** — `2958a9c` (test)
2. **Task 1 GREEN: runReadinessSweep implementation** — `f6dcb3b` (feat)
3. **Task 2 RED: /api/admin/readiness-sweep failing tests** — `bf7191b` (test)
4. **Task 2 GREEN: /api/admin/readiness-sweep endpoint** — `c7eeaac` (feat)

## Files Created

- `src/lib/readinessSweep.ts` — pure sweep logic, queries sessions, groups by associate, calls `runReadinessPipeline` + `updateMany` per associate
- `src/lib/readinessSweep.test.ts` — 7 behavior tests (no-op, dedup, 2-associate, batchSize, per-associate failure isolation, updateMany sweep, idempotency)
- `src/app/api/admin/readiness-sweep/route.ts` — trainer-auth'd POST endpoint, Zod-validated batchSize
- `src/app/api/admin/readiness-sweep/route.test.ts` — 5 tests (401, 200 with result, batchSize forward, 400 invalid, 500 error-no-leak)

## Cron Integration

Endpoint is idempotent and safe to run on a schedule. Example:

```bash
# GCE cron or Cloud Scheduler — runs every 15 minutes
curl -X POST "https://your-nlm-host/api/admin/readiness-sweep?batchSize=50" \
  -H "Cookie: nlm_session=authenticated" \
  -H "Content-Type: application/json"
```

Response shape:

```json
{
  "associatesProcessed": 3,
  "sessionsExaminedCount": 7,
  "successCount": 3,
  "failureCount": 0
}
```

Operators should alert on sustained non-zero `failureCount` across consecutive runs (one failure is self-healing on retry; persistent failure indicates a deeper problem).

## Decisions Made

- **Most-recent session as marker:** `runReadinessPipeline` updates exactly one session's `readinessRecomputeStatus`. The sweep picks the most recent outstanding session per associate as the marker, then uses a single `updateMany` to close out any other outstanding markers for that associate (since one recompute run covers all of their state).
- **Per-associate try/catch:** Wraps the full pipeline + updateMany block. A thrown pipeline error for associate A does not stop the sweep from processing associate B. `failureCount` tracks these for observability.
- **batchSize cap at 200 (Zod):** Hard ceiling at the route boundary to satisfy T-10-12 (DoS). The underlying helper accepts any batchSize for internal/direct callers.
- **updateMany skipped for single-session case:** Avoids a redundant no-op write when the associate only had one outstanding marker (which the pipeline already transitioned).

## Deviations from Plan

None — plan executed exactly as written. Interface signature used `sessionsExaminedCount` (matching the plan's interfaces block); the `<behavior>` block mentioned `sessionsExamined` as a shorthand but the artifact interface was authoritative.

## Issues Encountered

None.

## Verification

- `npm run test -- src/lib/readinessSweep.test.ts` — 7/7 pass
- `npm run test -- src/app/api/admin/readiness-sweep/route.test.ts` — 5/5 pass
- `npm run test` — 157/161 pass (+12 from this plan; 4 skipped were pre-existing)
- `npm run lint src/lib/readinessSweep.ts src/app/api/admin/readiness-sweep/route.ts` — clean (pre-existing repo-wide lint errors unrelated to this plan, logged as deferred)
- `npx tsc --noEmit` — clean

## Next Phase Readiness

- Phase 10 complete (PIPE-01 closed in 10-01, PIPE-02 closed in 10-03).
- Ready to advance to Phase 11 (Cohort Management) or run `/gsd-verify-work` on the full phase.
- Operational follow-up (not blocking): wire the sweep endpoint into GCE cron on deploy — document in deploy runbook.

## Self-Check: PASSED

- src/lib/readinessSweep.ts — FOUND
- src/lib/readinessSweep.test.ts — FOUND
- src/app/api/admin/readiness-sweep/route.ts — FOUND
- src/app/api/admin/readiness-sweep/route.test.ts — FOUND
- commits 2958a9c, f6dcb3b, bf7191b, c7eeaac — all present in git log

---
*Phase: 10-automated-interview-pipeline*
*Completed: 2026-04-14*
