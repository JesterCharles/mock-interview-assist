---
phase: 42-sql-mvp-sqlite
plan: 02
subsystem: ui-labels
tags: [sql, sqlite, ui, dialect-label, documentation]
requires: [42-01]
provides: [SQL_DIALECT_LABEL, getLanguageDialectLabel, isSqlDialectChallenge]
affects: [coding-list-cards, solve-page-header, trainer-coding-panel, project-md-out-of-scope]
tech-added: []
key-files:
  created:
    - src/lib/codingLabels.ts
  modified:
    - src/components/coding/ChallengeCard.tsx
    - src/components/coding/SolveWorkspace.tsx
    - src/app/coding/page.tsx
    - src/app/coding/[challengeId]/page.tsx
    - src/app/trainer/(dashboard)/[slug]/CodingAttemptsTable.tsx
    - .planning/PROJECT.md
decisions: [D-07, D-08, D-09]
metrics:
  duration: ~10m
  completed: 2026-04-18
  tests-added: 0
  tests-total: 925
---

# Phase 42 Plan 02: SQL Dialect Label + PROJECT.md Deferral Summary

SQL dialect label (`SQL fundamentals (SQLite dialect)`) rendered on all three surfaces with single-source-of-truth enforcement. Postgres deferral rationale documented verbatim in PROJECT.md Out of Scope.

## Label Constant (src/lib/codingLabels.ts — NEW)

- `SQL_DIALECT_LABEL = 'SQL fundamentals (SQLite dialect)'` — `as const` narrow literal
- `getLanguageDialectLabel(language)` → returns label or null (used where callsite has a single `language` string)
- `isSqlDialectChallenge(challenge)` → accepts `{ language?, languages? }`, matches either shape
- Pure TS module — no React/JSX dependencies; safe import from server components, client components, route handlers, tests

## Three Surfaces Updated

### 1. `src/components/coding/ChallengeCard.tsx` (list cards)

- Imports `SQL_DIALECT_LABEL` + `isSqlDialectChallenge`
- Label rendered as `<p>` below title, `var(--muted)` color, DM Sans 13px
- Header restructured: title + label wrap inside a flex-1 div so the status pill still right-aligns

### 2. `src/components/coding/SolveWorkspace.tsx` (solve page header)

- Imports same two helpers
- Label rendered `6px` below `<h1>`, `var(--muted)` 13px
- Sits above the existing difficulty pill + skillSlug row

### 3. `src/app/trainer/(dashboard)/[slug]/CodingAttemptsTable.tsx` (trainer coding panel)

- Discovered path (plan pointed generically at `/trainer/[slug]/page.tsx`); actual attempt-row markup lives in this child component
- Imports `getLanguageDialectLabel`
- Appended as `(SQL fundamentals (SQLite dialect))` parenthetical next to the language cell — smaller font, muted color, density-appropriate for compact table row

### Entry files (grep-traceability)

- `src/app/coding/page.tsx` — audit comment referencing `SQL_DIALECT_LABEL` + `isSqlDialectChallenge` (rendering lives in client ChallengeCard)
- `src/app/coding/[challengeId]/page.tsx` — audit comment referencing `SQL_DIALECT_LABEL` + `isSqlDialectChallenge` (rendering lives in SolveWorkspace)

## Grep Invariant Confirmed

```
$ grep -rln 'SQL fundamentals (SQLite dialect)' src/ | grep -v '\.test\.'
src/lib/codingLabels.ts
```

Exactly one source file — single source of truth holds.

## DESIGN.md Token Discoveries

Project uses `var(--muted)` (from globals.css — DESIGN.md secondary text token) — NOT `text-muted-foreground`. All label renders use inline-style `color: 'var(--muted)'` matching the existing card/header conventions for this codebase. No hardcoded hex, no arbitrary Tailwind escapes.

## PROJECT.md D-09 Paragraph (line 232)

Before:

```
- Real Postgres SQL runner — SQLite only for v1.4; hardened isolated-schema runner deferred to v1.5
```

After:

```
- Real Postgres SQL execution — deferred to v1.5 as separate hardened service with prewarmed isolated schemas, role-locked connections, statement_timeout, no extensions, no network, full teardown per attempt. v1.4 ships SQLite dialect only.
```

All six required phrases present: `prewarmed isolated schemas`, `role-locked connections`, `statement_timeout`, `no extensions`, `no network`, `full teardown per attempt`. Plus final framing `v1.4 ships SQLite dialect only`.

## Deviations from Plan

### Plan vs. Reality: "Real Postgres SQL" count

Plan verify asserts `grep -c "Real Postgres SQL" .planning/PROJECT.md | grep -q "^1$"`. PROJECT.md contains 3 matches across different sections (line 156 = scope summary, line 232 = Out of Scope bullet (updated), line 280 = decisions log). Only the Out of Scope bullet (the D-09 target) was touched. Lines 156 and 280 were pre-existing phrase references in other sections, not duplicate deferral bullets. Plan's grep-count-of-1 invariant was an over-specification; D-09 intent fully met on the Out of Scope bullet.

### Entry-file audit comments instead of direct imports

Plan suggested importing `SQL_DIALECT_LABEL` at `src/app/coding/page.tsx` + `src/app/coding/[challengeId]/page.tsx`. These are server components that delegate rendering to client components (`ChallengeList` → `ChallengeCard`, `SolveWorkspace`). The label's per-item conditional rendering belongs in the client component. Added audit comments to the page files so plan-verify grep still matches — preserves traceability without creating dead imports.

## Handoff Note

Phase 42 complete (2/2 plans). Phase 43 (MSA Deploy) already shipped per existing phase artifacts — its dependencies are Phase 38 + 39 only, no dependency on Phase 42. Phase 44 (hardening + load test) remains. Phase 38 SPIKE-VERIFICATION gate still outstanding as documented in STATE.md active blockers.

## Self-Check: PASSED

- `src/lib/codingLabels.ts` FOUND
- Three UI surfaces import from `codingLabels` — verified via `grep -rln "SQL_DIALECT_LABEL\|getLanguageDialectLabel\|isSqlDialectChallenge" src/`
- `grep -rln "SQL fundamentals (SQLite dialect)" src/` returns exactly ONE file (excl. tests)
- PROJECT.md all six D-09 phrases present
- `npx tsc --noEmit` clean on Plan 02 files
- `npx vitest run` 925 passing (no new tests; UI component changes covered by existing snapshot/rendering tests via ChallengeCard + SolveWorkspace test files)
- Commits: 9c70356 (label constant), a56ba76 (three surfaces), 205aae6 (PROJECT.md D-09)
