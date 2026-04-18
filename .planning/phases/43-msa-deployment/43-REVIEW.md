---
phase: 43-msa-deployment
reviewed: 2026-04-18
depth: standard
status: issues_found
files_reviewed: 16
---

# Phase 43: Code Review Report

## Summary

Credible two-VM MSA topology (internal-only Judge0 firewall, least-privilege SA, GCS-backed state, tag-gated deploys with rollback). Runbook hits all 6 D-13 sections. Main gaps: deploy workflows lack manual-approval gates, GCS state bucket lacks CMEK/retention, SSH-key write pattern can leak via `echo`.

## P0 Critical

### CR-01: SSH private key written via `echo` leaks into runner logs on error
**Files:** `.github/workflows/deploy-app.yml:65`, `.github/workflows/deploy-judge0.yml:56`
**Fix:** Replace `echo "${{ secrets.APP_VM_SSH_KEY }}" > ~/.ssh/id_ed25519` with `webfactory/ssh-agent@v0.9.0` action OR a heredoc with explicit quoting.

## P1 Warnings

### WR-01: No manual-approval gate on production deploy workflows
Files: `deploy-app.yml:18-22`, `deploy-judge0.yml:20-23`. Only tag push. User memory says no auto-merge. Fix: `environment: production` + required reviewers.

### WR-02: GCS Terraform state bucket lacks CMEK / explicit encryption
File: `infra/terraform/README.md:30-39`. Fix: document CMEK option + retention policy.

### WR-03: `pr-checks.yml` duplicate push-to-main trigger
Remove `push: branches: [main]`.

### WR-04: Metrics script conflates unreachable vs HTTP error
`scripts/push-judge0-metrics.mjs:73-75, 90-92` — Judge0 500 and ECONNREFUSED both emit `status: "unreachable"`. Fix: separate `"error"` for non-2xx.

### WR-05: Rollback re-tags image as `:latest`, breaks digest-based rollback
`deploy-app.yml:71-76`. Fix: capture image digest, rollback by digest; or stop re-tagging as `:latest`.

### WR-06: `app-vm.tf` placeholder `boot_disk.image` will destroy-recreate on apply
File: `infra/terraform/app-vm.tf:26-29`. Fix: add `boot_disk` to `ignore_changes` OR `prevent_destroy = true` until Task 3 reconciliation.

### WR-07: `allow_stopping_for_update` silently reboots Judge0 on machine_type change
File: `judge0-vm.tf:65`. Fix: add `prevent_destroy = true` OR gate behind `require_confirmation` variable.

## P2-P3 Info

### IN-01: `judge0-vm.tf` `prevent_destroy = false` contradicts comment
File: `judge0-vm.tf:21-26`. Flip default or reword comment.

### IN-02: `service-accounts.tf` project-level `logWriter`
File: `service-accounts.tf:17-21`. Acceptable; note in runbook audit.

### IN-03: Runbook §2 re-verify checklist has no owner/due date
File: `docs/runbooks/coding-stack.md:113-129`. Add "Target: before first production submission, owner: trainer-dev."

---

Reviewer: gsd-code-reviewer
