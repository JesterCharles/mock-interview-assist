---
phase: 07-adaptive-setup
reviewed: 2026-04-13T12:00:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - src/app/api/associates/[slug]/gap-scores/route.ts
  - src/app/dashboard/page.tsx
  - src/lib/__tests__/adaptiveSetup.test.ts
  - src/lib/adaptiveSetup.ts
findings:
  critical: 0
  warning: 4
  info: 2
  total: 6
status: issues_found
---

# Phase 7: Code Review Report

**Reviewed:** 2026-04-13T12:00:00Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Four files reviewed for the adaptive setup feature: a gap-scores API route, dashboard page integration, the core `mapGapScoresToWeights` algorithm, and its test suite. The algorithm in `adaptiveSetup.ts` is clean and well-tested. The API route is solid on auth and input validation but lacks error handling for database failures. The dashboard page has a slug input consistency bug between Phase 1 and Phase 2 of the wizard that could allow un-normalized slugs to reach the session.

## Warnings

### WR-01: Slug input in Phase 1 bypasses validation and normalization

**File:** `src/app/dashboard/page.tsx:305-308`
**Issue:** The associate slug input in Phase 1 (`renderPhase1`) uses an inline `onChange` that calls `setAssociateSlug(e.target.value)` directly, bypassing `handleSlugChange` (lines 246-260) which normalizes to lowercase/trim and validates format. If a user enters an uppercase or invalid slug in Phase 1 and never edits it in Phase 2 (which does use `handleSlugChange`), the un-normalized value persists. While `handleStartInterview` validates at submit time, the slug passed to `createSession` (line 283) and to the gap-scores API (line 215) could contain uppercase characters, causing a mismatch with the DB (which stores lowercase slugs).
**Fix:**
```tsx
// Line 305-308: Replace inline onChange with handleSlugChange
onChange={(e) => {
  handleSlugChange(e);
  setShowSuggestions(true);
}}
```
Note: `handleSlugChange` already calls `setAssociateSlug` internally, and the `onBlur` handler's `handleSlugLookup` already lowercases, but the displayed value should be normalized on every keystroke for consistency.

### WR-02: API route has no try/catch around Prisma queries

**File:** `src/app/api/associates/[slug]/gap-scores/route.ts:41-68`
**Issue:** The `findUnique` and `count` Prisma calls have no error handling. If the database is unreachable or the query fails, the route handler throws an unhandled exception, resulting in a generic 500 response with a stack trace (potentially leaking internal details in development mode). The anti-enumeration design (T-07-03) is undermined because a DB error returns a different response shape than the normal `found: false` path.
**Fix:**
```typescript
try {
  const associate = await prisma.associate.findUnique({
    where: { slug: parsed.data },
    include: {
      gapScores: {
        where: { topic: '' },
      },
    },
  });

  if (!associate) {
    const response: GapScoreResponse = { found: false, sessionCount: 0, scores: [] };
    return NextResponse.json(response);
  }

  const sessionCount = await prisma.session.count({
    where: { associateId: associate.id, status: 'completed' },
  });

  const response: GapScoreResponse = {
    found: true,
    sessionCount,
    scores: associate.gapScores.map((g) => ({
      skill: g.skill,
      weightedScore: g.weightedScore,
    })),
  };

  return NextResponse.json(response);
} catch {
  // Return same shape as "not found" to avoid leaking DB state
  const response: GapScoreResponse = { found: false, sessionCount: 0, scores: [] };
  return NextResponse.json(response);
}
```

### WR-03: handleSlugLookup does not catch JSON parse errors

**File:** `src/app/dashboard/page.tsx:210-227`
**Issue:** If the gap-scores endpoint returns a non-JSON response (e.g., HTML error page from a proxy, or malformed body), `res.json()` on line 217 will throw. The `finally` block sets `isLoadingGapScores` to false, but the thrown error is uncaught, producing a console error. This does not crash the app (React error boundaries or the browser catch it), but it is inconsistent with the "fail silently, stay manual" design intent stated in the comment on line 216.
**Fix:**
```typescript
const handleSlugLookup = useCallback(async (slug: string) => {
  const trimmed = slug.trim().toLowerCase();
  if (!trimmed) return;
  setIsLoadingGapScores(true);
  try {
    const res = await fetch(`/api/associates/${encodeURIComponent(trimmed)}/gap-scores`);
    if (!res.ok) return;
    const data: GapScoreResponse = await res.json();
    if (!data.found || data.sessionCount < 3) return;
    if (availableTechs.length === 0) {
      setPendingGapScores(data.scores);
      return;
    }
    applyGapScores(data.scores);
  } catch {
    // Fail silently — stay in manual mode
  } finally {
    setIsLoadingGapScores(false);
  }
}, [availableTechs, applyGapScores]);
```

### WR-04: Duplicate associate slug input across wizard phases

**File:** `src/app/dashboard/page.tsx:298-348` and `src/app/dashboard/page.tsx:629-642`
**Issue:** The associate slug is collected in Phase 1 (with typeahead and gap-score lookup) AND again in Phase 2 (as a plain text input labeled "Associate ID"). Both read/write the same `associateSlug` state. If a user selects an associate in Phase 1 (triggering adaptive pre-population), then accidentally clears or changes the slug in Phase 2, the pre-populated weights remain applied but are now associated with the wrong (or no) associate. The Phase 2 input also lacks the typeahead UX, creating an inconsistent experience.
**Fix:** Consider removing the Phase 2 associate slug input (lines 629-642) since it is now redundant with the Phase 1 adaptive setup input. If it must stay for backward compatibility, make it read-only when pre-populated from Phase 1, or sync clearing the slug with clearing the pre-populated weights.

## Info

### IN-01: console.error calls in production code

**File:** `src/app/dashboard/page.tsx:110,145`
**Issue:** Two `console.error` calls remain in the dashboard page for GitHub fetch failures and question loading failures. These are debug artifacts that will appear in production browser consoles.
**Fix:** Remove or gate behind a development check, or replace with user-visible error state (which is already partially handled via the `setError` calls on the lines that follow).

### IN-02: Unused import X in dashboard page

**File:** `src/app/dashboard/page.tsx:8`
**Issue:** The `X` icon from lucide-react is imported but never used in the component JSX.
**Fix:** Remove `X` from the import statement on line 8.

---

_Reviewed: 2026-04-13T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
