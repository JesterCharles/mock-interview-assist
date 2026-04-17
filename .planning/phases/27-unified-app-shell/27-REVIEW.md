---
phase: 27-unified-app-shell
reviewed: 2026-04-16T12:00:00Z
depth: standard
files_reviewed: 17
files_reviewed_list:
  - src/app/associate/[slug]/curriculum/page.tsx
  - src/app/associate/[slug]/dashboard/page.test.tsx
  - src/app/associate/[slug]/dashboard/page.tsx
  - src/app/associate/[slug]/interview/page.tsx
  - src/app/associate/[slug]/layout.tsx
  - src/app/associate/[slug]/page.tsx
  - src/app/history/layout.tsx
  - src/app/interview/layout.tsx
  - src/app/page.tsx
  - src/app/question-banks/layout.tsx
  - src/app/review/layout.tsx
  - src/app/signin/page.tsx
  - src/components/ClientLayout.tsx
  - src/components/shell/AssociateShell.tsx
  - src/components/shell/SectionSidebar.tsx
  - src/components/shell/TopBar.tsx
  - src/components/shell/sidebar-configs.ts
findings:
  critical: 1
  warning: 3
  info: 3
  total: 7
status: issues_found
---

# Phase 27: Code Review Report

**Reviewed:** 2026-04-16T12:00:00Z
**Depth:** standard
**Files Reviewed:** 17
**Status:** issues_found

## Summary

Phase 27 introduces the unified app shell: TopBar, SectionSidebar, AssociateShell, sidebar-configs, and updates multiple layouts to use these components. The shell components are well-structured and follow project DESIGN.md conventions consistently. One critical bug was found in the associate dashboard readiness percentage calculation -- the value is passed as a raw weighted score (0-10 scale) instead of a 0-100 percentage. Three warnings address an unauthenticated layout data fetch, hardcoded hex literals that bypass CSS vars, and a test that does not assert its documented expectation.

## Critical Issues

### CR-01: Readiness percentage not normalized to 0-100 scale

**File:** `src/app/associate/[slug]/dashboard/page.tsx:123-128`
**Issue:** `readinessPercent` is computed as the raw average of `weightedScore` values (which are on a 0-10 scale from LLM scoring) without multiplying by 10 (or dividing by maxScore). The `ReadinessProgressBar` component expects a 0-100 integer (`clampedPercent` clamps to 0-100). With typical gap scores like 7.5 and 5.0, the progress bar would display `6%` instead of `63%`. The readiness threshold (default 75%) would never be reached.

**Fix:**
```typescript
const readinessPercent =
  skillLevelScores.length > 0
    ? Math.round(
        (skillLevelScores.reduce((sum, g) => sum + g.weightedScore, 0) /
          skillLevelScores.length) * 10,
      )
    : 0;
```

Note: The exact multiplier depends on the actual `weightedScore` scale. If scores are 0-10 (from LLM 1-10 scoring), multiply by 10. If scores are already 0-100 (the `isValidScore` guard allows 0-100), no multiplication is needed and the current code is correct for scores that happen to be in the 0-100 range. Verify the actual data in the `GapScore` table to confirm the scale. The test at `page.test.tsx:160` documents an expectation of `(0.7 + 0.5) / 2 * 100 = 60` but uses test data on a 0-1 scale while the code has no `* 100`, so the test and production code are inconsistent with the documented intent.

## Warnings

### WR-01: Associate layout fetches data without authentication check

**File:** `src/app/associate/[slug]/layout.tsx:22-28`
**Issue:** The layout performs a Prisma query (`prisma.associate.findUnique`) using the raw URL slug without first checking caller identity. While the child pages (dashboard, profile, interview) all have their own auth guards, the layout runs unconditionally -- meaning an unauthenticated visitor hitting `/associate/any-slug/dashboard` will trigger a database query for sidebar data before being redirected by the child page's auth guard. This leaks the existence of associate slugs (404 vs redirect behavior difference) and performs unnecessary DB work for anonymous users.

**Fix:** Add an identity check in the layout, or accept this as a known trade-off and document it:
```typescript
import { getCallerIdentity } from '@/lib/identity';

export default async function AssociateLayout({ children, params }: AssociateLayoutProps) {
  const { slug } = await params;

  const caller = await getCallerIdentity();
  if (caller.kind === 'anonymous') {
    redirect('/signin?as=associate&next=' + encodeURIComponent(`/associate/${slug}`));
  }

  // ... rest of layout
}
```

### WR-02: Test does not assert the readiness percentage value

**File:** `src/app/associate/[slug]/dashboard/page.test.tsx:159-188`
**Issue:** Test 5 documents `// weightedScore 0.7 + 0.5 -> avg 0.6 -> 60%` but only asserts `expect(result).toBeTruthy()`. It does not verify that `readinessPercent = 60` is actually passed to `ReadinessProgressBar`. This allowed the CR-01 bug to pass undetected -- the component renders successfully with a wrong percentage (1 instead of 60).

**Fix:** Mock `ReadinessProgressBar` to capture props and assert the percentage:
```typescript
let capturedPercent: number | undefined;
vi.mock('@/components/associate/ReadinessProgressBar', () => ({
  ReadinessProgressBar: (props: { readinessPercent: number }) => {
    capturedPercent = props.readinessPercent;
    return null;
  },
}));

// ... in the test:
expect(capturedPercent).toBe(60);
```

### WR-03: Hardcoded hex color literals in public interview page

**File:** `src/app/page.tsx:768-769, 950-953, 1261, 1362-1369`
**Issue:** Several hex color literals bypass DESIGN.md CSS variables: `#FDECEB` (line 768), `#FEF3E0` (lines 950, 1261), `#E8F5EE` (line 1362). These won't respond to dark mode theme changes and violate the unified design system convention.

**Fix:** Replace with CSS variables or define new semantic tokens in `globals.css`:
```css
/* In globals.css */
--danger-bg: #FDECEB;
--warning-bg: #FEF3E0;
--success-bg: #E8F5EE;
```
Then use `var(--danger-bg)`, `var(--warning-bg)`, `var(--success-bg)` in the component.

## Info

### IN-01: Extensive use of `any` type in public interview page

**File:** `src/app/page.tsx:61, 101, 114, 219, 271, 303, 641, 1303`
**Issue:** Multiple state variables and function parameters use `any` type (`useState<any[]>`, `useState<any>`, callback params typed as `any`). This reduces type safety for the entire interview flow state management.

**Fix:** Define explicit interfaces for `Question`, `SessionData`, and `Assessment` types and use them for state declarations. This is a larger refactor best done as a follow-up.

### IN-02: Duplicated layout boilerplate across trainer-adjacent routes

**File:** `src/app/history/layout.tsx`, `src/app/interview/layout.tsx`, `src/app/question-banks/layout.tsx`, `src/app/review/layout.tsx`
**Issue:** Four layout files are identical (TopBar + full-width main content, no sidebar). Consider extracting a shared `TrainerMinimalLayout` component to reduce duplication.

**Fix:**
```typescript
// src/components/shell/MinimalShell.tsx
export function MinimalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg)' }}>
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
```

### IN-03: `console.error` calls throughout public interview page

**File:** `src/app/page.tsx:182, 197, 249, 359, 414, 527, 683, 695`
**Issue:** Multiple `console.error` calls remain in production code. These are fine for error logging but should be reviewed to ensure no sensitive data (fingerprints, session IDs) is logged in production.

**Fix:** Consider using a structured logger or ensure these are acceptable for production output.

---

_Reviewed: 2026-04-16T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
