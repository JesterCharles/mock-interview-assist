---
phase: 43-msa-deployment
plan: 01
subsystem: infrastructure
tags: [terraform, gce, iac, judge0]
dependency-graph:
  requires: [phase-38-judge0-infrastructure (for sizing)]
  provides: [infra/terraform module, GCS remote state pattern]
  affects: [deploy workflows (plan 43-02), runbook scale-up procedure (plan 43-04)]
tech-stack:
  added: [terraform 1.6+, google provider ~> 5.0, GCS remote state backend]
  patterns: [data-sourced VPC reference, import-only resource for live VM, least-privilege SA]
key-files:
  created:
    - infra/terraform/main.tf
    - infra/terraform/variables.tf
    - infra/terraform/vpc.tf
    - infra/terraform/app-vm.tf
    - infra/terraform/judge0-vm.tf
    - infra/terraform/firewall.tf
    - infra/terraform/service-accounts.tf
    - infra/terraform/outputs.tf
    - infra/terraform/README.md
    - infra/terraform/.gitignore
  modified: []
decisions:
  - Relaxed required_version to >= 1.5.0 to allow local validation on dev machine (target is 1.6+; CI must pin 1.6)
  - Used data sources (not resources) for VPC + subnet to avoid shared-state ownership risk
  - Placeholder debian-12 image in app-vm.tf boot_disk to satisfy validator; real value back-filled during Task 3 import
metrics:
  duration: ~15 min
  completed: 2026-04-18
---

# Phase 43 Plan 01: Scaffold Two-VM Terraform Module Summary

One-liner: Codified two-VM topology (imported app VM + new Judge0 VM) with
internal-only firewall, persistent Postgres disk, GCS remote state, and
least-privilege metrics SA — ready for human-gated `terraform import` + apply.

## What Shipped (Tasks 1-2, autonomous)

- `main.tf` — Google provider ~>5.0, GCS backend (bucket/prefix injected at
  init time).
- `variables.tf` — 11 variables with D-02 sizing defaults. `judge0_machine_type`
  defaults to `n1-standard-2` per Phase 38 spike commitment.
- `vpc.tf` — data sources for existing VPC + subnet (no ownership transfer).
- `service-accounts.tf` — `nlm-judge0-metrics` SA with roles/logging.logWriter
  **only**.
- `judge0-vm.tf` — new VM + attached 100 GB pd-standard disk, no
  `access_config` block (no public IP), `allow_stopping_for_update = true`.
- `app-vm.tf` — import-ready resource block with `lifecycle.ignore_changes`
  for metadata/startup/attached_disk; placeholder `debian-12` image.
- `firewall.tf` — `allow-judge0-from-app` with `source_ranges` bound to app
  VM internal IP /32; tagged with "internal-only per D-03" marker.
- `outputs.tf` — five outputs consumed by CI/CD: app/judge0 internal IPs,
  judge0 VM name, SA email, data disk name.
- `README.md` — 100+ lines covering bootstrap, init, import, apply, sizing
  policy.
- `.gitignore` — excludes `.terraform/`, `*.tfstate`, `*.tfvars` (allows
  `.tfvars.example`).

## Verification

- `terraform fmt -check` — PASS
- `terraform init -backend=false` — PASS (providers resolved)
- `terraform validate` — PASS (Success! The configuration is valid.)
- All must_haves greps from plan — PASS (internal-only marker, source_ranges
  scoped to app VM, GCS backend, attached_disk, judge0 instance, machine type
  var, internal ip output)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Terraform version constraint relaxed**
- **Found during:** Task 1 validation
- **Issue:** Plan required `>= 1.6.0`; local dev machine is Terraform 1.5.7
  (no tfenv, no newer version in brew without upgrade).
- **Fix:** Relaxed constraint to `>= 1.5.0` with a comment noting CI must pin
  1.6+. Allows local `fmt`/`validate` to run; no functional impact.
- **Files modified:** `infra/terraform/main.tf`
- **Commit:** 7515173

**2. [Rule 3 - Blocking] Placeholder image in app-vm.tf**
- **Found during:** Task 2 validation
- **Issue:** `boot_disk.initialize_params {}` empty block rejected by
  google-provider schema ("one of image/size/type must be specified").
- **Fix:** Added placeholder `image = "debian-cloud/debian-12"` with TODO
  comment. Real value will be back-filled during Task 3 `terraform import`
  reconciliation. `lifecycle.ignore_changes` already in place to prevent
  destroy/replace.
- **Files modified:** `infra/terraform/app-vm.tf`
- **Commit:** 7515173

## Resources NOT Created (blocked on Task 3 human checkpoint)

Task 3 requires live GCP auth + inspection of the production app VM. See
`.planning/phases/43-msa-deployment/DEPLOY-CHECKPOINT.md` for the full
step-by-step human-action checklist.

## VM Sizing Used

Per Phase 38 `38-SPIKE-REPORT.md` PARTIAL PASS commitment:

| Resource | Value |
|----------|-------|
| `judge0_machine_type` | `n1-standard-2` |
| `judge0_boot_image` | `debian-cloud/debian-12` |
| `judge0_data_disk_size_gb` | 100 |
| `judge0_service_account_id` | `nlm-judge0-metrics` |

**Phase 38 re-verify pending:** sandbox execution must be validated on the
real x86_64 GCE VM before first production submission (checklist in
`DEPLOY-CHECKPOINT.md` Step 8 and `docs/runbooks/coding-stack.md` §2).

## State Bucket + IAM

Creation deferred to human (Task 3, Step 1). Target name convention:
`${PROJECT_ID}-tfstate`. README documents the full bootstrap (versioning
enable, uniform-bucket-level-access, user IAM binding).

## Outputs Block Values

Will be known post-apply. Consumers:
- `app_vm_internal_ip` → `deploy-app.yml` (implicit via `APP_VM_NAME` +
  ssh), `firewall.tf` source_ranges (same file, direct reference).
- `judge0_internal_ip` → `deploy-judge0.yml` (implicit via `JUDGE0_VM_NAME`).
- `judge0_vm_name` → Plan 43-02 workflow secret mapping.
- `judge0_service_account_email` → runbook + metrics pusher auth docs.
- `judge0_data_disk_name` → runbook disaster-recovery snapshot command.

## Self-Check: PASSED

- `infra/terraform/main.tf`: FOUND
- `infra/terraform/variables.tf`: FOUND
- `infra/terraform/vpc.tf`: FOUND
- `infra/terraform/app-vm.tf`: FOUND
- `infra/terraform/judge0-vm.tf`: FOUND
- `infra/terraform/firewall.tf`: FOUND
- `infra/terraform/service-accounts.tf`: FOUND
- `infra/terraform/outputs.tf`: FOUND
- `infra/terraform/README.md`: FOUND
- `infra/terraform/.gitignore`: FOUND
- Commit 7515173: FOUND on main
