---
phase: 50-judge0-integration-points-flag-audit
plan: 01
subsystem: feature-flags
tags: [feature-flag, judge0, v1.5, coding-challenges, tdd]
requires: []
provides:
  - isCodingEnabled()
  - CodingFeatureDisabledError
  - CODING_COMING_SOON_MESSAGE
affects:
  - src/lib/codingFeatureFlag.ts
  - src/lib/judge0Errors.ts
tech-stack:
  added: []
  patterns:
    - "Strict === 'true' env-flag check (no truthy coercion)"
    - "Error class re-export pattern to keep import path stable"
key-files:
  created:
    - src/lib/codingFeatureFlag.ts
    - src/lib/__tests__/codingFeatureFlag.test.ts
    - scripts/populate-coding-flag-secrets.sh
    - docs/runbooks/phase-50-flag-population.md
  modified:
    - src/lib/judge0Errors.ts
decisions:
  - "D-02 strict case-sensitive match ('TRUE' rejected) locked in test matrix"
  - "Operator script idempotent (gcloud auto-increments secret versions)"
  - "Placeholder values written to both projects so Cloud Run boot doesn't 500"
metrics:
  duration: ~12min
  completed: 2026-04-18
  tasks: 2
  files-created: 4
  files-modified: 1
---

# Phase 50 Plan 01: Flag Helper + Error Class + Secret Runbook Summary

**One-liner:** Added `isCodingEnabled()` flag helper with strict `=== 'true'` match, new `CodingFeatureDisabledError` class, and operator runbook for populating `CODING_CHALLENGES_ENABLED` + `JUDGE0_*` placeholder values in Secret Manager.

## What Was Built

### Task 1: `src/lib/codingFeatureFlag.ts` + `CodingFeatureDisabledError`

- Added `isCodingEnabled(): boolean` — strict `process.env.CODING_CHALLENGES_ENABLED === 'true'` check. Lazy read at call time so `vi.stubEnv` works.
- Added `CODING_COMING_SOON_MESSAGE = 'Coding challenges coming soon. Check back later!'` — the single source of truth for the user-facing copy used by Plans 02 + 03.
- Added `CodingFeatureDisabledError` class to `src/lib/judge0Errors.ts`; re-exported from `codingFeatureFlag.ts` for stable import path.
- 7 unit tests in `src/lib/__tests__/codingFeatureFlag.test.ts` cover: `true`, `false`, empty/undefined, uppercase `TRUE`, various truthy-looking strings (`1`, `yes`, `on`, `enabled`), message constant exact-match, error class instance check.

Commit: `71b73ab` — `feat(50-01): add isCodingEnabled flag helper + CodingFeatureDisabledError`

### Task 2: gcloud secret population script + runbook

- `scripts/populate-coding-flag-secrets.sh` — idempotent bash runbook writing `CODING_CHALLENGES_ENABLED=false` to `nlm-prod`, `=true` to `nlm-staging-493715`, and `JUDGE0_URL=http://placeholder.invalid` + `JUDGE0_AUTH_TOKEN=placeholder-will-be-set-in-v1.6` to both.
- `docs/runbooks/phase-50-flag-population.md` — operator runbook: when to run, IAM pre-reqs, exact commands, verification queries (all 3 secrets × 2 projects), troubleshooting, and v1.6 rotation steps.
- Script is chmod +x, passes `bash -n`. NOT executed by this commit — operator runs it manually after Phase 45 Plan 03 ships.

Commit: `eef7927` — `chore(50-01): add gcloud secret population script + operator runbook`

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- `src/lib/codingFeatureFlag.ts` FOUND
- `src/lib/judge0Errors.ts` contains `CodingFeatureDisabledError` FOUND
- `scripts/populate-coding-flag-secrets.sh` FOUND (executable)
- `docs/runbooks/phase-50-flag-population.md` FOUND
- Commits `71b73ab` + `eef7927` FOUND in git log
- 7/7 tests pass
- `npx tsc --noEmit` exits 0
