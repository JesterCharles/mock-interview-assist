---
phase: 17-schema-prep-email-backfill
verified: 2026-04-15T18:35:00Z
status: human_needed
score: 6/6 must-haves verified (automated); 1 SC requires human confirmation for production-shape DB
overrides_applied: 0
re_verification:
  previous_status: none
  previous_score: n/a
human_verification:
  - test: "Run `npx prisma migrate deploy` against the actual production Supabase DB (not just local)"
    expected: "First run applies 0002_v12_email_authuser_variance; second run reports 'No pending migrations to apply'; columns Associate.email / authUserId / lastInvitedAt + Session.aiTrainerVariance exist as nullable on live data"
    why_human: "Requires production DATABASE_URL + operator approval; automated check only proves SQL idempotency pattern + local apply. Plan 17-01 SUMMARY reports this was exercised against 'production-shape Supabase DB' but cannot be re-verified from code alone."
  - test: "Smoke-test /trainer/settings/associates in a running dev server as a logged-in trainer"
    expected: "Table lists all associates with email fields; duplicate email → inline 'Email already in use'; row with 0 sessions shows Delete + confirm modal; row with sessions shows protected chip; preview card shows total/withEmail/withoutEmail/deletable counts"
    why_human: "Visual/interaction behavior + uses real DB; cannot be programmatically asserted. Unit+integration tests cover the contract; this confirms the composed UX."
  - test: "Cross-origin PATCH/DELETE via curl from a non-matching Origin header"
    expected: "403 {error:'cross-origin'} before auth check"
    why_human: "Requires live server; integration tests assert this at the handler level but production CSRF guard should be confirmed against running Next.js route."
---

# Phase 17: Schema Prep + Email Backfill Verification Report

**Phase Goal:** DB schema ready for Supabase identity linkage; existing Associate rows have trainer-curated emails (or are deleted) before auth cutover.
**Verified:** 2026-04-15T18:35:00Z
**Status:** human_needed (all automated checks PASS; production DB apply + live smoke-test require human)
**Re-verification:** No — initial verification

## Goal Achievement

### Success Criteria (from ROADMAP.md)

| # | Success Criterion | Status | Evidence |
|---|-------------------|--------|----------|
| 1 | `prisma migrate deploy` succeeds on production-shape DB and adds 4 nullable columns | ? HUMAN | Migration SQL correct + idempotent locally; Plan 17-01 SUMMARY reports prod-shape DB exercised (`d8c7554`, `a930f40`, `29eb7a1`). Live re-run requires operator. |
| 2 | Migration is idempotent (rerunnable without error) | ✓ VERIFIED | `prisma/migrations/0002_v12_email_authuser_variance/migration.sql` uses `ADD COLUMN IF NOT EXISTS` × 4 and `CREATE UNIQUE INDEX IF NOT EXISTS` × 2, zero DROP statements |
| 3 | Trainer at `/trainer/settings/associates` sees every Associate row with session count + email field | ✓ VERIFIED | `page.tsx`, `AssociatesBackfillTable.tsx` fetch `/api/trainer/associates`; list route returns `_count.sessions` + `email`; middleware guards `/trainer/:path*` |
| 4 | Trainer can save emails; uniqueness violations surface inline | ✓ VERIFIED | `[id]/route.ts:75-79` maps Prisma P2002 → 409 `{error:'email_taken', field:'email'}`; `AssociatesBackfillTable.tsx:74-81` renders static "Email already in use" |
| 5 | Trainer can one-click delete slug-only Associate with 0 sessions (confirm modal); rows with sessions protected | ✓ VERIFIED | `[id]/route.ts:110-117` re-queries `_count.sessions` server-side → 409 `has_sessions` when >0; UI gates Delete render on `row.sessionCount === 0` (`AssociatesBackfillTable.tsx:310`), confirm modal at line 376+ |
| 6 | Pre-cutover dry-run preview shows counts (withEmail / withoutEmail / orphaned) | ✓ VERIFIED | `preview/route.ts` returns `BackfillPreview`; `DryRunPreviewCard.tsx` fetches + renders four counts |

**Score:** 5/6 fully verified automated + 1 requires human confirmation for production-DB apply.

### Observable Truths (from PLAN frontmatter, deduplicated)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Schema exposes email/authUserId/lastInvitedAt/aiTrainerVariance as nullable | ✓ VERIFIED | `prisma/schema.prisma:28-30,60` |
| 2 | Migration idempotent | ✓ VERIFIED | SQL inspected; 6 × `IF NOT EXISTS`, 0 × `DROP` |
| 3 | Generated Prisma client exposes new optional fields | ✓ VERIFIED | `npx tsc --noEmit` exits 0 across routes that reference `a.email`, `a.authUserId`, `_count.sessions` |
| 4 | Trainer GET list with id/slug/email/sessionCount | ✓ VERIFIED | `associates/route.ts` maps `_count.sessions` + cohort |
| 5 | Trainer PATCH email; P2002 → 409 email_taken (no echo) | ✓ VERIFIED | Route code + integration test scenario #6 asserts body does not contain submitted email |
| 6 | Trainer DELETE only when sessionCount === 0 | ✓ VERIFIED | Server re-queries via `findUnique`; integration scenario #8 asserts `prisma.delete` never called when sessions>0 |
| 7 | Preview endpoint returns counts | ✓ VERIFIED | `preview/route.ts` + `backfill-preview-math.test.ts` (5 cases) |
| 8 | Cross-origin state-change blocked with 403 | ✓ VERIFIED | `checkOrigin()` in `[id]/route.ts:6-22`; integration tests scenarios #3 and #10 |
| 9 | UI renders Backfill table + preview card + delete confirm, uses DESIGN tokens | ✓ VERIFIED | `AssociatesBackfillTable.tsx` uses `var(--accent)`, `var(--danger)`, `var(--surface)`, `var(--border)`; confirm modal at line 483 with `aria-labelledby` |
| 10 | Non-trainer visitors redirected by middleware | ✓ VERIFIED | `src/middleware.ts:65` matches `/trainer/:path*` (covers `/trainer/settings/associates`); trainer-only check at line 42 |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `prisma/schema.prisma` | 4 new nullable fields | ✓ VERIFIED | Fields present at lines 28-30, 60 |
| `prisma/migrations/0002_v12_email_authuser_variance/migration.sql` | Idempotent DDL | ✓ VERIFIED | 16 lines, additive-only, IF NOT EXISTS guards |
| `src/lib/trainer-types.ts` | AssociateBackfillRow + BackfillPreview | ✓ VERIFIED | Exported at lines 66, 81 |
| `src/app/api/trainer/associates/route.ts` | GET list | ✓ VERIFIED | Trainer-gated, maps _count.sessions |
| `src/app/api/trainer/associates/[id]/route.ts` | PATCH + DELETE | ✓ VERIFIED | Origin check, P2002→409, server-side orphan guard |
| `src/app/api/trainer/associates/preview/route.ts` | GET preview counts | ✓ VERIFIED | Returns BackfillPreview |
| `src/app/trainer/settings/associates/page.tsx` | Page route | ✓ VERIFIED | `'use client'`, auth-guard, renders both subcomponents |
| `src/app/trainer/settings/associates/AssociatesBackfillTable.tsx` | Editable table w/ confirm modal | ✓ VERIFIED | fetch GET/PATCH/DELETE, modal, DESIGN tokens |
| `src/app/trainer/settings/associates/DryRunPreviewCard.tsx` | Preview card | ✓ VERIFIED | Fetches /api/trainer/associates/preview |
| `src/app/api/trainer/associates/__tests__/integration.test.ts` | End-to-end test suite | ✓ VERIFIED | 10 scenarios, passes |
| `src/lib/__tests__/backfill-preview-math.test.ts` | Pure-function preview math | ✓ VERIFIED | 5 cases, passes |

### Key Link Verification

| From | To | Via | Status |
|------|----|----|--------|
| `AssociatesBackfillTable.tsx` | `/api/trainer/associates` | fetch GET/PATCH/DELETE | ✓ WIRED (lines 30, 67, 116) |
| `DryRunPreviewCard.tsx` | `/api/trainer/associates/preview` | fetch GET | ✓ WIRED |
| `[id]/route.ts` | Prisma `associate.update/delete/findUnique` | with P2002/P2025 mapping | ✓ WIRED |
| `[id]/route.ts` | `getCallerIdentity` | trainer gate | ✓ WIRED |
| `page.tsx` | `src/middleware.ts` | `/trainer/:path*` guard | ✓ WIRED |
| `schema.prisma` | `migration.sql` | prisma migrate deploy | ✓ WIRED (columns match) |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `AssociatesBackfillTable.tsx` | `rows` | `prisma.associate.findMany` in `associates/route.ts` | Yes — real Prisma query | ✓ FLOWING |
| `DryRunPreviewCard.tsx` | `data` (BackfillPreview) | `prisma.associate.findMany` in `preview/route.ts` | Yes — real query, counts derived | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| TypeScript compiles | `npx tsc --noEmit` | exit 0, no output | ✓ PASS |
| Test suite passes | `npm run test` | 295 passed, 4 skipped, 0 failed | ✓ PASS (baseline 280 → 295, +15 as expected) |
| Migration file well-formed | grep IF NOT EXISTS count | 6 matches, 0 DROP | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| BACKFILL-01 | 17-01, 17-04 | Schema fields added (email, authUserId, lastInvitedAt, aiTrainerVariance) | ✓ SATISFIED | Schema + migration + type-check |
| BACKFILL-02 | 17-02, 17-03, 17-04 | Trainer backfill UI + API | ✓ SATISFIED | Routes + UI + 26+15 tests |

### Anti-Patterns Found

None. PII handling explicit: P2002 response never echoes submitted email (verified in integration test scenario #6). Error logs use only `(error as Error).message`.

### Human Verification Required

See frontmatter `human_verification` block. Three items:
1. Production-DB apply (SC#1 — only confirmable via operator run)
2. Live `/trainer/settings/associates` UX smoke-test
3. Curl-based cross-origin CSRF guard confirmation against live server

### Gaps Summary

No automated gaps. All 4 plans shipped artifacts; all key links wired; migration idempotent; tests green (295/295 non-skipped). The only outstanding verification is the operator-run production migration apply (plan SUMMARY reports it was done locally against a production-shape DB; re-running against live cannot be automated from the verifier).

---

_Verified: 2026-04-15T18:35:00Z_
_Verifier: Claude (gsd-verifier)_
