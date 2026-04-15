---
phase: 17-schema-prep-email-backfill
plan: 03
subsystem: trainer-ui
tags: [trainer, backfill, ui, design-tokens]
requirements: [BACKFILL-02]
dependency-graph:
  requires: [17-01]
  provides: [trainer-backfill-page]
  affects: [api/trainer/associates (consumer)]
tech-stack:
  added: []
  patterns: [client-component-auth-guard, inline-style-design-tokens]
key-files:
  created:
    - src/app/trainer/settings/associates/page.tsx
    - src/app/trainer/settings/associates/AssociatesBackfillTable.tsx
    - src/app/trainer/settings/associates/DryRunPreviewCard.tsx
    - src/app/trainer/settings/associates/types.ts
  modified: []
decisions:
  - Local types.ts file mirrors Plan 17-02 contract to allow independent type-check during parallel execution; can be removed and replaced with `@/lib/trainer-types` imports after 17-02 lands
  - Delete confirm lives inline in the table component (no modal library); backdrop click cancels, matches DESIGN motion rules (no decorative animation)
  - 409 email_taken renders the static string "Email already in use" — never echoes the submitted email, preventing enumeration via the UI
metrics:
  completed: 2026-04-15
---

# Phase 17 Plan 03: Trainer Backfill UI Summary

Trainer-facing `/trainer/settings/associates` page that consumes the BACKFILL API (Plan 17-02) so the trainer can attach emails to existing Associate rows and prune slug-only test rows before Phase 18 Supabase-auth cutover.

## What Was Built

- **Page route** `src/app/trainer/settings/associates/page.tsx` — client component, redirects to `/signin` when `!isAuthenticated`, renders `<DryRunPreviewCard />` + `<AssociatesBackfillTable />`.
- **DryRunPreviewCard** `src/app/trainer/settings/associates/DryRunPreviewCard.tsx` — fetches `/api/trainer/associates/preview` and displays four counts (total, with email, missing email, deletable) in a 4-cell flex row using `Clash Display` for values and `JetBrains Mono` uppercase labels.
- **AssociatesBackfillTable** `src/app/trainer/settings/associates/AssociatesBackfillTable.tsx` — grid-based table with columns: slug, name, email input + Save, sessions, cohort, actions. Each row owns local state (`emailDraft`, `saveStatus`, `errorMsg`). Delete button only renders when `sessionCount === 0`; otherwise a `has sessions` chip is shown. Confirmation modal with `rgba(0,0,0,0.5)` backdrop gates destructive action. Skeleton loading + empty + error states covered.
- **Local types** `src/app/trainer/settings/associates/types.ts` — mirrors `AssociateBackfillRow` and `BackfillPreview` contracts from Plan 17-02 so this wave can type-check independently.

## DESIGN Token Usage

Grep for `#[0-9a-fA-F]{3,6}` inside `src/app/trainer/settings/associates/` returns zero matches. Only raw color is `rgba(0,0,0,0.5)` for the modal backdrop, which is permitted. All surfaces, borders, text, and accents use:

- Backgrounds: `var(--bg)`, `var(--surface)`, `var(--surface-muted)`
- Text: `var(--ink)`, `var(--muted)`
- Accents: `var(--accent)`, `var(--danger)`, `var(--success)`
- Borders: `var(--border)`, `var(--border-subtle)`
- Fonts: `Clash Display` (headings + KPI values), `DM Sans` (body, input, buttons), `JetBrains Mono` (uppercase labels)

## Verification

- `npx tsc --noEmit` — passes (0 errors across project including new files)
- `npm run lint` on the three new files — 0 errors, 0 warnings (grep filter: no match for `src/app/trainer/settings/associates` in lint output)
- File existence — all four artifacts created
- Hex scan — 0 hex colors in new files

## API Contract Dependencies (from Plan 17-02)

The UI calls:

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/trainer/associates` | List rows for the table |
| GET | `/api/trainer/associates/preview` | Dry-run counts |
| PATCH | `/api/trainer/associates/[id]` | Save email (200 / 400 / 409 email_taken) |
| DELETE | `/api/trainer/associates/[id]` | Delete row (200 / 409 has_sessions) |

These routes ship in Plan 17-02 (parallel wave). UI gracefully handles 409 and generic failures. Once 17-02 lands and exports `AssociateBackfillRow` + `BackfillPreview` from `@/lib/trainer-types`, the local `types.ts` can be removed and imports rewritten to `@/lib/trainer-types`.

## Security / Threat Mitigations

- **T-17-13 Spoofing** — middleware already guards `/trainer/*`; client `useAuth()` redirect is UX, not the trust boundary
- **T-17-14 Tampering** — Delete is UI-hidden for `sessionCount > 0` AND the server re-checks (Plan 17-02). UI tampering cannot bypass
- **T-17-15 Info Disclosure (email collision)** — inline error is the static string `Email already in use`. The submitted email value is never rendered in the error region; the user's own input remains untouched in its field for editing

## Deviations from Plan

**1. Introduced `types.ts` local to the folder** (not listed in `files_modified`)
- **Reason:** Parallel execution — Plan 17-02 owns `src/lib/trainer-types.ts` and I cannot touch it. To type-check independently, I defined the two contract types locally with a clear comment instructing removal after 17-02 lands.
- **Impact:** One extra file (~22 lines). Zero runtime cost. Integrator just swaps the import path.

Otherwise plan executed exactly as written.

## Commits

| Task | Hash | Message |
|---|---|---|
| 1 | 6d89682 | feat(17-03): add trainer backfill page route + dry-run preview card |
| 2 | 92e8b13 | feat(17-03): add AssociatesBackfillTable with inline email edit + delete confirm |

## Manual Smoke-Test (pending API landing)

Once Plan 17-02 API routes exist, verification flow:
1. Login as trainer → visit `/trainer/settings/associates` → table populates, preview card shows counts
2. Edit an email to an in-use value → click Save → inline `Email already in use` appears (submitted value NOT echoed)
3. Edit an email to a fresh value → click Save → `Saved` state for 2s, row `email` field updates
4. Row with `sessionCount === 0` → Delete button present; click → modal → Confirm → row disappears
5. Row with `sessionCount > 0` → no Delete button; `has sessions` chip present
6. Logout → visit same URL → redirected to `/signin` by middleware

## Self-Check: PASSED

- All 3 required files exist on disk
- Both commits (6d89682, 92e8b13) present in git log
- Zero hex colors in new files
- `npx tsc --noEmit` exits 0
- Lint clean for new files
