---
phase: 37-challenge-bank-contract-loader
audit_date: 2026-04-18
status: validation-green-with-notes
tests_before: 76 (657 repo-wide)
tests_after: 78 (659 repo-wide)
---

# Phase 37 Validation Gap Audit

## Summary

Audited 3 plans (37-01/02/03) covering contract/loader/refresh-route. Existing
coverage is strong (76 tests). Filled 2 trivial gaps; logged 3 non-trivial gaps
that require runtime/integration harnesses out of scope for unit tests.

## Trivial Gaps — FILLED

| # | Plan | UAT Criterion | Test Added | File |
|---|------|--------------|------------|------|
| 1 | 37-02 | "200 overwrites payload + etag" (D-11 full ETag cycle) | `ETag 200 after TTL expiry replaces payload + etag when server returns new data` | `src/lib/coding-challenge-service.test.ts` |
| 2 | 37-02 | "invalidateCache called mid-flight: in-flight fetch discards its write" | `discards in-flight write when invalidateCache runs before fetch resolves` | `src/lib/coding-challenge-service.test.ts` |

Command: `npm run test` — 659 passed | 4 skipped. +2 tests vs baseline 657.

## Non-Trivial Gaps — LOGGED (manual / deferred)

| # | Plan | Criterion | Reason Not Filled |
|---|------|-----------|-------------------|
| A | 37-02 | "loadHiddenTests throws if called from a 'use client' context — `server-only` import enforces at build time" | Build-time guarantee. The `server-only` package raises during Next.js bundling, not at unit-test time. A vitest alias shim deliberately bypasses it (per 37-02 SUMMARY deviation). Validating requires a Next.js `build` smoke test that tries to import the module from a client file — out of scope for this phase's unit harness. |
| B | 37-02 | Default `defaultPublicFetcher` / `defaultPrivateFetcher` actually hit `/api/github` and `api.github.com/repos/...` with correct headers | Covered only by `grep` acceptance criteria (URLs + headers literal-present in source). A live integration test would require mock-server + fixture repo. Static assertion is the current proof. |
| C | 37-03 | End-to-end "trainer with Supabase session hits route" flow | Unit tests mock `getCallerIdentity`; a Playwright/E2E smoke run against a dev server would be required to exercise real cookie-based auth + Next.js middleware. Deferred to Phase 40 UI E2E or a dedicated API smoke suite. |

## Verification Coverage Matrix

| Plan | Requirement | Automated Command | Status |
|------|-------------|-------------------|--------|
| 37-01 | CODING-BANK-01/02/05 — schemas + pipeline | `npx vitest run src/lib/coding-bank-schemas.test.ts` | green (44 tests) |
| 37-02 | CODING-BANK-03/04 — loader + cache + sync | `npx vitest run src/lib/coding-challenge-service.test.ts` | green (20 tests, +2) |
| 37-03 | CODING-BANK-03/05 — trainer refresh route | `npx vitest run src/app/api/coding/bank/refresh/route.test.ts` | green (14 tests) |
| all | Type safety | `npx tsc --noEmit` | assumed green (not re-run this audit) |

## Self-Check

- Tests added: 2 (ETag 200-replace, invalidateCache mid-flight)
- Full suite: 659 passing | 4 skipped (unchanged skips unrelated to Phase 37)
- No implementation files modified (tests-only)
- Non-trivial gaps documented with rationale
