---
phase: 20
slug: middleware-cutover-rls
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-16
---

# Phase 20 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npm run test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 20-01-01 | 01 | 1 | AUTH-10 | T-20-01 | RLS blocks anon reads on Session | manual | SQL query via supabase-js | N/A | ⬜ pending |
| 20-01-02 | 01 | 1 | AUTH-10 | T-20-02 | RLS blocks anon reads on GapScore | manual | SQL query via supabase-js | N/A | ⬜ pending |
| 20-01-03 | 01 | 1 | AUTH-10 | — | is_trainer() returns correct role | manual | SQL function call | N/A | ⬜ pending |
| 20-02-01 | 02 | 1 | AUTH-09 | — | All route handlers filter by identity | unit | `npm run test` (regression) | ✅ | ⬜ pending |
| 20-02-02 | 02 | 1 | AUTH-10 | — | PROJECT.md documents BYPASSRLS | manual | File read | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements. No new test files needed — RLS verification is manual SQL.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| RLS blocks anon supabase-js reads | AUTH-10 | Requires live Supabase with anon key | Run SELECT via supabase-js client with anon key, verify empty result |
| is_trainer() function works | AUTH-10 | SQL function in Supabase | Call function via SQL editor, verify role check |
| Migration deploys cleanly | AUTH-10 | Requires database access | Run `prisma migrate deploy`, verify no errors |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
