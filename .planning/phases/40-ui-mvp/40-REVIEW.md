---
phase: 40-ui-mvp
reviewed: 2026-04-18T00:00:00Z
depth: standard
files_reviewed: 15
files_reviewed_list:
  - src/app/coding/page.tsx
  - src/app/coding/[challengeId]/page.tsx
  - src/app/api/coding/challenges/[id]/route.ts
  - src/components/coding/MonacoEditor.tsx
  - src/components/coding/SolveWorkspace.tsx
  - src/components/coding/VerdictCard.tsx
  - src/components/coding/SubmitBar.tsx
  - src/components/coding/ChallengeList.tsx
  - src/components/coding/ChallengeCard.tsx
  - src/components/coding/ChallengeFilters.tsx
  - src/components/coding/ChallengeEmptyState.tsx
  - src/components/coding/ChallengePrompt.tsx
  - src/components/coding/EditorPane.tsx
  - src/components/coding/LanguageToggle.tsx
  - src/components/coding/AttemptHistorySidebar.tsx
  - src/components/coding/monaco-theme.ts
  - src/hooks/usePollAttempt.ts
  - src/hooks/useChallengeList.ts
  - src/hooks/useColorMode.ts
  - src/middleware.ts
findings:
  critical: 0
  warning: 3
  info: 4
  total: 7
status: issues_found
---

# Phase 40: Code Review Report

**Depth:** standard
**Status:** issues_found

## Summary

Phase 40 ships a solid UI MVP. Hidden-test shield holds (D-05): `VerdictCard` accesses only `.passed`/`.total`; `/api/coding/challenges/[id]` excludes hidden rows via `where: { isHidden: false }`. Monaco is singly-gated through `MonacoEditor.tsx` (dynamic, `ssr:false`) with a bundle test enforcing the boundary. Middleware `/coding/*` guard redirects unauthenticated users to `/signin?next=`. `usePollAttempt` has exponential backoff (500ms→5s, factor 1.5), 60s wall cap, `AbortController` cleanup, and `mountedRef` guard. DESIGN tokens used throughout. Three warnings and four info items below.

## Warnings (P1)

### WR-01: marked() output injected without sanitization

**File:** `src/components/coding/ChallengePrompt.tsx:22-29`
**Issue:** `marked.parse(markdown)` is injected via `dangerouslySetInnerHTML`. `marked` does not strip `<script>`/`<iframe>` or `javascript:` URLs. Comment claims "trusted source," but markdown flows from DB (`loadChallenge`) — any trainer with DB write or a compromised coding-bank commit can inject XSS. Plan 40-03 Task 1 authored this noting v1.5 debt, but the DB source already invalidates the "trusted" premise.
**Fix:** Add `isomorphic-dompurify` now; cost is trivial:
```ts
import DOMPurify from 'isomorphic-dompurify';
const html = useMemo(
  () => DOMPurify.sanitize(marked.parse(markdown, { gfm: true, breaks: false }) as string),
  [markdown],
);
```

### WR-02: 401 on poll triggers retry loop until wall-clock timeout

**File:** `src/hooks/usePollAttempt.ts:136-176`
**Issue:** Only 404/403/429 branch explicitly; a 401 (session expired mid-poll) falls through to the "other errors" path and reschedules until 60s timeout — burning ~10 requests after auth loss and leaving user on a stale page. No client-side redirect to `/signin`.
**Fix:** Add a 401 branch that stops polling and navigates:
```ts
if (res.status === 401) {
  setStatus('error');
  setError({ code: 'AUTH_REQUIRED', message: 'Session expired' });
  clearTimer();
  window.location.assign(`/signin?next=${encodeURIComponent(location.pathname)}`);
  return;
}
```
Same fix belongs in `SubmitBar.handleSubmit` (line 50-70) and `useChallengeList.fetchPage` (line 172-194).

### WR-03: 503 (Judge0 unavailable) surfaced as generic error

**File:** `src/components/coding/SubmitBar.tsx:52-70`, `src/hooks/usePollAttempt.ts:172-176`
**Issue:** Focus item required Judge0 503 surfacing. Currently 503 falls to generic "HTTP 503" toast — users get no actionable message distinct from a random server error.
**Fix:** Branch on 503 explicitly in both `SubmitBar` and `usePollAttempt`; surface "Runner is temporarily unavailable — try again in a minute."

## Info (P2-P3)

### IN-01: Hardcoded `#FFFFFF` violates DESIGN token rule

**File:** `src/components/coding/SubmitBar.tsx:117`, `src/components/coding/ChallengeEmptyState.tsx:78`
**Issue:** CONTEXT D-15 mandates "No hardcoded hex." Both sites use `color: '#FFFFFF'` on accent buttons.
**Fix:** Add `--on-accent` token to `globals.css` (or reuse an existing token like `--surface`/`--ink` inverted) and replace both literals.

### IN-02: Challenge `[id]` route accepts either cuid or slug — collision risk

**File:** `src/app/api/coding/challenges/[id]/route.ts:37-39`
**Issue:** `findUnique({ id })` then fallback `findUnique({ slug: id })`. If a crafted slug matches a cuid format, a user could access a different challenge than intended. Low-risk today (cuid2 has distinct prefix) but brittle.
**Fix:** Require a query param `?by=slug` or route-level split; or assert id format with a regex before the id-first lookup.

### IN-03: No Zod validation on `[id]` route

**File:** `src/app/api/coding/challenges/[id]/route.ts`
**Issue:** Project convention (zod on API inputs) not applied. Single string param is low-risk, but adding `z.string().min(1).max(64)` guards against degenerate inputs and matches the rest of the codebase.

### IN-04: `poll` useCallback has `[]` deps but closes over sibling helpers

**File:** `src/hooks/usePollAttempt.ts:123-206`
**Issue:** `scheduleOrTimeout` / `schedulePoll` are redeclared every render yet `poll` is memoized with `[]`. Works today because helpers only touch refs, but any future helper change referencing state will silently use stale values. The `eslint-disable-next-line` suppression hides this.
**Fix:** Either inline the helpers inside the `useCallback`, or wrap them in their own `useCallback` and list them as deps.

---

_Reviewed: 2026-04-18_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
