---
phase: 40-ui-mvp
plan: 01
subsystem: coding-ui
tags: [ui, coding, monaco, nav, scaffold]
requires:
  - Phase 39 (CODING-API-01..08 shipped)
  - Phase 37 (challenge loader shipped)
provides:
  - @monaco-editor/react dependency
  - CodingEditor wrapper (dynamic ssr:false)
  - resolveMonacoTheme helper
  - "Coding" nav entry for trainer + associate
  - /coding and /coding/[challengeId] route shells
affects:
  - src/components/shell/sidebar-configs.ts
  - src/middleware.ts (added /coding guard)
tech-stack:
  added:
    - "@monaco-editor/react"
  patterns:
    - "next/dynamic ssr:false for heavy client-only chunks"
    - "Role-aware shell branching in page server components"
key-files:
  created:
    - src/components/coding/MonacoEditor.tsx
    - src/components/coding/monaco-theme.ts
    - src/app/coding/page.tsx
    - src/app/coding/[challengeId]/page.tsx
  modified:
    - src/components/shell/sidebar-configs.ts
    - src/components/shell/sidebar-configs.test.ts
    - src/middleware.ts
    - package.json
    - package-lock.json
decisions:
  - "UI-SPEC gate auto-skipped (subagent cannot invoke /gsd-ui-phase). CONTEXT.md + DESIGN.md locked as design contract."
  - "Monaco built-ins (vs / vs-dark) for v1.4 — custom defineTheme deferred to v1.5."
  - "Middleware /coding/* guard added as defense-in-depth (Rule 2 auto-add)."
metrics:
  duration: "~3 min"
  completed: "2026-04-18"
---

# Phase 40 Plan 01: Monaco + Nav + Route Shells Summary

Phase-40 plumbing: @monaco-editor/react installed and wrapped behind a single dynamic wrapper (the only entry point for Monaco in the tree — regression-guarded in 40-04), Coding nav entries added for both trainer and associate roles, and server component route shells scaffolded for both /coding and /coding/[challengeId] with identity gate + role-aware shell branching.

## What shipped
- `@monaco-editor/react` installed (7 packages added; no peer warnings with React 19).
- `src/components/coding/MonacoEditor.tsx` — `CodingEditor` component, dynamic-imported with `ssr:false`, 80 lines.
- `src/components/coding/monaco-theme.ts` — `resolveMonacoTheme(mode)` → `'vs' | 'vs-dark'`.
- Sidebar configs updated: `Code2` icon from `lucide-react`, `href:'/coding'` in both `dashboardSidebarGroups` (Actions group after `New Mock`) and `associateSidebarGroups` (after `Interviews`).
- Route shells: `src/app/coding/page.tsx` + `src/app/coding/[challengeId]/page.tsx`. Both call `getCallerIdentity()`, redirect anonymous to `/signin`, branch to `AppShell` (trainer/admin) or `AssociateShell` (associate with cohort lookup), render DESIGN-token placeholder content.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] Added `/coding/*` middleware guard**
- Found during: Task 3 — noticed middleware didn't cover `/coding`
- Issue: Auth was page-level only; middleware should also enforce for defense in depth
- Fix: Added `/coding/*` to `config.matcher` + a STEP 3b any-authenticated-user branch
- Files modified: `src/middleware.ts`
- Commit: 67a886c

**2. [Rule 1 - Bug] Updated sidebar-configs.test.ts for new Actions count**
- Found during: Task 2 — adding Coding broke `actions.items).toHaveLength(3)` assertion
- Fix: Updated to 4 items, added explicit Coding href assertion, added cross-group coding-entry regression test
- Commit: 67a886c

### UI-SPEC Gate (Task 0)

- **Status:** Skipped (auto-approve per unattended instructions)
- **Reason:** Subagent cannot invoke `/gsd-ui-phase 40` (skills are interactive-shell)
- **Substitute contract:** `40-CONTEXT.md` (D-01..D-16) + `DESIGN.md`
- **Follow-up debt:** If v1.5 authoring varies significantly from CONTEXT, generate UI-SPEC then.

## Authentication gates
None — no user auth required for plumbing tasks.

## Monaco version

- `@monaco-editor/react@4.6.x` (latest stable; no React 19 peer warnings)

## Peer dependency warnings

- None beyond `npm audit` reporting 7 moderate advisories in transitive deps. Logged to `deferred-items.md` for Phase 44 hardening review.

## Self-Check: PASSED

- [x] `src/components/coding/MonacoEditor.tsx` FOUND
- [x] `src/components/coding/monaco-theme.ts` FOUND
- [x] `src/app/coding/page.tsx` FOUND
- [x] `src/app/coding/[challengeId]/page.tsx` FOUND
- [x] Commit `67a886c` FOUND
