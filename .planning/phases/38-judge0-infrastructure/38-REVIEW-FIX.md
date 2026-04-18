---
phase: 38-judge0-infrastructure
fixed_at: 2026-04-18T04:25:00Z
review_path: .planning/phases/38-judge0-infrastructure/38-REVIEW.md
iteration: 1
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
---

# Phase 38: Code Review Fix Report

**Fixed at:** 2026-04-18
**Source review:** .planning/phases/38-judge0-infrastructure/38-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 2 (Warnings only; Info items IN-01..IN-03 out of scope)
- Fixed: 2
- Skipped: 0

## Fixed Issues

### WR-01: `JUDGE0_EXPOSE_LOCAL` flag documented but not wired

**Files modified:** `docker-compose.yml`, `docker-compose.expose-judge0.yml` (new), `.env.judge0.example`
**Commit:** 22e33de
**Applied fix:** Removed unconditional `ports: - "127.0.0.1:2358:2358"` from base `docker-compose.yml`. Moved the port publish into a new opt-in overlay file `docker-compose.expose-judge0.yml` that users must explicitly merge (`docker compose -f docker-compose.yml -f docker-compose.expose-judge0.yml up`) for local debugging. Production deploys that run only the base file now keep Judge0 reachable solely via the internal `judge0-net` bridge. Documented the pattern and `JUDGE0_EXPOSE_LOCAL=false` default in `.env.judge0.example`. YAML validated with js-yaml.

### WR-02: Auth token may leak via 4xx error body in thrown message

**Files modified:** `src/lib/judge0Client.ts`, `src/lib/__tests__/judge0Client.test.ts`
**Commit:** 4295efa
**Applied fix:** Capped `safeText(res)` at 500 chars with `...[truncated]` marker so the response body carried on `Judge0UnavailableError.cause` is bounded. Prevents log bloat on large error bodies and limits exposure if Judge0 ever echoes back `X-Auth-Token` or request body. Added 3 vitest cases covering submit() oversize truncation, getSubmission() oversize truncation, and no-truncation-when-short. Tests assert against `err.cause` since that is the field that propagates to logs.

## Skipped Issues

None.

## Verification

- `npm run test` (full suite): 680 passed, 4 skipped, 0 failed
- `judge0Client.test.ts`: 16 passed (13 existing + 3 new WR-02 tests)
- docker-compose.yml + docker-compose.expose-judge0.yml validated as valid YAML via js-yaml

---

_Fixed: 2026-04-18_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
