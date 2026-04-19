---
phase: 48
plan: 02
subsystem: ci-deploy
tags: [ci, github-actions, cloud-run, wif, deploy-staging, rollback, k6-skeleton]
dependency-graph:
  requires: [48-01, 47-wif-staging, 47-wif-prod, 45-secret-manager]
  provides: [deploy-staging-workflow, rollback-cloud-run-workflow, load-test-skeleton]
  affects: [merge-to-main, secret-manager-reads, artifact-registry-writes, cloud-run-deploys]
tech-stack:
  added: []
  patterns: [wif-oidc, docker-buildx-gha-cache, get-secretmanager-secrets, digest-pinning, workflow-dispatch-env-choice]
key-files:
  created:
    - .github/workflows/deploy-staging.yml
    - .github/workflows/rollback-prod.yml
    - .github/workflows/load-test.yml
    - .github/RUNBOOK-WORKFLOW-VARS.md
  deleted:
    - .github/workflows/wif-smoke.yml
decisions:
  - Deploy by digest from `steps.build.outputs.digest`; `:latest` never deployed (D-21)
  - `prisma migrate deploy` runs BEFORE `gcloud run deploy` with DIRECT_URL fetched from Secret Manager at runtime (D-19 + D-20)
  - Smoke check accepts HTTP 200 OR 503 per INFRA-07 Option C (Phase 47 D-24 precedent)
  - Rollback workflow is env-parameterized (`staging | prod` choice input) so one workflow serves both envs
  - Load-test workflow lands as a Phase 49 placeholder per D-05 scope boundary
  - `wif-smoke.yml` deleted per D-15 — WIF is now proven by real deploy + rollback workflows
metrics:
  completed-date: 2026-04-18
  duration-min: 3
  tasks-total: 4
  tasks-autonomous-completed: 3
  tasks-halted: 1
  commits: 3
---

# Phase 48 Plan 02: Deploy-Staging + Rollback + Load-Test Skeleton Summary

**One-liner:** Shipped `deploy-staging.yml` (WIF + Docker buildx cache + Secret-Manager-driven `prisma migrate deploy` + digest-pinned `gcloud run deploy` + health smoke), `rollback-prod.yml` (manual dispatch env choice + revision verify + traffic pin), and the `load-test.yml` Phase 49 shell; deleted the now-redundant `wif-smoke.yml`.

## What Shipped

### `.github/workflows/deploy-staging.yml` (139 lines)
Sequential 7-step job on every push to `main` (and `workflow_dispatch`):
1. Checkout + `google-github-actions/auth@v2` WIF (uses `vars.STAGING_PROJECT_NUMBER`; `id-token: write` permission)
2. `gcloud` setup + Artifact Registry docker auth
3. `docker/setup-buildx-action@v3` + `docker/build-push-action@v5` with `cache-from/to: type=gha` + `provenance: false`; tags `:latest` + `:${{ github.sha }}`
4. Digest non-empty guard
5. `google-github-actions/get-secretmanager-secrets@v2` → `DIRECT_URL` (masked in logs)
6. `setup-node@v4` + `npm ci` + `npx prisma migrate deploy` (DATABASE_URL=DIRECT_URL for advisory-lock pathway)
7. `gcloud run deploy nlm-staging --image=us-central1-docker.pkg.dev/.../nlm-app@<digest> --service-account=nlm-cloudrun-sa@...`
8. Health smoke: 6 retries × 10s backoff; accepts 200 or 503
9. Job summary with image digest + revision name + health URL

Concurrency: `deploy-staging` group, `cancel-in-progress: false` — serialize deploys.
Timeout: 15 min (CI-06 target is ≤5 min cache-warm).

### `.github/workflows/rollback-prod.yml` (94 lines)
Manual `workflow_dispatch` with typed `env` choice (`staging | prod`) + `revision` string input. Resolves project/service/SA/project-number from env input, authenticates via WIF, verifies revision exists, `gcloud run services update-traffic --to-revisions=<rev>=100`, confirms pinned revision matches.

### `.github/workflows/load-test.yml` (38 lines)
`workflow_dispatch` + `pull_request.types=[labeled]`; conditional job guard fires only on `run-load-test` label. Body is Phase 49 placeholder echo per D-05 scope boundary.

### `.github/workflows/wif-smoke.yml`
**DELETED** per D-15. WIF is now exercised end-to-end by `deploy-staging.yml` and `rollback-prod.yml` directly.

### `.github/RUNBOOK-WORKFLOW-VARS.md` (57 lines)
`gh variable set STAGING_PROJECT_NUMBER` / `PROD_PROJECT_NUMBER` command (values derived from `gcloud projects describe --format='value(projectNumber)'`). Variables not secrets (project numbers aren't sensitive).

## Commits

| # | Hash | Message |
|---|------|---------|
| 1 | `89b21f2` | feat(48-02): deploy-staging.yml — merge-to-main Cloud Run deploy via WIF |
| 2 | `4ed5e30` | feat(48-02): rollback-prod.yml + load-test.yml skeleton; drop wif-smoke.yml |
| 3 | `e24e9af` | docs(48-02): runbook for STAGING/PROD_PROJECT_NUMBER repo variables |

## Deviations from Plan

None. Plan executed exactly as written.

## Auth Gates / Human Checkpoints

**Task 4 (Verify deploy + rollback against staging) — HALTED per unattended mode rules.**

Per executor prompt: "DO NOT run `gh workflow run` against live WIF/infra (nothing deployed yet)." Deferred human steps (in order):

1. Resolve Phase 47 image-push gate (lazy-init `supabaseAdmin` or equivalent) so the first image lands in Artifact Registry.
2. Apply Phase 47 terraform so staging Cloud Run service + LB + DNS exist.
3. Run runbook: `gh variable set STAGING_PROJECT_NUMBER ... && gh variable set PROD_PROJECT_NUMBER ...`.
4. Push the Phase 48 commits to `main` (or `gh workflow run deploy-staging.yml`). Confirm WIF auth, digest emit, migrate "already up to date", `gcloud run deploy`, smoke 200/503 all within 5 min.
5. Capture a previous revision: `gcloud run revisions list --service=nlm-staging --project=nlm-staging-493715 --region=us-central1 --limit=2 --format='value(name)'`. Pick entry #2.
6. `gh workflow run rollback-prod.yml -f env=staging -f revision=<prev>` — confirm traffic pin matches.
7. Confirm `load-test.yml` appears in `gh workflow list` and `.github/workflows/wif-smoke.yml` is gone.

## Requirements Satisfied (code-level)

- **CI-02** — auto-deploy on merge to main via `deploy-staging.yml` (sequential build → migrate → deploy → smoke).
- **CI-05** — one-command rollback via `rollback-prod.yml` (env-parameterized).
- **CI-06** — cache infrastructure in place (Docker `type=gha` + npm cache); ≤5 min target deferred to live-run measurement.

## Threat Mitigations Verified (code-level)

| Threat | Mitigation |
|--------|-----------|
| T-48-02 (Schema/app drift) | `prisma migrate deploy` runs BEFORE `gcloud run deploy`; migrate failure short-circuits the deploy (D-20) |
| T-48-03 (Image digest drift) | Deploy pins `@${{ steps.build.outputs.digest }}`; digest non-empty guard fails fast (D-21) |
| T-48-04 (Long-lived SA key leak) | WIF only; `id-token: write` scoped per-job; no SA JSON keys in repo or GH secrets (D-03) |
| T-48-07 (Rollback to wrong env) | Typed `env` choice input; revision-exists check before traffic shift |
| T-48-08 (Secret leakage in logs) | `get-secretmanager-secrets@v2` auto-masks values; DATABASE_URL scoped to migrate step only; no `echo $DIRECT_URL` |

## Self-Check: PASSED

- Files exist:
  - `.github/workflows/deploy-staging.yml` — FOUND
  - `.github/workflows/rollback-prod.yml` — FOUND
  - `.github/workflows/load-test.yml` — FOUND
  - `.github/RUNBOOK-WORKFLOW-VARS.md` — FOUND
  - `.github/workflows/wif-smoke.yml` — GONE (as intended)
- Commits exist: `89b21f2`, `4ed5e30`, `e24e9af` — all FOUND
- YAML parses: all 3 new workflows — OK
- Key greps: `google-github-actions/auth@v2`, `id-token: write`, `get-secretmanager-secrets@v2`, `prisma migrate deploy`, `steps.build.outputs.digest`, `update-traffic`, choice `staging/prod`, Phase 49 placeholder — all present
