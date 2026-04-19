---
phase: 40-ui-mvp
fixed_at: 2026-04-18T07:01:00Z
review_path: .planning/phases/40-ui-mvp/40-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 40: Code Review Fix Report

**Source review:** `.planning/phases/40-ui-mvp/40-REVIEW.md`
**Iteration:** 1

**Summary:**
- In scope: 5 (WR-01 treated as P0, WR-02, WR-03, IN-01, IN-03)
- Fixed: 5
- Skipped: 0
- Out of scope (deferred per user): IN-02, IN-04
- Test baseline: 908 passing -> 916 passing (+8 new cases, 0 regressions)

## Fixed Issues

### WR-01: marked() output injected without sanitization
**Files:** `src/components/coding/ChallengePrompt.tsx`, `src/components/coding/ChallengePrompt.test.tsx`, `package.json`
**Commit:** 6484b2f
**Applied fix:** Installed `isomorphic-dompurify@3.9.0`. Wrapped `marked.parse(...)` result with `DOMPurify.sanitize(...)` in the `useMemo`. Removed the "trusted source" comment (DB-writable markdown is not trusted). Added 4 sanitization tests: `<script>` stripped, `onerror` stripped, `javascript:` URLs stripped, safe markdown preserved.

### WR-02: 401 on poll triggers retry loop until wall-clock timeout
**Files:** `src/hooks/usePollAttempt.ts`, `src/components/coding/SubmitBar.tsx`, `src/hooks/useChallengeList.ts`, `src/hooks/usePollAttempt.test.ts`, `src/components/coding/SolveWorkspace.test.tsx`
**Commit:** 814aacf
**Applied fix:** Added explicit 401 branch to all three network surfaces. `usePollAttempt` clears its timer and sets `AUTH_REQUIRED` immediately; `SubmitBar.handleSubmit` and `useChallengeList.fetchPage` remap 401 to `AUTH_REQUIRED` in the error envelope. Host pages now receive a distinct code for redirect-to-/signin. Left the redirect itself to callers (no `window.location.assign` in the hook — hooks stay pure). Tests assert single fetch + `error` status after 401.

### WR-03: 503 (Judge0 unavailable) surfaced as generic error
**Files:** same commit as WR-02 (814aacf)
**Commit:** 814aacf
**Applied fix:** Explicit 503 branch in `usePollAttempt` (stop polling, `SANDBOX_UNAVAILABLE`), `SubmitBar` (map code + message), `useChallengeList` (same). User-facing message: "Judge0 sandbox temporarily unavailable — try again in a moment." Tests cover both poll and submit paths.

### IN-01: Hardcoded `#FFFFFF` violates DESIGN token rule
**Files:** `src/app/globals.css`, `src/components/coding/SubmitBar.tsx`, `src/components/coding/ChallengeEmptyState.tsx`
**Commit:** 772c562
**Applied fix:** Added `--text-on-accent: #FFFFFF` to both light and dark `:root` blocks in `globals.css`. Replaced the two hardcoded literals with `var(--text-on-accent)`.

### IN-03: No Zod validation on `[id]` route
**File:** `src/app/api/coding/challenges/[id]/route.ts`
**Commit:** 9996fea
**Applied fix:** Added `z.string().min(1).max(64)` guard against the route param with `safeParse`. Returns `VALIDATION_ERROR` (400) via existing `codingApiError` envelope on miss (did not add `INVALID_ID` — sticks to the registered code union).

---

_Fixed: 2026-04-18_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
