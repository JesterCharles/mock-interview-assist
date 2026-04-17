---
phase: 30-associate-curriculum-view
plan: "01"
subsystem: associate-ui
tags: [curriculum, associate, ui, gap-scores, score-colors]
dependency_graph:
  requires: [curriculumService.listWeeks, prisma.gapScore, identity.getCallerIdentity, validateSlug]
  provides: [CurriculumPage, CurriculumSchedule, CurriculumBanner, WeekRow, TopicCell, scoreColors]
  affects: [src/app/associate/[slug]/curriculum/page.tsx]
tech_stack:
  added: []
  patterns: [server-component-with-client-children, css-hover-tooltip, 5-band-score-colors, collapsible-rows]
key_files:
  created:
    - src/lib/scoreColors.ts
    - src/components/associate/TopicCell.tsx
    - src/components/associate/WeekRow.tsx
    - src/components/associate/CurriculumBanner.tsx
    - src/components/associate/CurriculumSchedule.tsx
  modified:
    - src/app/associate/[slug]/curriculum/page.tsx
decisions:
  - "Used CSS class-based hover (topic-cell-wrapper:hover) instead of JS state for tooltip — simpler, no re-renders"
  - "Dual score map (skill-level + topic-level) built server-side for D-13 future-proofing at zero extra cost"
  - "currentWeek detection uses latest startDate <= now from ordered weeks array — simple and correct"
  - "--mastery token already defined in globals.css from Phase 29; CSS fallback in scoreColors.ts is belt-and-suspenders"
metrics:
  duration: "~20 minutes"
  completed: "2026-04-16"
  tasks_completed: 2
  files_created: 6
requirements: [CURRIC-01, CURRIC-02]
---

# Phase 30 Plan 01: Associate Curriculum View Summary

Replaced the Phase 27 curriculum placeholder with a fully functional read-only curriculum schedule page at `/associate/[slug]/curriculum`. Associates with cohort assignments see a weekly grid with collapsible rows, 5-color score dots, current-week highlight, and a banner prompting unassessed topics. Associates without cohort assignments see an empty state with BookOpen icon.

## What Was Built

**`src/lib/scoreColors.ts`** — Pure utility mapping scores 0-100 to 5-band CSS token system (danger/warning/accent/success/mastery). Returns null for unassessed scores.

**`src/components/associate/TopicCell.tsx`** — Client component rendering a color dot + topic name. Unassessed topics show a grey dashed-border dot with CSS hover tooltip ("Not yet assessed — take a mock to evaluate") and a `?` badge. Hover behavior via `.topic-cell-wrapper:hover` CSS class selector — no JS state required.

**`src/components/associate/WeekRow.tsx`** — Client component with collapsible header. Week number badge, skill name, formatted date, topic count when collapsed, chevron with 200ms rotation transition. Current week gets `3px solid var(--accent)` left border; future weeks get `opacity: 0.5`. Uses `useState` initialized from `defaultExpanded` prop.

**`src/components/associate/CurriculumBanner.tsx`** — Client banner showing unassessed topic count with "Take a mock" CTA. Renders nothing when count is 0. Mouse hover changes accent button color via inline event handlers.

**`src/components/associate/CurriculumSchedule.tsx`** — Client component composing WeekRows. Determines `defaultExpanded` by finding current week index, expanding current + prior week (index-1). Falls back to last past week when no current week exists.

**`src/app/associate/[slug]/curriculum/page.tsx`** — Server component. Auth guard mirrors dashboard/page.tsx pattern (anonymous → /signin, wrong associate → 403, trainer/admin → any slug). Fetches associate cohortId, shows empty state if null. Parallel fetches `listWeeks(cohortId)` + `prisma.gapScore.findMany`. Builds dual score maps (skill-level and topic-level) for D-13 future-proofing. Assigns timeState per week, counts unassessed topics in current week for banner.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all data is wired from real Prisma queries. The `interviewHref="/"` CTA points to the public interview entry point as specified in the plan (D-03 from Phase 27).

## Threat Flags

No new threat surface introduced. Auth guard on curriculum page covers T-30-01. Cohort ID derived from DB record (not query params) covers T-30-03.

## Self-Check

- [x] `src/lib/scoreColors.ts` — exists
- [x] `src/components/associate/TopicCell.tsx` — exists
- [x] `src/components/associate/WeekRow.tsx` — exists
- [x] `src/components/associate/CurriculumBanner.tsx` — exists
- [x] `src/components/associate/CurriculumSchedule.tsx` — exists
- [x] `src/app/associate/[slug]/curriculum/page.tsx` — modified
- [x] Task 1 commit: `164f8c4`
- [x] Task 2 commit: `7ce1533`
- [x] `npx tsc --noEmit` — passes clean

## Self-Check: PASSED
