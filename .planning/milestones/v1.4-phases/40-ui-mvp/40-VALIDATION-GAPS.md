---
phase: 40-ui-mvp
generated: 2026-04-18
total_tests_passing: 908 (up from 907 — +1 associate sidebar Coding assertion)
scope: non-trivial validation gaps requiring dedicated work (E2E, route unit tests, visual regression)
---

# Phase 40 — Validation Gaps (Non-Trivial)

Filled trivially: associate-sidebar Coding entry regression test (added to
`src/components/shell/sidebar-configs.test.ts`). The following gaps remain and
require dedicated work (new fixtures, Playwright, or bundle-inspection
tooling).

## 1. `/api/coding/attempts` (list route) — unit tests missing

**File:** `src/app/api/coding/attempts/route.ts` (Plan 40-04)
**Requirement:** CODING-UI-04 (attempt history sidebar data source)
**Why non-trivial:** Needs Prisma + identity mocks; must cover:
- anonymous → 401
- associate scoping (self only, rejects `associateSlug` pointing elsewhere)
- trainer/admin `associateSlug=X` lookup path
- Zod validation error (missing `challengeId`, `limit > 25`, `limit < 1`)
- descending `submittedAt` ordering + `limit` clamp

**Suggested harness:** copy `src/app/api/coding/attempts/[id]/route.test.ts`
structure (same mocks). Estimated effort: ~1 hour.

## 2. `/api/coding/challenges/[id]` (detail route) — unit tests missing

**File:** `src/app/api/coding/challenges/[id]/route.ts` (Plan 40-03)
**Requirement:** CODING-UI-02 (solve page data source)
**Why non-trivial:** Needs Prisma + identity + `loadChallenge` mocks; must cover:
- anonymous → 401
- id vs slug fallback lookup
- associate cohort scoping (null cohortId = global; mismatch = 403)
- trainer/admin bypass
- `loadChallenge` throw → 500 envelope
- response NEVER includes hidden test cases (shield assertion)

Estimated effort: ~1 hour.

## 3. Middleware `/coding/*` auth guard — no regression test

**File:** `src/middleware.ts` line 68 (auto-added in 40-01 per Rule 2)
**Requirement:** 40-01 truth "Visiting /coding … redirects to /signin"
**Why non-trivial:** `middleware.test.ts` uses a NextRequest harness; adding a
case is cheap but requires fixture plumbing for the `/coding` prefix match
(anonymous → redirect, trainer → pass, associate → pass). Estimated effort:
~30 min.

## 4. E2E flow: Submit → Queued → Running → Verdict → History

**Requirement:** CODING-UI-03 (D-11 state transitions), CODING-UI-04 (history View swap)
**Why non-trivial:** Requires Playwright + seeded DB + mocked Judge0 (or real
sandbox). Unit tests cover components in isolation but nothing asserts the
full submit→poll→verdict→history-refresh round trip against real wiring. The
phase SUMMARYs mark these UAT items as "manual spot-check" only.

**Suggested approach:** Playwright script under `tests/e2e/coding-submit.spec.ts`
using the playwright-cli skill; mock `/api/coding/submit` + `/api/coding/attempts/[id]`
to return deterministic queued→running→pass sequence; assert DOM transitions and
sidebar refresh. Estimated effort: ~3 hours.

## 5. Visual / responsive regression

**Requirement:** 40-02 must_have "Dark mode renders correctly (visual check)";
40-03 must_have "Two-column on md+, stacked on mobile (D-06)"
**Why non-trivial:** No snapshot/visual harness currently in repo. Manual
spot-checks only. Would need Playwright viewport tests OR Chromatic/Percy
integration.

**Suggested approach:** Playwright `page.emulate({ viewport: { width: 375 } })`
for mobile-stack assertion + `page.addStyleTag` or class toggle for dark mode.
Estimated effort: ~2 hours.

## 6. Monaco bundle-size budget (runtime regression)

**Requirement:** Plan 40-01/04 T-40-11 "Monaco bundle bloat regression"
**Status partial:** `src/components/coding/bundle.test.ts` grep-guards source
imports. Does NOT verify the actual `next build` output — a dev could `export *`
from the wrapper and still bloat. A production-build assertion would inspect
`.next/server/app/**/page.js` chunk sizes for `/coding` vs `/interview` routes.

**Suggested approach:** A CI step post-`next build` that parses the manifest
and fails if Monaco chunk appears in any non-coding route's chunk graph.
Estimated effort: ~2 hours (infrastructure work).

## 7. `ChallengePrompt` XSS / markdown safety

**Requirement:** 40-03 T-40-03 "XSS via markdown"
**Status partial:** Plan documents trust boundary (trainer-authored only).
No test asserts `marked` strips `<script>` tags or that
`dangerouslySetInnerHTML` won't execute injected handlers when source is
hostile. Low priority for v1.4 (trusted source) but mandatory before v1.5
user-authoring.

Estimated effort: ~30 min (feed hostile markdown → assert no `<script>` in
output; or document as v1.5 blocker).

## 8. `usePollAttempt` Retry-After clamp + abort-on-id-change

**Requirement:** 40-04 must_have "Retry-After clamp to remaining wall budget",
"changing attemptId resets backoff"
**Status partial:** `usePollAttempt.test.ts` has 7 cases (null id, backoff,
terminal, wall timeout, unmount, 404, id-change-resets). A test for 429 with
`Retry-After` header that would exceed remaining wall budget is NOT asserted —
the clamp logic is untested. Cheap to add but requires fake-timer math.

Estimated effort: ~45 min.

---

## Summary

- **1 trivial gap filled** (associate sidebar Coding regression)
- **8 non-trivial gaps documented** above
- Core component coverage is strong (51 new tests across 6 suites); the gaps
  concentrate at API routes, middleware, E2E flows, and visual/bundle
  regressions.
- Recommended priority: #1, #2, #3 (server-side unit gaps — cheap, high-leverage)
  before #4–6 (E2E + visual — more infrastructure).
