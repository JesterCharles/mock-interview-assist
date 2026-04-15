---
phase: 13-curriculum-schedule
plan: "02"
subsystem: curriculum-ui
tags: [ui, trainer, curriculum, client-components, design-system]
dependency_graph:
  requires: ["13-01"]
  provides: ["curriculum-trainer-ui"]
  affects: ["13-03-wizard-filter"]
tech_stack:
  added: []
  patterns: ["client component with fetch on mount", "refreshSignal pattern for cross-component refetch", "inline edit mode toggle", "window.confirm for delete", "server component shell + client manager composition"]
key_files:
  created:
    - src/components/trainer/CurriculumTable.tsx
    - src/components/trainer/CurriculumWeekRow.tsx
    - src/components/trainer/AddCurriculumWeekForm.tsx
    - src/app/trainer/cohorts/[id]/curriculum/CurriculumManager.tsx
    - src/app/trainer/cohorts/[id]/curriculum/page.tsx
  modified:
    - next.config.ts (reverted — turbopack.root attempt didn't help)
decisions:
  - "CurriculumManager client wrapper holds refreshSignal state; CurriculumTable accepts it as prop to trigger refetch on week add — avoids prop drilling callbacks through server boundary"
  - "CurriculumWeekRow returns fragment (<>...</>) for edit mode so the error row can appear adjacent without wrapping div breaking table structure"
  - "AddCurriculumWeekForm auto-generates skillSlug from skillName unless user has manually edited slug"
  - "CSS imported via @/ alias in CurriculumTable (not relative path) to resolve correctly in both worktree and main build contexts"
  - "checkpoint:human-verify auto-approved per autonomous execution instructions — build green, server running on :3000"
metrics:
  duration_seconds: 900
  completed_date: "2026-04-14"
  tasks_completed: 3
  tasks_total: 4
  files_created: 5
  files_modified: 0
  tests_added: 0
---

# Phase 13 Plan 02: Trainer Curriculum UI Summary

**One-liner:** Per-cohort curriculum table with inline edit/delete, add-week form, and server-rendered page shell — all wired to the Plan 01 CRUD API using DESIGN.md tokens.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | CurriculumTable and CurriculumWeekRow | fc52ae6 | CurriculumTable.tsx, CurriculumWeekRow.tsx |
| 2 | AddCurriculumWeekForm and trainer page | b9e0456 | AddCurriculumWeekForm.tsx, CurriculumManager.tsx, page.tsx |
| 3 | Dev server startup | — | no files (server running on :3000) |

## What Was Built

Three client components and one server-rendered page completing the CURRIC-01 trainer UI:

**CurriculumTable** — fetches `GET /api/cohorts/{id}/curriculum` on mount, renders columns: Week #, Skill Name, Skill Slug, Topic Tags, Start Date, Actions. Accepts `refreshSignal` prop to re-fetch when a week is added. Loading, error, and empty states all handled.

**CurriculumWeekRow** — two-mode component. Display mode: renders data row with Edit and Delete buttons. Edit mode: row becomes inline inputs (number, text, text with slug auto-formatting, text, date). Save calls `PATCH /api/cohorts/{id}/curriculum/{weekId}`, Cancel reverts. Delete triggers `window.confirm` then `DELETE`. Inline error display on both modes.

**AddCurriculumWeekForm** — four-field inline form (weekNumber, skillName, skillSlug, topicTags, startDate). Auto-generates skillSlug from skillName (lowercase-kebab) but allows manual override. Client-side validation with per-field error messages. Posts to `POST /api/cohorts/{id}/curriculum` on submit, calls `onWeekAdded` callback on success, resets form.

**CurriculumManager** — thin client wrapper holding `refreshSignal` state, composing CurriculumTable + AddCurriculumWeekForm.

**Curriculum page** — server-rendered at `/trainer/cohorts/[id]/curriculum`. Reads cohort from Prisma for name, start/end dates, description. Renders breadcrumb nav (Trainer › Cohorts › {name} › Curriculum), page title in Clash Display, date range, then mounts CurriculumManager.

### DESIGN.md Tokens Used

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg` | `#F5F0E8` | trainer-shell background |
| `--accent` | `#C85A2E` | Save button, Edit button, Add Week button |
| `--accent-hover` | `#B04E27` | Button hover |
| `--danger` | `#B83B2E` | Delete button, error text |
| `--border` | `#DDD5C8` | Table rules, input borders |
| `--highlight` | `#FFF8F0` | Edit row background |
| Clash Display 600 | — | Page title, Add Week section header |
| DM Sans | — | Body, labels, button text |
| JetBrains Mono | — | skillSlug display, table header labels |

### Auth Coverage

`/trainer/cohorts/[id]/curriculum` is covered by the existing middleware matcher `/trainer/:path*` (confirmed in `src/middleware.ts`). No middleware changes needed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] CSS import path broken in worktree context**
- **Found during:** Task 2 build verification
- **Issue:** `CurriculumTable.tsx` imported trainer.css with relative path `'../../../app/trainer/trainer.css'` which resolved incorrectly when the component is in `src/components/trainer/`
- **Fix:** Changed to `@/app/trainer/trainer.css` (path alias)
- **Files modified:** `src/components/trainer/CurriculumTable.tsx`
- **Commit:** b9e0456

**2. [Rule 3 - Blocking] Turbopack build fails in git worktree**
- **Found during:** Task 2 build verification
- **Issue:** Turbopack can't find `next/package.json` from the worktree directory because `node_modules` lives in the main repo. `outputFileTracingRoot` doesn't help Turbopack package resolution.
- **Fix:** Verified build from main repo directory with files temporarily copied in — build passes green, route `/trainer/cohorts/[id]/curriculum` confirmed. Reverted `turbopack.root` attempt (it didn't fix the underlying node_modules issue and caused a panic). This is an infrastructure limitation of the git worktree setup for Next.js Turbopack.
- **Impact:** `npm run build` must be run from the main repo directory. `npx tsc --noEmit` works correctly from the worktree.

### checkpoint:human-verify (Task 4) — Auto-approved

Per execution instructions, `checkpoint:human-verify` is auto-approved in autonomous mode. Build is confirmed green with the new route rendering. Dev server running on http://localhost:3000. Trainer can navigate to `/trainer/cohorts/[id]/curriculum` after login.

## Known Stubs

None. All fields wire to live API endpoints. Empty state is explicit text, not placeholder data.

## Threat Flags

None. The new page route is under `/trainer/*` which requires trainer cookie auth via middleware. No new unauthenticated surface introduced.

## Self-Check

Files created:
- src/components/trainer/CurriculumTable.tsx — FOUND
- src/components/trainer/CurriculumWeekRow.tsx — FOUND
- src/components/trainer/AddCurriculumWeekForm.tsx — FOUND
- src/app/trainer/cohorts/[id]/curriculum/CurriculumManager.tsx — FOUND
- src/app/trainer/cohorts/[id]/curriculum/page.tsx — FOUND

Commits:
- fc52ae6 — Task 1 (CurriculumTable + CurriculumWeekRow)
- b9e0456 — Task 2 (AddCurriculumWeekForm + page + CurriculumManager)
