---
phase: 36
slug: data-model-schema
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-18
---

# Phase 36 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.4 |
| **Config file** | `vitest.config.ts` (globals, node env) |
| **Quick run command** | `npm run test -- codingSignalService` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~30 seconds full suite, ~200ms codingSignalService only |

Migration smoke validation (manual, not Vitest):
- `npx prisma validate` — schema syntax
- `npx prisma generate` — client generation succeeds
- `DATABASE_URL=<ephemeral> npx prisma migrate deploy` × 2 — idempotence smoke

---

## Sampling Rate

- **After every task commit:** Run `npm run test -- codingSignalService` + `npx prisma validate`
- **After every plan wave:** Run `npm run test` + `npx tsc --noEmit` + `npx prisma generate`
- **Before `/gsd-verify-work`:** Full suite green + migration-idempotence smoke passes on throwaway Postgres
- **Max feedback latency:** ~30 seconds (full suite)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 36-01-XX | 01 | 1 | CODING-MODEL-01..04 | T-36-01 hidden-test isolation | Schema compiles; `isHidden` column exists; `@unique` on `CodingSkillSignal.attemptId` | build | `npx prisma validate && npx prisma generate` | ✅ existing | ⬜ pending |
| 36-02-XX | 02 | 1 | CODING-MODEL-05 | T-36-02 FK-guard retry safety | Migration re-run is no-op | smoke | `DATABASE_URL=<ephemeral> npx prisma migrate deploy` × 2 | ❌ W0 (hand-written SQL) | ⬜ pending |
| 36-03-XX | 03 | 2 | CODING-MODEL-06 | T-36-03 signal-tampering boundary | Service throws on invalid input (not filters) | unit | `npm run test -- codingSignalService.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/codingSignalService.ts` — pure-function signal→score mapper
- [ ] `src/lib/__tests__/codingSignalService.test.ts` — covers CODING-MODEL-06 (all 5 signal types + edge cases, ~12-15 tests)
- [ ] `prisma/migrations/0006_coding_challenges/migration.sql` — hand-written idempotent SQL
- [ ] `prisma/schema.prisma` — 4 new models + back-relations on `Cohort`/`Associate`

No new framework install — Vitest + Prisma CLI already present.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Migration idempotence on real Postgres | CODING-MODEL-05 | Vitest doesn't boot Postgres containers | `docker run --rm -d -p 5433:5432 -e POSTGRES_PASSWORD=t postgres:15; DATABASE_URL="postgresql://postgres:t@localhost:5433/postgres" npx prisma migrate deploy` — run twice, second run must succeed with zero DDL output |
| Generated client exports new types | CODING-MODEL-01..04 | Type check asserts via build only | Write `import { CodingAttempt } from '@/generated/prisma'` in a scratch file + `npx tsc --noEmit`; verify types present |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
