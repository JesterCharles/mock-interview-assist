# Phase 40: UI MVP — Discussion Log

> Audit trail only. Decisions captured in CONTEXT.md.

**Date:** 2026-04-18
**Mode:** `--auto`
**Areas:** Routing, list page, solve page, editor, polling/states, attempt history, design compliance

---

## Routing + Shell

| Option | Selected |
|--------|----------|
| Flat `src/app/coding/page.tsx` + `[challengeId]/page.tsx` | ✓ |
| Route group `(challenges)/coding/...` | Unnecessary |

## List Layout

| Option | Selected |
|--------|----------|
| Card grid with filter top bar, "Load more" pagination | ✓ (recommended) |
| Dense table | Rejected — mobile fails |
| Infinite scroll | Defer; Phase 4 precedent is pagination |

## Solve Page Layout

| Option | Selected |
|--------|----------|
| Two-column desktop, stacked mobile (prompt left, editor right) | ✓ (recommended) |
| Tabbed prompt/editor | Harder to reference while coding |

## Editor

| Option | Selected |
|--------|----------|
| Monaco via `@monaco-editor/react`, dynamic import | ✓ (industry standard) |
| CodeMirror | Lighter but less IDE-feel |
| Plain textarea | Rejected — UX |

## Run Button Behavior

| Option | Selected |
|--------|----------|
| Present but disabled with "Coming soon" tooltip | ✓ (preserves v1.5 upgrade surface) |
| Hide entirely | Layout shift later |
| Implement via `/api/coding/run` | Scope creep — v1.5 |

## Verdict Display

| Option | Selected |
|--------|----------|
| Verdict pill + visible test accordion + hidden pass count | ✓ (CODING-UI-03) |
| Raw JSON dump | Dev-only |

## Attempt History

| Option | Selected |
|--------|----------|
| Sidebar last-10 per-challenge-per-associate, click to view | ✓ (CODING-UI-04) |
| Modal | More clicks |
| No history | Rejected — UX |

## Design Compliance

| Option | Selected |
|--------|----------|
| `/gsd-ui-phase 40` gates plan; DESIGN tokens only | ✓ (mandatory) |

## Claude's Discretion

- Monaco theme pairing
- Skill pill reuse from Phase 29
