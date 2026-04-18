---
phase: 43-msa-deployment
fixed_at: 2026-04-18T06:57:00Z
review_path: .planning/phases/43-msa-deployment/43-REVIEW.md
iteration: 1
findings_in_scope: 9
fixed: 9
skipped: 0
status: all_fixed
---

# Phase 43: Code Review Fix Report

**Fixed at:** 2026-04-18
**Source review:** `.planning/phases/43-msa-deployment/43-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 9 (1 P0 + 7 P1 + 2 P2/P3 actionable; IN-02 skipped by spec)
- Fixed: 9
- Skipped: 0
- Tests: 907 passed / 4 skipped (was 899; +8 from phase 40/41 + WR-04)
- Terraform: `fmt -check` + `validate` clean
- YAML workflows: js-yaml parse clean

## Fixed Issues

### CR-01: SSH private key written via echo leaks into runner logs
**Files:** `.github/workflows/deploy-app.yml`, `.github/workflows/deploy-judge0.yml`
**Commit:** `8a8f4db`
**Fix:** Replaced the `mkdir ~/.ssh && echo "$KEY" > …` pattern in both workflows with pinned `webfactory/ssh-agent@v0.9.0`. Dropped now-redundant `--ssh-key-file` from every `gcloud compute ssh` call; the agent is picked up automatically.

### WR-01: No manual-approval gate on production deploys
**Files:** `deploy-app.yml`, `deploy-judge0.yml`, `docs/runbooks/coding-stack.md`
**Commit:** `4fd9908`
**Fix:** Added `environment: production` to both deploy jobs. Runbook §1 documents the required repo setup (Settings → Environments → production → Required reviewers).

### WR-02: GCS state bucket lacks CMEK / retention
**Files:** `infra/terraform/README.md`
**Commit:** `b2bbcfb`
**Fix:** New "State bucket hardening" section covers CMEK via Cloud KMS (keyring + key + GCS service-agent IAM) and 30-day retention policy. Bucket-create is now idempotent via `|| true`.

### WR-03: Duplicate push-to-main trigger on pr-checks
**Files:** `.github/workflows/pr-checks.yml`
**Commit:** `b8f77ee`
**Fix:** Removed `push: branches: [main]`; `pull_request` is the sole trigger.

### WR-04: Metrics script conflates unreachable vs HTTP error
**Files:** `scripts/push-judge0-metrics.mjs`, `scripts/push-judge0-metrics.test.mjs`, `docs/runbooks/coding-stack.md`
**Commit:** `afd7c03`
**Fix:** Test-first — added RED case for HTTP 500 → `status: "error"`. `buildLogPayload` now accepts `errorKind` (default `"unreachable"` for back-compat). New `classifyError()` heuristic picks `error` when the thrown message contains `HTTP <3 digits>`. Runbook Appendix B adds Query 3b.

### WR-05: Rollback re-tags as :latest, breaks digest restore
**Files:** `deploy-app.yml`
**Commit:** `cb76fd7`
**Fix:** Capture `.Image` (sha256 digest) instead of `.Config.Image` (tag). Rollback pulls `gcr.io/PROJECT/app@sha256:…` — immutable restore regardless of tag state.

### WR-06: app-vm boot_disk placeholder forces destroy-recreate
**Files:** `infra/terraform/app-vm.tf`
**Commit:** `58592b5`
**Fix:** Added `boot_disk` to `lifecycle.ignore_changes`. Comment directs Task 3 owner to remove it once the real image is reconciled via `terraform show`.

### WR-07: judge0 VM missing prevent_destroy
**Files:** `infra/terraform/judge0-vm.tf`
**Commit:** `9689062`
**Fix:** `prevent_destroy = true` on the `google_compute_instance.judge0` lifecycle block. Operator must run `terraform taint` explicitly before replace — matches runbook §5 Tier 3.

### IN-01: judge0 data-disk prevent_destroy comment contradicts value
**Files:** `infra/terraform/judge0-vm.tf`
**Commit:** `098cb34`
**Fix:** Rewrote the comment to honestly describe why it's off for v1.4 (Task 3 may need taint) and the stability gate for flipping to true. Weekly snapshots noted as the current mitigation.

### IN-03: Re-verify checklist lacks owner / due date
**Files:** `docs/runbooks/coding-stack.md`
**Commit:** `b21d7f0`
**Fix:** Added explicit owner (trainer-dev), target (before first production submission / v1.4 go-live), and status (open) above the checklist.

## Skipped

None in scope. IN-02 (project-level logWriter on service-accounts.tf) is "acceptable as-is" per review and explicitly skipped by fix spec.

---

_Fixed: 2026-04-18_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
