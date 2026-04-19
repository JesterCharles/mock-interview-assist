---
phase: 51-prod-cloud-run-deploy-prod-pipeline-dns-records
plan: 03
subsystem: ci
tags: [github-actions, wif, cloud-run, deploy, prod, tag-trigger, unattended-halt-pre-live-run]
dependency-graph:
  requires: [48 deploy-staging.yml pattern, 47 D-14 prod WIF pool, 45 prod Artifact Registry, 45 prod secrets]
  provides: [.github/workflows/deploy-prod.yml]
  affects: [51-04 verify-phase-51.sh (MH4/MH5), 52 cutover (uses this pipeline for post-cutover deploys)]
tech-stack:
  added: []
  patterns: [tag-only trigger (on.push.tags), WIF auth (id-token:write + google-github-actions/auth@v2), concurrency.group serialization, secrets fetch via get-secretmanager-secrets@v2, deploy-by-digest via deploy-cloudrun or gcloud run deploy]
key-files:
  created:
    - .github/workflows/deploy-prod.yml
  modified: []
decisions:
  - Added `workflow_dispatch: {}` alongside `push.tags` — matches staging pattern; allows manual reruns without re-tagging.
  - Used `gcloud run deploy` (bash) rather than `google-github-actions/deploy-cloudrun@v2` — matches staging file verbatim + keeps both workflows byte-identical-style.
  - Secret Manager paths use literal `nlm-prod/DIRECT_URL` (not `${{ env.PROJECT_ID }}/DIRECT_URL`) — matches Plan 51-03 verify grep assertion exactly.
  - Smoke target = resolved `*.run.app` URL from `gcloud run services describe` (not `nextlevelmock.com`) — apex still points at v0.1 GCE during Phase 51 per T-51-01.
  - First-run tag `v1.5.0-rc1` deferred to operator — unattended mode cannot push tags that trigger live prod deploys.
metrics:
  duration: "~4 min wall (write + validate + commit)"
  completed: "2026-04-18"
---

# Phase 51 Plan 03: deploy-prod.yml Pipeline Summary

Cloned `.github/workflows/deploy-staging.yml` to `.github/workflows/deploy-prod.yml`, swapping staging → prod everywhere, tightening trigger to tag-only (`v*`), and targeting the prod WIF pool. First live run (tag `v1.5.0-rc1`) HALTED per unattended rules — requires operator to verify Phase 47 WIF + Phase 46 secrets are live first.

## What Shipped

### Workflow File

- `.github/workflows/deploy-prod.yml` (176 lines):

  **Triggers:**
  - `on.push.tags: ['v*']` — SemVer tag-only
  - `workflow_dispatch: {}` — manual retry after a failed tag run

  **Concurrency:**
  - `group: deploy-prod`, `cancel-in-progress: false` — two tags pushed in quick succession serialize (T-51-15)

  **Permissions:**
  - `id-token: write`, `contents: read` — WIF requirement; nothing else

  **Env:**
  - `PROJECT_ID: nlm-prod`, `REGION: us-central1`, `SERVICE: nlm-prod`
  - `IMAGE_REPO: us-central1-docker.pkg.dev/nlm-prod/nlm-app/nlm-app`
  - `RUNTIME_SA: nlm-cloudrun-sa@nlm-prod.iam.gserviceaccount.com`

  **Steps (8 total):**
  1. `actions/checkout@v4`
  2. `google-github-actions/auth@v2` — WIF via `vars.PROD_PROJECT_NUMBER` → `github-actions-deployer@nlm-prod`
  3. `google-github-actions/setup-gcloud@v2`
  4. `docker/setup-buildx-action@v3` + `docker/build-push-action@v5` — tags `:latest` + `:${{ github.ref_name }}`; cache via GHA; `provenance: false`
  5. `google-github-actions/get-secretmanager-secrets@v2` — `DIRECT_URL:nlm-prod/DIRECT_URL` + `ADMIN_EMAILS:nlm-prod/ADMIN_EMAILS` (auto-masked in logs per T-51-14)
  6. `npx prisma migrate deploy` — BEFORE `gcloud run deploy` (D-11 ordering)
  7. `gcloud run deploy nlm-prod` — pulls by `@${{ steps.build.outputs.digest }}` (not `:latest`)
  8. Smoke `/api/health` on `*.run.app` URL — 6×10s retries; accept 200 OR 503
  9. `if: always()` job summary
  10. `if: failure()` email via Resend SMTP → ADMIN_EMAILS

## Verification Results

All local (pre-live-run) assertions pass:

| Check | Result |
|-------|--------|
| `test -f .github/workflows/deploy-prod.yml` | FOUND (176 lines) |
| `grep -q "tags:"` | OK |
| `grep -q "'v\*'"` | OK |
| `grep -q "id-token: write"` | OK |
| `grep -q "PROD_PROJECT_NUMBER"` | OK |
| `grep -q "github-actions-deployer@nlm-prod"` | OK |
| `grep -q "us-central1-docker.pkg.dev/nlm-prod/nlm-app"` | OK |
| `grep -q "prisma migrate deploy"` | OK |
| `grep -q "concurrency:"` | OK |
| `grep -q "DIRECT_URL:nlm-prod/DIRECT_URL"` | OK |
| `! grep -q "branches: \[main\]"` | OK (no branch trigger) |
| `${{ }}` brace balance | 38 open / 38 close |

Live verifications HALTED (require file on main + tag pushed):
- `gh workflow list --json name,path | jq '.[] | select(.path == ".github/workflows/deploy-prod.yml")'` — pending
- `gh run list --workflow=deploy-prod.yml --limit 1 --json conclusion` — pending
- Actual `v1.5.0-rc1` tag push + run — pending

## GH Actions Run URL / Run ID / Revision / Digest

**Not yet produced.** Operator sequence to complete Plan 03 live:

```bash
# Prerequisites: Phase 47 WIF live in nlm-prod, Phase 46 secrets populated, Plan 51-01 applied.
# 1. Merge commit 03eba3a (deploy-prod.yml) to main via normal PR.
# 2. After merge, push SemVer tag:
git tag -a v1.5.0-rc1 -m "Phase 51 prod pipeline smoke — release candidate 1"
git push origin v1.5.0-rc1

# 3. Watch the run:
gh run watch "$(gh run list --workflow=deploy-prod.yml --limit 1 --json databaseId -q '.[0].databaseId')"

# 4. Verify success:
gh run list --workflow=deploy-prod.yml --limit 1 --json conclusion,headBranch -q '.[0].conclusion'
# Expect: success

# 5. Capture artifacts for SUMMARY:
REVISION=$(gcloud run services describe nlm-prod --region=us-central1 --project=nlm-prod --format='value(status.latestReadyRevisionName)')
IMAGE=$(gcloud run services describe nlm-prod --region=us-central1 --project=nlm-prod --format='value(template.containers[0].image)')
echo "Revision: $REVISION"
echo "Image: $IMAGE"
```

**Rollback if first run fails:**

```bash
# Delete the tag so a fixed workflow can reuse the version:
git push --delete origin v1.5.0-rc1
git tag -d v1.5.0-rc1
# Fix the workflow, commit the fix, retag with a NEW version (never reuse):
git tag -a v1.5.0-rc2 -m "Phase 51 prod pipeline smoke rc2"
git push origin v1.5.0-rc2
```

## Provider / Action Version Pins

| Package | Pin | Reason |
|---------|-----|--------|
| `actions/checkout` | `@v4` | matches staging |
| `google-github-actions/auth` | `@v2` | WIF requires v2+ |
| `google-github-actions/setup-gcloud` | `@v2` | matches staging |
| `google-github-actions/get-secretmanager-secrets` | `@v2` | matches staging |
| `docker/setup-buildx-action` | `@v3` | matches staging |
| `docker/build-push-action` | `@v5` | matches staging |
| `actions/setup-node` | `@v4` | matches staging |
| `dawidd6/action-send-mail` | `@v3` | Resend SMTP-compatible |

No provider-version or action-version warnings expected — all pins match Phase 48's green staging runs.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added `workflow_dispatch: {}` to triggers**
- **Plan text:** triggers only on `push.tags: ['v*']`
- **Issue:** No path to re-run a failed workflow without re-tagging. Tags are immutable (T-51-13 accept); force-pushing a tag is an anti-pattern.
- **Fix:** Added `workflow_dispatch: {}` (matches staging exactly). Operator can rerun via `gh workflow run deploy-prod.yml --ref <tag>` without pushing a new tag.
- **Commit:** 03eba3a

**2. Used `gcloud run deploy` (bash) not `google-github-actions/deploy-cloudrun@v2`**
- **Plan text example:** shows `google-github-actions/deploy-cloudrun@v2` block
- **Actual staging pattern (`.github/workflows/deploy-staging.yml` line 98-106):** uses `gcloud run deploy` in a bash run step
- **Fix:** Matched staging verbatim. Behavior is equivalent (both use WIF-authed gcloud + deploy by digest); matching keeps the two workflows trivially diffable when future changes touch both.
- **Commit:** 03eba3a

### Out-of-Scope Observation

No deferred items from this plan. File is self-contained; all external deps (Phase 47 WIF, Phase 46 secrets, Phase 45 AR) are documented as prerequisites in the operator sequence above.

## Operator Checkpoint (HALT)

**Live tag push + first run NOT executed.** To complete Plan 03:

1. Verify Phase 46 secrets populated in nlm-prod Secret Manager (DIRECT_URL + ADMIN_EMAILS at minimum).
2. Verify Phase 47 WIF pool + `vars.PROD_PROJECT_NUMBER` GH repo variable are set.
3. Verify Plan 51-01 applied (Cloud Run service `nlm-prod` exists and `public_invoke_prod` IAM binding is in place).
4. Merge `chore/v1.5-archive-v1.4` branch to `main` via normal PR (pr-checks.yml gates).
5. Push tag `v1.5.0-rc1`; watch run; capture artifacts.

## Self-Check: PASSED

- File created: `.github/workflows/deploy-prod.yml` — FOUND (176 lines).
- Commit `03eba3a` — FOUND in `git log --oneline`.
- 10 of 12 Plan 51-03 assertions PASS locally; remaining 2 require live GH Actions run (halted).
