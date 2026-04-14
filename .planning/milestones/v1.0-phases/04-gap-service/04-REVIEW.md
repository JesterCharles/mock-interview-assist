---
phase: 04-gap-service
reviewed: 2026-04-13T19:30:00Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - src/lib/gapService.ts
  - src/lib/gapPersistence.ts
  - src/lib/__tests__/gapService.test.ts
  - src/app/api/associate/[slug]/gaps/route.ts
  - src/app/api/history/route.ts
  - src/lib/types.ts
  - src/store/interviewStore.ts
  - prisma/schema.prisma
  - vitest.config.ts
findings:
  critical: 1
  warning: 1
  info: 2
  total: 4
status: issues_found
---

# Phase 4: Code Review Report

**Reviewed:** 2026-04-13T19:30:00Z
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found

## Summary

The Phase 4 gap service implementation is well-structured: pure algorithm functions in `gapService.ts` are cleanly separated from DB persistence in `gapPersistence.ts`, the API route has proper auth guards and Zod validation, and the test suite covers the core algorithm thoroughly with 15+ test cases.

However, there is a critical integration bug that prevents gap scores from ever being computed via the primary trigger path (session save). The `InterviewSession` type does not include `associateSlug`, and the Zustand store's `createSession` does not accept or store it, so the fire-and-forget gap computation in `history/route.ts` will never fire. This is technically a pre-existing bug from Phase 3 (associate linkage), but Phase 4's gap computation depends on it and inherits the broken path.

## Critical Issues

### CR-01: associateSlug missing from InterviewSession type and store -- gap scores never trigger

**File:** `src/app/api/history/route.ts:52`, `src/lib/types.ts:41`, `src/store/interviewStore.ts:110`
**Issue:** The fire-and-forget gap computation at `history/route.ts:52` checks `session.associateSlug`, but this property does not exist on the `InterviewSession` interface (`types.ts:41-59`) and is never set by the Zustand store's `createSession` function (`interviewStore.ts:110`). The dashboard passes `associateSlug` as a 7th argument to `createSession` (`dashboard/page.tsx:191`), but the function signature only accepts 6 parameters -- the value is silently dropped. As a result, `session.associateSlug` is always `undefined`, and `saveGapScores` is never called after session save. This also affects `sessionPersistence.ts` (associate linkage never happens).

**Fix:**

1. Add `associateSlug` to the `InterviewSession` interface in `types.ts`:
```typescript
export interface InterviewSession {
    // ... existing fields ...
    associateSlug?: string;
}
```

2. Update `createSession` in `interviewStore.ts` to accept and store it:
```typescript
createSession: (questions, questionCount, selectedWeeks, candidateName, interviewerName, interviewLevel = 'entry', associateSlug?: string) => {
    // ... existing logic ...
    set({
        session: {
            // ... existing fields ...
            associateSlug,
        },
    });
},
```

3. Update the `InterviewStore` interface type for `createSession` accordingly:
```typescript
createSession: (
    questions: ParsedQuestion[],
    questionCount: number,
    selectedWeeks: number[],
    candidateName?: string,
    interviewerName?: string,
    interviewLevel?: 'entry' | 'experienced',
    associateSlug?: string
) => void;
```

## Warnings

### WR-01: Unchecked JSON casts in gapPersistence session mapping

**File:** `src/lib/gapPersistence.ts:58-61`
**Issue:** Prisma JSON columns (`questions`, `starterQuestions`, `assessments`, `techMap`) are cast directly to TypeScript types with `as` without any runtime validation. If stored JSON is malformed or has an unexpected schema (e.g., from a schema migration or manual DB edit), the gap computation will fail with a runtime error inside `extractSkillTopicScores` when accessing properties like `question.id`, `question.weekNumber`, or `question.keywords`. Since `saveGapScores` is called fire-and-forget, these errors are caught and logged but could mask data integrity issues silently.

**Fix:** Add a lightweight guard in the session mapping to skip sessions with obviously malformed data:
```typescript
const sessions: InterviewSession[] = dbSessions
  .map((s) => {
    // Validate critical JSON fields exist before casting
    if (!Array.isArray(s.questions) || typeof s.assessments !== 'object') {
      console.warn(`[gap-service] Skipping session ${s.id}: malformed JSON data`);
      return null;
    }
    return {
      // ... existing mapping ...
    };
  })
  .filter((s): s is InterviewSession => s !== null);
```

## Info

### IN-01: Stale key delimiter could collide with skill/topic names

**File:** `src/lib/gapPersistence.ts:99`
**Issue:** The stale record cleanup uses `::` as a delimiter to build composite keys (`${g.skill}::${g.topic}`). If a skill or topic name ever contains `::`, the key comparison would produce false matches, potentially deleting valid records or retaining stale ones. Currently skills come from filenames (e.g., "react", "typescript") so collision is extremely unlikely.

**Fix:** No immediate action needed. If skill/topic sources become user-editable in the future, consider using a delimiter that is validated against (e.g., null byte) or switching to a Set of `{skill, topic}` object pairs with a custom comparator.

### IN-02: Test file has commented-out calculation notes

**File:** `src/lib/__tests__/gapService.test.ts:89-95`
**Issue:** Lines 89-95 contain a commented-out recalculation where the test author corrected the plan's expected value (73.77 vs actual 72.95). This is harmless but the comments explaining the discrepancy with the plan could be cleaned up now that the test is passing with the correct value.

**Fix:** Simplify the comment to just the formula:
```typescript
it('applies 0.8 decay for three scores (newest first)', () => {
    // (90*1.0 + 70*0.8 + 50*0.64) / (1.0 + 0.8 + 0.64) = 178 / 2.44 = 72.95
    expect(recencyWeightedAverage([90, 70, 50])).toBeCloseTo(72.95, 2);
});
```

---

_Reviewed: 2026-04-13T19:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
