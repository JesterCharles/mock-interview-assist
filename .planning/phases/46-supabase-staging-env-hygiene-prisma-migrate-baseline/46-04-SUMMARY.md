---
phase: 46-supabase-staging-env-hygiene-prisma-migrate-baseline
plan: 04
subsystem: data/env-hygiene + auth-redirect + phase-gate
status: PARTIAL — code + runbook shipped, operator checkpoint HALTED per unattended mode
mode: unattended
requirements:
  - DATA-05
  - DATA-06
threats_mitigated:
  - T-46-03
  - T-46-07
  - T-46-08
tags: [env-hygiene, supabase-auth, runbook, phase-gate]
dependency_graph:
  requires:
    - 46-01 (STAGING_REF constant)
    - 46-02 (runbook Phases A-F)
    - 46-03 (verify-migrations.sh, runbook Phases G-I)
  provides:
    - docs/ENV-HYGIENE.md (developer-facing rule + dev loader)
    - scripts/verify-env-hygiene.ts (DATA-05 scanner)
    - scripts/verify-phase-46.sh (phase-gate aggregator)
    - docs/runbooks/phase-46-supabase-wipe.md Phase J (Auth redirect allowlist)
  affects:
    - Phase 47 (Cloud Run service deploy — reads Secret Manager secrets populated in Phase G)
    - Phase 48 (CI integration — will reuse verify-env-hygiene + migrate-status automation)
tech-stack:
  added: []
  patterns:
    - "Phase-gate aggregator pattern: one bash script with :? guards + numbered check output — same shape as scripts/verify-phase-45.sh"
    - "temp-dir + spawnSync fixture tests for filesystem-scanning scripts (no mocks needed)"
key-files:
  created:
    - docs/ENV-HYGIENE.md
    - scripts/verify-env-hygiene.ts
    - scripts/__tests__/verify-env-hygiene.test.ts
    - scripts/verify-phase-46.sh
  modified:
    - docs/runbooks/phase-46-supabase-wipe.md (appended Phase J)
    - package.json (verify-env-hygiene + verify-phase-46 script entries)
decisions:
  - "HALT on Task 5 operator execution: Supabase Management API PATCH requires human-held PAT + rotates prod Auth config (T-46-07 gate)."
  - "docs/ENV-HYGIENE.md placed at docs/ not repository root — aligns with existing docs/ directory (runbooks, DESIGN, PROJECT references)."
  - "verify-phase-46.sh is phase-gate only — does NOT wrap Phase 45's verify-phase-45.sh. They run independently, per-phase."
metrics:
  commits: 4
  tests_added: 6
  tests_passing: 6
  duration_wall_min: ~18
  deferred: 1 operator checkpoint (Phase J + phase-gate run)
completed_date: null  # not complete — operator checkpoint pending
halt_reason: "Supabase Management API PATCH + prod Auth config changes require human-held PAT (T-46-07)"
---

# Phase 46 Plan 04: Env Hygiene + Auth Redirect + Phase-Gate Summary (PARTIAL — HALT on operator checkpoint)

Code + docs + runbook Phase J shipped; operator execution of Phase J PATCH + phase-gate halted per unattended mode — requires Supabase PAT.

## Artifacts Shipped

**scripts/verify-env-hygiene.ts** (DATA-05 scanner):
- Scans 7 `.env*` variants for `PROD_SUPABASE_REF` substring.
- exit 0 clean; exit 1 with named violations; exit 2 unset env.
- Non-existent files skipped silently.

**scripts/__tests__/verify-env-hygiene.test.ts** — 6 green fixture cases:
- unset PROD_SUPABASE_REF → 2
- clean tempdir → 0
- `.env.local` with prod ref → 1 + named violation
- `.env.docker` with prod ref → 1 + named violation
- `.env.example` staging-only → 0
- multi-violation case (`.env.local` + `.env.docker` both contain prod ref) → 1 + both files named + count = 2

**docs/ENV-HYGIENE.md** (developer rule):
- 3 rules: `.env.local` = staging only; prod keys only in Secret Manager; pre-commit runs verify-env-hygiene.
- Copy-paste dev loader: heredoc + `gcloud secrets versions access` for 6 staging secrets.
- Ops escape hatch: per-command DATABASE_URL export (never overwrite `.env.local`) + mandatory `unset`.
- Phase 48 CI integration target documented.

**docs/runbooks/phase-46-supabase-wipe.md** — appended Phase J:
- J1/J3 PATCH `/v1/projects/${ref}/config/auth` for both envs, `uri_allow_list` as comma-separated STRING (Pitfall 5).
- J2/J4 GET + `jq` verify.
- Phase J assertion block: 4 grep lines prove staging contains staging+localhost, prod contains prod but NOT localhost/staging.
- Escalation: 401 → PAT scope (Pitfall 4), 400 → array vs string (Pitfall 5).
- End-of-runbook post-conditions + frontmatter transition note (`draft` → `phase-46-complete`).

**scripts/verify-phase-46.sh** (phase-gate aggregator):
- 6 numbered checks: env-hygiene, migrate-status × 2, uri_allow_list × 2, Secret Manager DATABASE_URL separation × 2.
- `:?` guards on 4 required env vars — fail-fast.
- Exits 0 only if all checks green; prints failure count.
- `chmod +x`; exposed via `npm run verify-phase-46`.

**package.json** — added `verify-env-hygiene` and `verify-phase-46` script entries.

## HALT Details (Task 5 — checkpoint:human-action)

Operator execution requires:
1. Supabase PAT with `all` scope (human-only; browser + 2FA).
2. Prod gcloud session (to read Secret Manager and run Phase I / phase-gate check 6).
3. One-time Auth redirect allowlist change on both Supabase projects — T-46-07 gate.
4. Final runbook frontmatter flip to `phase-46-complete`.

Code ready. Operator pastes phase-gate output ending in "ALL CHECKS GREEN" to close Phase 46.

## Deviations from Plan

None. Phase J was appended sequentially after Phases G/H/I shipped in Plan 03. All acceptance criteria met on first pass.

## Verification

- `npm run test -- scripts/__tests__/verify-env-hygiene.test.ts` → **6 passed**
- `npm run test` (full suite) → **1005 passed, 4 skipped** (zero regressions)
- `npx tsc --noEmit` → **0 errors**
- `test -x scripts/verify-phase-46.sh` → **executable**
- `grep -q "verify-env-hygiene" scripts/verify-phase-46.sh` → match
- `grep -q "verify-migrations" scripts/verify-phase-46.sh` → match
- `grep -q "uri_allow_list" scripts/verify-phase-46.sh` → match
- `grep -q "lzuqbpqmqlvzwebliptj" scripts/verify-phase-46.sh` → match
- `grep -q '"verify-phase-46"' package.json` → match
- `grep -q '"verify-env-hygiene"' package.json` → match
- Runbook Phase J verify block (7 grep checks) → **all match**
- `docs/ENV-HYGIENE.md` verify block (6 grep checks) → **all match**
- Phase-gate fail-fast check: `bash scripts/verify-phase-46.sh` with unset envs → exits non-zero with `:?` guard message

## Commits

| Hash    | Message                                                                     |
| ------- | --------------------------------------------------------------------------- |
| 75d74fb | feat(46-04): add verify-env-hygiene.ts + fixture tests + package scripts    |
| 022d799 | docs(46-04): add docs/ENV-HYGIENE.md — staging-only .env.local rule         |
| 3e384f3 | docs(46-04): append Phase J — Supabase Auth redirect allowlist via Mgmt API |
| 2f15781 | feat(46-04): add verify-phase-46.sh phase-gate aggregator                   |

## Self-Check: PASSED (for code artifacts)

- docs/ENV-HYGIENE.md → **FOUND**
- scripts/verify-env-hygiene.ts → **FOUND**
- scripts/__tests__/verify-env-hygiene.test.ts → **FOUND**
- scripts/verify-phase-46.sh → **FOUND** (executable)
- docs/runbooks/phase-46-supabase-wipe.md — Phase J present → **match**
- package.json — verify-env-hygiene + verify-phase-46 entries → **match**
- Commits 75d74fb, 022d799, 3e384f3, 2f15781 → **FOUND**

**Phase 46 Plan 04 operator checkpoint (Task 5) remains OPEN; tracking in 46-EXECUTE-LOG.md.**
