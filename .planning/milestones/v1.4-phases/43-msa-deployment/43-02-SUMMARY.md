---
phase: 43-msa-deployment
plan: 02
subsystem: ci-cd
tags: [github-actions, deploy, rollback, health-check]
dependency-graph:
  requires: [plan 43-01 Terraform outputs (VM names/zones), Phase 39 /api/health route]
  provides: [tag-driven deploy workflows, automated rollback pattern]
  affects: [runbook deploy procedure (plan 43-04), v1.4 tag strategy]
tech-stack:
  added: [google-github-actions/auth@v2, google-github-actions/setup-gcloud@v2]
  patterns: [concurrency group serialized deploys, health-check-with-retry, SSH-based rollback via prev-image capture]
key-files:
  created:
    - .github/workflows/pr-checks.yml
    - .github/workflows/deploy-app.yml
    - .github/workflows/deploy-judge0.yml
  modified: []
decisions:
  - Tag convention app-v<SEMVER> / judge0-v<VERSION> (strip prefix for image tag)
  - cancel-in-progress=false on deploy workflows — never interrupt mid-deploy
  - 5x retry with 10s (app) / 15s (judge0) backoff for health checks
  - Rollback captures prev image via docker inspect BEFORE new deploy; stored in step output
metrics:
  duration: ~10 min
  completed: 2026-04-18
---

# Phase 43 Plan 02: Tag-Driven Deploy Workflows Summary

One-liner: Three GitHub Actions workflows — PR checks gate merges; `app-v*`
and `judge0-v*` tag pushes trigger SSH-based deploys with health-check
auto-rollback on `/api/health` or `/system_info` failure.

## What Shipped

### pr-checks.yml
Runs on pull_request + push to main. Concurrency-grouped per ref with
cancel-in-progress=true. Steps: setup-node 22 → `npm ci` → `prisma generate`
→ `tsc --noEmit` → `npm run lint` → `npm run test -- --run` → `npm run build`
with dummy env values. No deploy secrets.

### deploy-app.yml
Triggers on `app-v*` tag. Flow:
1. Strip `app-v` prefix → image tag.
2. Auth via `GCP_SA_KEY`, configure Docker for GCR.
3. Build + push `gcr.io/$PROJECT/app:$TAG` and `:latest`.
4. SSH to app VM, capture current running image for rollback (`docker
   inspect --format='{{index .Config.Image}}' interview-assistant`).
5. `docker pull` + `docker tag` + `docker compose up -d --no-deps
   interview-assistant`.
6. Health probe `/api/health` — 5× × 10s backoff.
7. On health fail: rollback step (`if: failure() && steps.health.outputs.health == 'fail'`)
   SSH-pulls prev image, retags to `:latest`, redeploys, fails workflow.

### deploy-judge0.yml
Triggers on `judge0-v*` tag. Flow:
1. Strip `judge0-v` prefix → Judge0 version.
2. Auth via `GCP_SA_KEY`.
3. SSH to Judge0 VM, backup `~/judge0/.env` → `.env.rollback`, record prev
   `JUDGE0_IMAGE_TAG`.
4. `sed -i` update `.env` `JUDGE0_IMAGE_TAG=<new>`, `docker compose pull`,
   `up -d`.
5. Health probe `/system_info` with `X-Auth-Token` — 5× × 15s backoff (Judge0
   stack takes longer than app).
6. On health fail: restore `.env.rollback`, `compose pull && up -d`, fail
   workflow.

## Required GitHub Actions Secrets

| Secret | Purpose |
|--------|---------|
| `GCP_SA_KEY` | service account JSON (storage.admin + compute.instanceAdmin) |
| `GCP_PROJECT_ID` | GCP project id |
| `APP_VM_NAME`, `APP_VM_ZONE`, `APP_VM_SSH_KEY` | app deploy target |
| `JUDGE0_VM_NAME`, `JUDGE0_VM_ZONE`, `JUDGE0_VM_SSH_KEY` | Judge0 deploy target |
| `JUDGE0_AUTH_TOKEN` | X-Auth-Token for `/system_info` probe |

Setup instructions live in `docs/runbooks/coding-stack.md` Appendix A.

## Judge0 Compose Structure Assumption

Workflow assumes `~/judge0/docker-compose.yml` on the Judge0 VM references
the image via `${JUDGE0_IMAGE_TAG}` env var sourced from `~/judge0/.env`.
If Phase 38 adopted a different shape (e.g. hard-coded tag in
docker-compose.yml), the `sed` command in "Update Judge0 image tag" step
must be adapted. Verify during DEPLOY-CHECKPOINT Step 7 bootstrap.

## Verification

- `js-yaml` parses all three workflow files cleanly
- All must_haves greps PASS (pull_request/app-v/judge0-v triggers;
  `/api/health`, `/system_info`, rollback blocks, prev_image/prev_version
  capture, X-Auth-Token header)

## Deviations from Plan

None — plan executed as written.

## Branch Protection

Branch protection on `main` is recommended (Settings → Branches → Protect →
Require status check `checks` before merge) but must be configured manually
— GitHub does not expose branch protection via workflow files.

## Self-Check: PASSED

- `.github/workflows/pr-checks.yml`: FOUND
- `.github/workflows/deploy-app.yml`: FOUND
- `.github/workflows/deploy-judge0.yml`: FOUND
- Commit bc3ea31: FOUND on main
