---
phase: 06-trainer-dashboard
reviewed: 2026-04-13T12:00:00Z
depth: standard
files_reviewed: 17
files_reviewed_list:
  - package.json
  - src/app/api/trainer/[slug]/route.ts
  - src/app/api/trainer/route.ts
  - src/app/layout.tsx
  - src/app/trainer/[slug]/loading.tsx
  - src/app/trainer/[slug]/page.tsx
  - src/app/trainer/loading.tsx
  - src/app/trainer/page.tsx
  - src/app/trainer/trainer.css
  - src/components/trainer/CalibrationView.tsx
  - src/components/trainer/EmptyGapState.tsx
  - src/components/trainer/GapTrendChart.tsx
  - src/components/trainer/ReadinessDisplay.tsx
  - src/components/trainer/RosterTable.tsx
  - src/components/trainer/SessionHistoryList.tsx
  - src/components/trainer/SkillFilterDropdown.tsx
  - src/lib/trainer-types.ts
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
status: issues_found
---

# Phase 06: Code Review Report

**Reviewed:** 2026-04-13T12:00:00Z
**Depth:** standard
**Files Reviewed:** 17
**Status:** issues_found

## Summary

The trainer dashboard feature introduces a roster page, associate detail page, two API routes, and six UI components. Overall code quality is solid: auth guards are consistent with existing patterns, API routes include slug validation and proper error handling, types are well-defined, and the CSS scoping via custom properties is clean.

Three warnings relate to logic correctness in chart data mapping, stale state in the calibration component, and unsafe type casting in API routes. Three informational items cover dead code, missing URL encoding, and a minor accessibility gap.

## Warnings

### WR-01: GapTrendChart maps aggregate scores to session labels by array index

**File:** `src/components/trainer/GapTrendChart.tsx:40-41`
**Issue:** `buildGapChartData` maps `skillLevelScores[i]` to `sessionLabels[i]`, treating aggregate GapScoreEntry records as if they are per-session data points. GapScoreEntry contains a single `weightedScore` (a recency-weighted aggregate) and a `sessionCount`, not one score per session. If there are multiple skill-level entries (e.g., from different computation runs), they get assigned to S1, S2, etc. arbitrarily, producing a misleading trend line. The fallback at lines 67-76 also synthesizes a flat horizontal line from a single aggregate value, which is not a real trend.
**Fix:** The chart should either (a) receive per-session score snapshots from the API (requires a schema change to store historical scores per session), or (b) clearly label the chart as showing the current aggregate score rather than a trend. If per-session data is not yet available, display the aggregate as a single KPI value instead of a line chart:
```tsx
// Option B — show aggregate as a single value instead of fake trend
if (main.length <= 1) {
  return (
    <div style={{ textAlign: 'center', padding: '24px 0' }}>
      <span style={{ fontSize: '32px', fontWeight: 700 }}>
        {main[0]?.score ?? '—'}
      </span>
      <p style={{ color: '#7A7267', fontSize: '13px' }}>
        Current weighted score (aggregate across {skillLevelScores[0]?.sessionCount ?? 0} sessions)
      </p>
    </div>
  )
}
```

### WR-02: CalibrationView selectedSessionId does not update when sessions prop changes

**File:** `src/components/trainer/CalibrationView.tsx:61-63`
**Issue:** `useState` initializer only runs on first mount. If the parent re-fetches and passes new sessions (e.g., after a new session is recorded), `selectedSessionId` will still reference the original first session's ID, which may no longer exist in the new list. This would result in `selectedSession` being `null` and showing "No question assessments for this session" despite valid data being available.
**Fix:** Add an effect to sync `selectedSessionId` when `scoredSessions` changes:
```tsx
useEffect(() => {
  if (scoredSessions.length > 0 && !scoredSessions.find(s => s.id === selectedSessionId)) {
    setSelectedSessionId(scoredSessions[0].id)
  }
}, [scoredSessions, selectedSessionId])
```

### WR-03: Unsafe readinessStatus cast in API routes allows invalid values to reach the client

**File:** `src/app/api/trainer/route.ts:33` and `src/app/api/trainer/[slug]/route.ts:94`
**Issue:** Both routes cast `a.readinessStatus as 'ready' | 'improving' | 'not_ready'` with a `?? 'not_ready'` fallback. However, the `as` cast does not validate the value. If the database contains an unexpected string (e.g., `"pending"` from a future migration or data corruption), it passes through to the client unchecked, violating the TypeScript contract. The `??` only catches `null`/`undefined`, not unexpected strings.
**Fix:** Validate the value before returning it:
```typescript
const VALID_STATUSES = new Set(['ready', 'improving', 'not_ready'])
const readinessStatus = VALID_STATUSES.has(a.readinessStatus)
  ? (a.readinessStatus as 'ready' | 'improving' | 'not_ready')
  : 'not_ready'
```

## Info

### IN-01: `allDataKeys` variable is unused for rendering

**File:** `src/components/trainer/GapTrendChart.tsx:102`
**Issue:** `allDataKeys` is computed as `['score', ...topicNames]` but is only referenced in the JSX condition `allDataKeys.length > 1` to toggle the Legend. The actual Line components are rendered separately from `topicNames`. The variable name suggests it should drive line rendering but it does not, making the code harder to follow.
**Fix:** Replace `allDataKeys.length > 1` with `topicNames.length > 0` and remove the `allDataKeys` variable.

### IN-02: Slug not URL-encoded in client-side fetch

**File:** `src/app/trainer/[slug]/page.tsx:40`
**Issue:** The fetch URL uses template literal interpolation `` `/api/trainer/${slug}` `` without `encodeURIComponent`. While the server-side regex `/^[a-z0-9-]+$/` rejects unsafe slugs, the client has no such validation. If `useParams` ever returns an unexpected value (e.g., from a malformed URL), it could produce a broken request.
**Fix:** Use `encodeURIComponent`:
```typescript
const res = await fetch(`/api/trainer/${encodeURIComponent(slug)}`)
```

### IN-03: Roster table rows use `role="link"` but lack `aria-current` or focus styles

**File:** `src/components/trainer/RosterTable.tsx:111-118`
**Issue:** Table rows have `role="link"` and `tabIndex={0}` for keyboard navigation, which is good. However, there are no visible focus styles (`:focus-visible` outline), making keyboard navigation invisible to sighted keyboard users.
**Fix:** Add a focus style in `trainer.css`:
```css
.trainer-table tbody tr:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}
```

---

_Reviewed: 2026-04-13T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
