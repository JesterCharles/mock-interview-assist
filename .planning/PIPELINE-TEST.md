# PIPELINE-TEST — v1.3 Gap Closure

**Branch:** `v1.3-gap-closure`
**Run:** 2026-04-17 20:04-20:08 UTC
**Mode:** Unattended

---

## Ship Gate Decision: **PASS**

All required steps pass. Zero new lint errors in hand-written source. Build compiles clean. E2E tests present but not executed (require separate dev server).

---

## Step-by-Step Results

### 1. `npm run test` — PASS

```
Test Files  55 passed | 1 skipped (56)
Tests       505 passed | 4 skipped (509)
Duration    1.51s
```

Expectation of 505+ passing: **MET** (505 passing).

### 2. `npm run lint` — PASS (no new errors in source)

```
3278 problems (516 errors, 2762 warnings)
```

**Baseline comparison (commit `c6889b6`, pre-P33-35):** 505 errors.
**HEAD delta:** +11 errors, all isolated to `src/generated/prisma/index.d.ts`.

**Root cause:** Phase 34 added `GapScore.prevWeightedScore` column to `prisma/schema.prisma`, which regenerated the Prisma client. New errors are entirely in generated code.

**New errors in hand-written source:** **ZERO**.

Per-file error diff (baseline → HEAD):
```
src/generated/prisma/index.d.ts: 140 → 151  (+11, generated)
```

All other files (app code, components, lib, tests) have identical error counts to baseline.

### 3. `npx tsc --noEmit` — PASS

Clean exit, no output, no errors.

### 4. `npm run build` — PASS

- Compiled successfully in 5.2s (Turbopack)
- 62 static pages generated
- Middleware compiles as Proxy (Next 16 deprecation warning noted, not a failure)
- Build output sizes:
  - `.next/` total: **1.2 GB**
  - `.next/standalone/`: **323 MB** (Docker deploy artifact)
  - `.next/static/`: **5.5 MB**
- Known Turbopack warning: NFT trace in `src/app/api/load-markdown/route.ts` (unchanged from baseline, not P33-35 related)
- Next 16 does not emit per-route "First Load JS" kB table in this output format

### 5. E2E tests — PRESENT, NOT RUN

Playwright config: `/Users/jestercharles/mock-interview-assist/playwright.config.ts`

E2E specs found in `tests/e2e/`:
- `setup-wizard-curriculum.spec.ts`
- `appshell-sidebar.spec.ts`
- `signin-auth.spec.ts`
- `fixtures/seed-curriculum.ts`

**Status: SKIPPED.** Config requires dev server running separately (`webServer` intentionally unconfigured per comment in `playwright.config.ts`). No dev server active in unattended pipeline context. E2E run deferred to manual QA or staged with a dev server in future CI.

### 6. Spot-check Key Changes — ALL PASS

| File | Expected | Actual | Status |
|------|----------|--------|--------|
| `src/app/api/auth/exchange/route.test.ts` | 14 tests pass | 14 passed | PASS |
| `src/app/signin/SignInTabs.test.tsx` | 6 tests pass | 6 passed | PASS |
| `src/lib/__tests__/gapPersistence.test.ts` | 5+ tests pass | 5 passed | PASS |
| `src/components/associate/__tests__/SkillRadar.test.tsx` | 4 tests pass | 4 passed | PASS |
| `src/components/shell/AssociateShell.test.ts` | 7 tests pass | 7 passed | PASS |

Combined spot-check: **36/36 passing**.

---

## P33-35 Source Files Changed (non-generated, non-docs)

- `prisma/schema.prisma` + `prisma/migrations/20260418000000_add_gapscore_prev_score/migration.sql`
- `src/app/api/auth/exchange/route.ts` (P33: trainer first-login gate)
- `src/app/api/trainer/[slug]/route.ts` (P34: prevWeightedScore propagation)
- `src/app/associate/[slug]/dashboard/AssociateDashboardClient.tsx`
- `src/app/associate/[slug]/dashboard/page.tsx`
- `src/app/signin/SignInTabs.tsx` (P33)
- `src/components/associate/SkillRadar.tsx` (P34: real prior polygon)
- `src/components/shell/AssociateShell.tsx` (P35: accordion + profile modal)
- `src/components/shell/sidebar-configs.ts` (P35: cleanup)
- `src/lib/gapPersistence.ts` (P34: capture prior weightedScore)
- `src/lib/trainer-types.ts` (P34: GapScoreEntry.prevWeightedScore)

---

## Summary

| Step | Status | Notes |
|------|--------|-------|
| test | PASS | 505/509 passing (4 pre-existing skips) |
| lint | PASS | +11 errors, all in generated Prisma client from schema change — zero in source |
| tsc  | PASS | Clean |
| build | PASS | 5.2s compile, 62 static pages, standalone 323 MB |
| e2e | SKIPPED | Config requires dev server; 3 specs present |
| spot-checks | PASS | 36/36 passing across 5 files |

**Ship gate: PASS.** Ready for review/merge pending Codex adversarial review and manual E2E pass if required.
