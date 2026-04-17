---
phase: 29-associate-data-visualization
plan: "01"
subsystem: associate-dashboard
tags: [visualization, components, css-tokens, tdd]
dependency_graph:
  requires: []
  provides: [vizUtils, SkillCardList, FocusHero, mastery-token]
  affects: [associate-dashboard, phase-29-plans-02-03]
tech_stack:
  added: []
  patterns: [css-var-tokens, tdd-red-green, grid-template-rows-animation]
key_files:
  created:
    - src/lib/vizUtils.ts
    - src/lib/vizUtils.test.ts
    - src/components/associate/SkillCardList.tsx
    - src/components/associate/FocusHero.tsx
  modified:
    - src/app/globals.css
decisions:
  - computeSkillTrend uses overall session technical scores as proxy for per-skill trend (per-session per-skill scores not stored individually in GapScore aggregate)
  - SkillCardList uses CSS grid-template-rows 0fr→1fr for topic expand animation (200ms ease-out)
  - getScoreColor clamps input and guards NaN per T-29-01 threat mitigation
metrics:
  duration: "~12 minutes"
  completed: "2026-04-16"
  tasks_completed: 3
  tasks_total: 3
  files_created: 4
  files_modified: 1
---

# Phase 29 Plan 01: Viz Utilities and Left-Column Components Summary

**One-liner:** Pure viz utility module (5-band score coloring, trajectory language, trend computation) plus expandable SkillCardList and FocusHero components wired to CSS var() tokens.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add --mastery token and vizUtils with tests | 4c201bf | globals.css, vizUtils.ts, vizUtils.test.ts |
| 2 | Build SkillCardList component | d40ed64 | SkillCardList.tsx |
| 3 | Build FocusHero component | 8def03b | FocusHero.tsx |

## What Was Built

**vizUtils.ts** — Shared pure-function utility module:
- `getScoreColor(percent)` — 5-band color mapping to CSS var() tokens, clamped with NaN guard (T-29-01)
- `getTrendDirection(slope)` — up/down/flat classification
- `getTrajectoryWord(slope)` — ascending/climbing/holding/dipping/stalling vocabulary
- `getTrajectoryNarrative(slope, delta, count)` — "Improving +8pts over 3 sessions" format
- `computeSkillTrend(sessions, skill, gapScores)` — linear regression slope over session history

**globals.css** additions:
- `--mastery: #2B6CB0` (light) / `#4A90C4` (dark) for 90-100% score band
- `--color-mastery: var(--mastery)` in @theme inline block

**SkillCardList.tsx** — Expandable skill card list:
- Sorted strongest-first (D-02)
- Collapsed: name + horizontal fill bar + score % + trend arrow
- Trend arrows: TrendingUp/TrendingDown/Minus lucide icons colored green/red/muted (D-04)
- Click row = select skill filter toggle + expand card (D-03)
- Selected state: accent border + padding adjustment to prevent layout shift (D-10)
- Expanded: topic breakdown bars with same 5-band coloring (D-16)
- Animate via CSS `grid-template-rows: 0fr → 1fr` (200ms ease-out)

**FocusHero.tsx** — Focus area hero card:
- Always visible, no dismiss (D-06)
- Skill name (Clash Display 22px 600) + trajectory narrative (DM Sans 14px) + score (Clash Display 28px 700)
- "Focus Area" label in JetBrains Mono 11px uppercase
- Empty state when skillName is null
- Insufficient data state when sessionCount < 3

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

**Note on computeSkillTrend design:** The plan acknowledged that per-session per-skill scores aren't stored individually in GapScore (it's an aggregate), and provided the simplest correct approach: use overall session technical scores as a trajectory proxy. Implemented exactly as specified.

## Known Stubs

None — all components are fully wired to their utility functions. Integration into the dashboard page.tsx is intentionally deferred to Plan 03 (which rewires the dashboard layout).

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes introduced. The score input clamping in `getScoreColor` mitigates T-29-01 (tampering via out-of-range weightedScore from Prisma).

## Self-Check: PASSED

Files exist:
- src/lib/vizUtils.ts: FOUND
- src/lib/vizUtils.test.ts: FOUND
- src/components/associate/SkillCardList.tsx: FOUND
- src/components/associate/FocusHero.tsx: FOUND
- src/app/globals.css contains --mastery: FOUND

Commits exist:
- 4c201bf (vizUtils + mastery token): FOUND
- d40ed64 (SkillCardList): FOUND
- 8def03b (FocusHero): FOUND

Tests: 25/25 passing
TypeScript: 0 errors
