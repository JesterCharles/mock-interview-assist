---
phase: 44-hardening-load-test
fixed_at: 2026-04-18T07:36:00Z
review_path: .planning/phases/44-hardening-load-test/44-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 44 Code Review Fix Report

**Fixed at:** 2026-04-18
**Source review:** `.planning/phases/44-hardening-load-test/44-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 6
- Fixed: 6
- Skipped: 0

Tests: `npm run test` green at **963 passed / 4 skipped (967)**, up from the 949 baseline (14 `validateChallengeCli` + `hardeningFixtures` tests now pass because CR-01 restored `tsx`).

## Fixed Issues

### CR-01: `p-limit` and `tsx` missing from package.json

**Files modified:** `package.json`, `package-lock.json`
**Commit:** `376fec1`
**Applied fix:** `npm i -D p-limit tsx`. Verified all 3 npm scripts load (`npm run validate-challenge` prints usage; load/abuse scripts fail on missing env, proving modules resolve).

### WR-01: docker stats sampler leaks children on slow SSH

**Files modified:** `scripts/abuse-test-coding.ts`
**Commit:** `96710e8`
**Applied fix:** Added `inflight` Set tracking per-child ssh spawns, `AbortController` with 10s per-child timeout, and `stop()` that sends `SIGTERM` to all outstanding, awaits drain vs 2s grace, then `SIGKILL` stragglers.

### WR-02: load-test aborts on single transient poll error

**Files modified:** `scripts/load-test-coding.ts`
**Commit:** `9c2f6c8`
**Applied fix:** Non-OK poll / network error now retries up to 3 consecutive failures with 1s backoff, each logged to stderr (`[load-test] poll retry N/3`). Counter resets on any successful poll. Timeout message surfaces `lastPollError` for diagnostics.

### IN-01: SECURITY-AUDIT.md STRIDE matrix omits Repudiation

**Files modified:** `.planning/phases/44-hardening-load-test/SECURITY-AUDIT.md`
**Commit:** `6a9acbf`
**Applied fix:** Added `Attempt provenance — Repudiation` matrix row and finding **F-11** citing `Session.associateId` + `CodingAttempt` timestamps + `AuthEvent` as mitigations.

### IN-02: `JUDGE0_METRICS_CMD` passes operator input through `sh -c`

**Files modified:** `.planning/phases/44-hardening-load-test/SECURITY-AUDIT.md`
**Commit:** `6a9acbf`
**Applied fix:** Added finding **F-10** documenting the shell-interpolation surface, labelled operator-trust-boundary (INFO), with mitigation "never interpolate user input" and future cleanup path (parsed arg vector). INFO count bumped 11 → 13.

### IN-03: trainer-authoring memory cap stated as 250 MB

**Files modified:** `docs/trainer-authoring.md`
**Commit:** `ae86541`
**Applied fix:** Changed "Phase 38 caps at 250 MB" → "Phase 38 caps at 256000 KB (~244 MB) — see `docker-compose.yml` `max_memory_limit`".

---

_Fixed: 2026-04-18_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
