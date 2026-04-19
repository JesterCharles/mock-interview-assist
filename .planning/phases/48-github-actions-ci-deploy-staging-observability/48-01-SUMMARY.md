---
phase: 48
plan: 01
subsystem: ci-gating
tags: [ci, github-actions, pr-checks, branch-protection]
dependency-graph:
  requires: []
  provides: [pr-gating-workflow, branch-protection-runbook]
  affects: [merge-to-main]
tech-stack:
  added: []
  patterns: [github-actions-parallel-jobs, npm-cache, concurrency-cancel-in-progress]
key-files:
  created:
    - .github/RUNBOOK-BRANCH-PROTECTION.md
  modified:
    - .github/workflows/pr-checks.yml
decisions:
  - Replaced existing single-job `checks` workflow with 4 parallel jobs (typecheck/lint/test/prisma-format) per D-01 + D-06
  - Removed build step from PR checks (moved to deploy-staging.yml per plan scope boundary)
  - `enforce_admins=false` for solo-dev hotfix path
  - `permissions: contents: read` only (T-48-04 least privilege)
metrics:
  completed-date: 2026-04-18
  duration-min: 2
  tasks-total: 3
  tasks-autonomous-completed: 2
  tasks-halted: 1
  commits: 2
---

# Phase 48 Plan 01: PR-Checks Workflow + Branch Protection Runbook Summary

**One-liner:** Replaced the legacy single-job `pr-checks.yml` with a 4-parallel-job gate (typecheck/lint/test/prisma-format) and shipped a `gh`-CLI runbook for enabling required-status-checks branch protection on `main`.

## What Shipped

### `.github/workflows/pr-checks.yml` (53 lines, rewrite of 57-line original)
- 4 parallel jobs each run `actions/checkout@v4` + `actions/setup-node@v4` with `cache: 'npm'`:
  - **Typecheck** — `npm ci && npx prisma generate && npx tsc --noEmit` (timeout 10m)
  - **Lint** — `npm ci && npm run lint` (timeout 10m)
  - **Unit Tests** — `npm ci && npx prisma generate && npm run test` (timeout 15m)
  - **Prisma Schema Format** — `npm ci && npx prisma format && git diff --exit-code prisma/schema.prisma` (timeout 5m)
- `concurrency: pr-checks-${{ github.ref }}` with `cancel-in-progress: true` — supersedes on new commits
- Triggers: `pull_request.branches=[main]` + `push.branches=[main]`
- `permissions: contents: read` (no write token issued; T-48-04 scoped)
- Build step intentionally dropped (too slow for PR gating; lives in deploy-staging.yml)

### `.github/RUNBOOK-BRANCH-PROTECTION.md` (57 lines)
- `gh api -X PUT .../branches/main/protection` command with all 4 required context names
- UI fallback via Settings → Branches → Protection rule
- Verification query: `gh api ... --jq '.required_status_checks.contexts'`
- Rollback: `gh api -X DELETE .../branches/main/protection`

## Commits

| # | Hash | Message |
|---|------|---------|
| 1 | `d0ab4b5` | feat(48-01): pr-checks.yml with 4 parallel gate jobs |
| 2 | `1c1769b` | docs(48-01): branch protection runbook for required checks |

## Deviations from Plan

None. Plan executed exactly as written.

## Auth Gates / Human Checkpoints

**Task 3 (Verify pr-checks.yml gates merge) — HALTED per unattended mode rules.**

Per executor prompt: "DO NOT toggle GitHub branch protection (Plan 48-01 Task gate) — write the runbook + document the manual step." Runbook committed at `.github/RUNBOOK-BRANCH-PROTECTION.md`; human operator must:

1. Merge this branch to expose the new `pr-checks.yml` to GitHub's workflow registry.
2. Open a scratch PR that fails on purpose (e.g., `const x: number = 'bad'`) — confirm Typecheck job fails and PR shows red check.
3. Run the `gh api` command from the runbook.
4. Verify `gh api repos/JesterCharles/mock-interview-assist/branches/main/protection --jq '.required_status_checks.contexts'` returns all 4 names.

## Requirements Satisfied

- **CI-01** — PR gate workflow runs 4 parallel automated checks on every pull request to `main` (plus `push` to main as a belt-and-suspenders after branch protection blocks the PR path).

## Threat Mitigations Verified (code-level)

| Threat | Mitigation |
|--------|-----------|
| T-48-01 (Tampering via PR that bypasses required check) | Runbook committed; enforcement requires one manual `gh api` PUT post-first-run |
| T-48-01a (EoP via `pull_request_target`) | Workflow uses `pull_request` only — no secrets leak to forks |
| T-48-04 (Info disclosure via over-scoped token) | `permissions: contents: read` declared at workflow level |

## Self-Check: PASSED

- Files exist:
  - `.github/workflows/pr-checks.yml` — FOUND
  - `.github/RUNBOOK-BRANCH-PROTECTION.md` — FOUND
- Commits exist:
  - `d0ab4b5` — FOUND (feat(48-01): pr-checks.yml)
  - `1c1769b` — FOUND (docs(48-01): runbook)
- YAML parses: `js-yaml .github/workflows/pr-checks.yml` — OK
- Grep checks: `npx tsc --noEmit`, `npm run lint`, `npm run test`, `git diff --exit-code prisma/schema.prisma`, `cache: 'npm'` × 4 — all present
