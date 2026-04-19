---
phase: 49-k6-load-test-hardening
plan: 03
subsystem: security-abuse-test
tags: [security, abuse-test, HARD-02]
requires: []
provides:
  - scripts/lib/route-discovery.ts
  - scripts/abuse-test-all.ts
  - npm run abuse-test:all
  - .planning/SECURITY-v1.5-abuse-test.json (placeholder shell — awaits live run)
affects:
  - None (standalone probe)
tech-stack:
  added: []
  patterns: [injected-fetch-for-testability, hard-coded-public-allowlist, regex-denylist-PII-scan]
key-files:
  created:
    - scripts/lib/route-discovery.ts
    - scripts/abuse-test-all.ts
    - scripts/__tests__/route-discovery.test.ts
    - scripts/__tests__/abuse-test-all.test.ts
    - .planning/SECURITY-v1.5-abuse-test.json (placeholder)
  modified:
    - package.json (abuse-test:all script registered in Plan 01 commit)
decisions:
  - PUBLIC_ALLOWLIST is hard-coded (kept in sync with middleware.ts) — 14 entries
  - 5 attempt modes exactly as D-09; modes applicable to mutating verbs gated via applicableModes()
  - Staging-only guard throws before any network call (T-49-07)
  - Placeholder JSON artifact committed so Plan 04 has input schema; real run overwrites on resume
metrics:
  duration: ~18min
  completed: 2026-04-18
---

# Phase 49 Plan 03: abuse-test-all.ts Summary

Authored the general-purpose abuse test suite covering every `/api/*` route × 5 attempt modes. Error-body denylist catches internal path leaks, stack traces, emails, phones, and UUIDs. Live run deferred to UNATTENDED halt (staging not deployed).

## Route count + total attempts

- **Routes discovered by `discoverApiRoutes()`:** 54 (matches `find src/app/api -name route.ts | wc -l`).
- **Attempts per route:** 5 modes for GET-only routes; 7 modes for routes with POST/PUT/PATCH (2 additional unauth-post-* modes).
- **Expected attempt count on live run:** ~300-350 (depends on exact method mix per route).

## Pass / fail breakdown per attempt-mode

PENDING — live run deferred. The placeholder artifact at `.planning/SECURITY-v1.5-abuse-test.json` has `status: "not-yet-run"` and will be overwritten when a human runs:

```bash
ABUSE_TEST_BASE_URL=https://staging.nextlevelmock.com npm run abuse-test:all
```

## Unit test coverage

| Suite | Tests | Status |
|-------|------:|--------|
| route-discovery  | 5  | PASS |
| abuse-test-all   | 5  | PASS |
| **Total**        | **10** | **PASS** |

Test scenarios exercised:
- **route-discovery:** count parity with `find`, public/protected tagging of known routes, nested-dynamic-segment preservation, synthetic fixture round-trip.
- **abuse-test-all:** protected-401 → pass; protected-200 → fail (unauth-200-on-protected); 500-with-stacktrace → denylist-hit; public-200-clean → pass; public-200-with-email → denylist-hit.

## Findings carried to Plan 04

None yet (live run pending). Plan 04's STRIDE register leaves T-49-APP-02, T-49-APP-03, T-49-APP-06 in PENDING state until the real artifact lands.

## Deviations from Plan

- **[UNATTENDED halt]** Live staging run (Task 2 step 4) deferred — staging not yet deployed. Placeholder JSON committed so Plan 04 has a parseable input schema; real run overwrites on resume.
- **[Rule 2 - Completeness]** Expanded `PUBLIC_ALLOWLIST` in `route-discovery.ts` by 2 entries (`/api/github`, `/api/load-markdown`) beyond the D-09 list — both are GitHub-token-proxied read-only endpoints that legitimately return 200 unauthenticated and would otherwise produce false-positive denylist triggers.

## Next Step

Plan 04 authors `SECURITY-v1.5.md` and runs `/cso` + `codex review` + `codex adversarial-review`.

## Self-Check: PASSED

- scripts/lib/route-discovery.ts — FOUND
- scripts/abuse-test-all.ts — FOUND
- scripts/__tests__/route-discovery.test.ts — FOUND (5 tests)
- scripts/__tests__/abuse-test-all.test.ts — FOUND (5 tests)
- .planning/SECURITY-v1.5-abuse-test.json — FOUND (placeholder)
- All commits present on branch `chore/v1.5-archive-v1.4`
