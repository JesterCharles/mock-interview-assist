---
phase: 03-associate-profiles
reviewed: 2026-04-13T12:00:00Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - src/lib/slug-validation.ts
  - prisma/schema.prisma
  - src/lib/types.ts
  - src/store/interviewStore.ts
  - src/app/dashboard/page.tsx
  - src/lib/sessionPersistence.ts
  - src/app/associate/[slug]/page.tsx
findings:
  critical: 0
  warning: 3
  info: 2
  total: 5
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-04-13T12:00:00Z
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found

## Summary

Reviewed the associate profiles feature: slug validation, Prisma schema additions, session persistence with associate linkage, the dashboard setup wizard changes, and the new associate profile page. The code is generally well-structured with proper error handling and graceful degradation. Three warnings found: an invalid slug can be submitted to the backend because the UI validation is advisory-only, the session upsert can silently unlink a previously associated session, and the associate profile page does not validate the slug parameter before querying.

## Warnings

### WR-01: Invalid slug not blocked on interview start

**File:** `src/app/dashboard/page.tsx:170-187`
**Issue:** `handleStartInterview` passes `associateSlug` to `createSession` without checking `slugError`. The validation in `handleSlugChange` (line 154) sets `slugError` state for display purposes only, but neither the start button's `disabled` prop (line 574) nor the handler itself gates on slug validity. A trainer can type a malformed slug (e.g., `--bad--slug--`), see the red error text, and still click "Start Interview Now". The session will be created with the invalid slug in the Zustand store. Downstream, `persistSessionToDb` will silently skip the associate upsert (line 36-38 of sessionPersistence.ts), so the session is persisted but unlinked -- a silent data loss of the associate relationship.

**Fix:** Either disable the start button when `slugError` is set, or validate in the handler:
```tsx
// Option A: disable button (line ~574)
disabled={loadingQuestions || loadedQuestions.length === 0 || !!slugError}

// Option B: guard in handler (line ~170)
const handleStartInterview = () => {
  if (associateSlug) {
    const result = validateSlug(associateSlug);
    if (!result.success) {
      setSlugError(result.error);
      return;
    }
  }
  // ... rest of handler
};
```

### WR-02: Session upsert can silently unlink a previously associated session

**File:** `src/lib/sessionPersistence.ts:58-75`
**Issue:** The `update` block of the session upsert always sets `associateId` to whatever was resolved in the current call. If a session was previously persisted with an `associateId` (e.g., during interview creation) but is later re-persisted without an `associateSlug` (e.g., the slug field was cleared, or it is called from a code path that does not populate the slug), `associateId` will be overwritten with `null`, silently unlinking the session from its associate.

**Fix:** Only include `associateId` in the update payload when it is non-null, preserving any existing linkage:
```typescript
update: {
  // ... other fields ...
  ...(associateId !== null ? { associateId } : {}),
},
```

### WR-03: Unvalidated slug parameter in associate profile page

**File:** `src/app/associate/[slug]/page.tsx:110-113`
**Issue:** The `slug` URL parameter is passed directly to `prisma.associate.findUnique` without running it through `validateSlug`. While Prisma parameterizes queries (no SQL injection risk), arbitrary strings like extremely long slugs or strings with special characters will hit the database unnecessarily. The `slugSchema` enforces max 64 characters and a strict pattern -- applying it here would reject bad input before the DB round-trip.

**Fix:**
```typescript
import { validateSlug } from '@/lib/slug-validation';

const { slug } = await params;
const validation = validateSlug(slug);
if (!validation.success) {
  notFound();
}

const associate = await prisma.associate.findUnique({
  where: { slug: validation.slug },
  // ...
});
```

## Info

### IN-01: Deprecated `substr` usage

**File:** `src/store/interviewStore.ts:85`
**Issue:** `Math.random().toString(36).substr(2, 9)` uses `String.prototype.substr`, which is deprecated in favor of `substring`. While functionally equivalent here, `substr` is marked as a legacy feature in the ECMAScript spec.

**Fix:**
```typescript
const generateSessionId = () => `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
```

### IN-02: Console.error in dashboard production code

**File:** `src/app/dashboard/page.tsx:83`
**Issue:** `console.error(err)` in the `fetchTechs` catch block will log raw error objects to the browser console in production. The `sessionPersistence.ts` console calls are server-side and tagged with `[session-persistence]` prefixes (acceptable for server logging), but client-side console.error leaks implementation details.

**Fix:** Either remove or guard behind a dev check:
```typescript
if (process.env.NODE_ENV === 'development') {
  console.error(err);
}
```

---

_Reviewed: 2026-04-13T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
