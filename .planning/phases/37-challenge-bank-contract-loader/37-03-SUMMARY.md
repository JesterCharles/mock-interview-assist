---
phase: 37-challenge-bank-contract-loader
plan: 03
subsystem: coding-challenges
tags: [api-route, trainer-gate, refresh]
requires: [37-02]
provides:
  - "POST /api/coding/bank/refresh — trainer-only on-demand sync"
affects:
  - "No existing files — new route only"
key-files:
  created:
    - src/app/api/coding/bank/refresh/route.ts
    - src/app/api/coding/bank/refresh/route.test.ts
decisions:
  - "Auth matrix: 401 anonymous, 403 associate, 200 trainer/admin."
  - "Per-slug ChallengeValidationError captured in errors[] with sanitized reason; batch continues."
  - "Manifest-level ChallengeValidationError returns 200 with manifest error entry (trainer needs visibility to fix, not a 5xx)."
  - "Unexpected listChallenges errors return 502 upstream_unavailable."
  - "sanitizeReason strips stack traces and caps message length at 500 chars."
metrics:
  duration: 10min
  completed: 2026-04-18
  tests_added: 14
---

# Phase 37 Plan 03: Refresh Route Summary

Trainer-only POST endpoint that triggers immediate challenge sync. Completes the 5-min author-to-visible window with an escape hatch for just-merged PRs.

## Contract

- `POST /api/coding/bank/refresh` (no body or `{}` or `{slugs: []}`) → full manifest sync
- `POST /api/coding/bank/refresh` with `{slugs: ["a", "b"]}` → targeted sync
- Response: `{synced, skipped, errors: [{slug, reason}]}`

## Auth Gate

| Caller kind | Status | Body |
|-------------|--------|------|
| anonymous | 401 | `{error: 'unauthorized'}` |
| associate | 403 | `{error: 'forbidden'}` |
| trainer | 200 | refresh envelope |
| admin | 200 | refresh envelope |

## Error Isolation (D-15 step 4 + CODING-BANK-05)

- Per-slug `ChallengeValidationError` → captured in `errors[]`, batch continues
- Per-slug non-validation error → captured with sanitized single-line `reason`
- Manifest walk `ChallengeValidationError` → 200 with manifest error entry
- Manifest walk unexpected error → 502 `upstream_unavailable`

## Cache Ordering (targeted path)

```
invalidate:public:<slug>:*
invalidate:private:<slug>:*
sync:<slug>
```

Full path flushes entire cache before `listChallenges()`.

## Handoff to Phase 38+

- Phase 38 (Judge0 infra): no coupling to this route; separate concern
- Phase 39 (coding submit/poll): will add `/api/coding/submit`, `/api/coding/attempts`, `/api/coding/bank/list` alongside `/api/coding/bank/refresh`
- Phase 40 (UI): adds a "Refresh bank" button to trainer surfaces that calls this route

## Self-Check: PASSED

14 tests green. Full repo suite 657 passing. Commit a65921b records the work.
