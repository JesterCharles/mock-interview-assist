---
phase: 47-staging-cloud-run-service-load-balancer-domains
plan: 01
subsystem: cloudrun-staging
one_liner: "Staging Cloud Run v2 service HCL shipped (INFRA-04 baseline, T-47-07 lifecycle ignore, 13-secret for_each, digest-pinned); terraform apply HALTED (needs image digest + secret values)"
tags: [infra, terraform, cloud-run, staging, halt]
requires: [45-03, 46-04]
provides:
  - iac/cloudrun/cloudrun-staging.tf (google_cloud_run_v2_service.nlm_staging + public_invoke IAM, count=staging)
  - variables.tf: initial_image_digest, domain_name, github_repo_slug, cf_zone_id
  - providers.tf: cloudflare/cloudflare ~> 4.0 registered (locked to v4.52.7)
  - outputs.tf: cloudrun_service_name, cloudrun_service_url
  - staging.tfvars: Phase 47 variable values (digest + zone_id are PLACEHOLDERS)
affects:
  - iac/cloudrun: module extended, Wave 2 plans can now consume new vars
tech_stack:
  added:
    - cloudflare/cloudflare v4.52.7 (Terraform provider — registered, not yet consumed)
  patterns:
    - "count = var.env == \"staging\" ? 1 : 0 — per-env gating in shared module"
    - "dynamic env for_each = toset(var.secret_names) — secret mount DRY over 13 secrets"
    - "lifecycle.ignore_changes on template.containers[0].image + client + client_version — T-47-07"
key_files:
  created:
    - iac/cloudrun/cloudrun-staging.tf
    - .planning/phases/47-staging-cloud-run-service-load-balancer-domains/47-01-SUMMARY.md
  modified:
    - iac/cloudrun/variables.tf (4 new vars)
    - iac/cloudrun/providers.tf (cloudflare required_providers + provider block)
    - iac/cloudrun/outputs.tf (2 new outputs)
    - iac/cloudrun/staging.tfvars (4 new values, 2 placeholders)
    - iac/cloudrun/.terraform.lock.hcl (cloudflare provider signature)
decisions:
  - "Unattended mode: shipped HCL + terraform fmt + validate + targeted plan; DID NOT apply."
  - "initial_image_digest set to placeholder string — P45-02 halted on Dockerfile/supabase-admin D-15 conflict; no image in AR yet. Phase 48 CI populates on first push."
  - "cf_zone_id set to placeholder — requires CLOUDFLARE_API_TOKEN (operator-held secret, T-47-09)."
metrics:
  tasks_completed: 2
  tasks_halted: 1
  commits: 2
  duration_minutes: 12
  completed_date: 2026-04-18
---

# Phase 47 Plan 01: Staging Cloud Run Service Summary

## What Was Built

Extended the Phase 45 `iac/cloudrun` Terraform module with the Phase 47 service HCL and the variables Plans 02/03/04 need:

1. **`variables.tf`** — Added `initial_image_digest` (no default, required), `domain_name` (default `staging.nextlevelmock.com`), `github_repo_slug` (default `JesterCharles/mock-interview-assist`), `cf_zone_id` (no default).
2. **`providers.tf`** — Registered `cloudflare/cloudflare ~> 4.0` in `required_providers`; added `provider "cloudflare" {}` block (auth via `CLOUDFLARE_API_TOKEN` env var per D-21, T-47-09).
3. **`outputs.tf`** — Added `cloudrun_service_name` and `cloudrun_service_url`, both gated on `var.env == "staging"`.
4. **`staging.tfvars`** — Added Phase 47 values (placeholders for `initial_image_digest` and `cf_zone_id`; literals for `github_repo_slug` and `domain_name`).
5. **`cloudrun-staging.tf`** (NEW) — `google_cloud_run_v2_service.nlm_staging` + `google_cloud_run_v2_service_iam_member.public_invoke`, both `count = var.env == "staging" ? 1 : 0`. Encodes every INFRA-04 baseline constant and the T-47-07 lifecycle.ignore_changes.

**Plan/validate evidence:**

```
terraform init -reconfigure -backend-config="prefix=cloudrun/staging"
  Installed cloudflare/cloudflare v4.52.7 (self-signed, key ID C76001609EE3B136)
  Using previously-installed hashicorp/google v7.28.0
  Terraform has been successfully initialized!

terraform validate
  Success! The configuration is valid.

terraform plan -var-file=staging.tfvars \
  -target=google_cloud_run_v2_service.nlm_staging \
  -target=google_cloud_run_v2_service_iam_member.public_invoke
  Plan: 2 to add, 0 to change, 0 to destroy.
```

## What Was NOT Built (HALT)

**Task 3 live apply + gcloud assertions — HALTED per unattended mode rules.**

Apply is blocked by three operator prerequisites:

| Gate | What needs to happen | Phase that populates |
|------|----------------------|----------------------|
| `initial_image_digest` | First image must be pushed to `us-central1-docker.pkg.dev/nlm-staging-493715/nlm-app/nlm-app`. P45-02 Docker smoke halted on supabase-admin D-15 conflict; no image exists. | Phase 48 CI (deploy-staging workflow) |
| 13 Secret Manager values | Phase 46 runbook Phases A–J require live prod wipe + Supabase key rotation + Auth redirect PATCH — all operator-gated. | Phase 46 runbook (operator execution) |
| `cf_zone_id` + `CLOUDFLARE_API_TOKEN` | Operator must run one-time Cloudflare zone lookup and hold the token in shell. | Phase 47 Plan 02 (live apply, human-gated) |

**Placeholder values in `staging.tfvars` intentionally block `terraform apply`:**
- `initial_image_digest = "sha256:PHASE48_CI_WILL_POPULATE_000000000000000000000000000000000000"`
- `cf_zone_id = "PLACEHOLDER_32_HEX_FROM_CLOUDFLARE_ZONE_LOOKUP"`

Operator overwrites these with real values before first apply. The `terraform plan` shown above is directional — it exposes what the apply will create — but Cloud Run would reject the placeholder digest literal (`sha256:PHASE48...`) if run today because Artifact Registry has no matching manifest.

## Verification

```
$ terraform fmt -check
# exit 0 (idempotent)

$ grep -c 'variable "initial_image_digest"' iac/cloudrun/variables.tf
1
$ grep -c 'cloudflare/cloudflare' iac/cloudrun/providers.tf
1
$ grep -c 'google_cloud_run_v2_service' iac/cloudrun/cloudrun-staging.tf
2   # resource + IAM reference
$ grep -c 'ignore_changes' iac/cloudrun/cloudrun-staging.tf
1   # T-47-07 lifecycle block

$ ! grep ':latest"' iac/cloudrun/cloudrun-staging.tf  # T-47-05 — no :latest
# exit 0

$ ! grep 'vpc_access' iac/cloudrun/cloudrun-staging.tf  # Pitfall 6
# exit 0
```

## Deviations from Plan

### HALT (Unattended Mode)

**HALT: needs operator** — Task 3 `terraform apply -var-file=staging.tfvars -target=google_cloud_run_v2_service.nlm_staging` + downstream gcloud assertions.

- **Trigger:** Three operator gates (above) must clear before apply is safe.
- **Unattended rule:** "DO NOT run `terraform apply`."
- **Action taken:** Ran `terraform fmt`, `terraform validate`, and `terraform plan -target=...` against real backend (`gs://nlm-tfstate` prefix `cloudrun/staging`). Plan succeeded — 2 resources to add, 0 changed, 0 destroyed. Cloudflare provider v4.52.7 downloaded + pinned in `.terraform.lock.hcl`.

### Auto-fixes

None — code + decisions already encoded in planning artifacts.

## Commits

| Task | Subject | Hash |
|------|---------|------|
| 1 | feat(47-01): extend TF vars/providers/tfvars for Phase 47 + register cloudflare v4 provider | `8125a5e` |
| 2 | feat(47-01): add staging Cloud Run v2 service HCL (INFRA-04, T-47-07 lifecycle ignore) | `561e34c` |

## Self-Check: PASSED

- Files:
  - FOUND: iac/cloudrun/cloudrun-staging.tf
  - FOUND: iac/cloudrun/variables.tf (4 new vars present)
  - FOUND: iac/cloudrun/providers.tf (cloudflare ~> 4.0 registered)
  - FOUND: iac/cloudrun/outputs.tf (2 new outputs present)
  - FOUND: iac/cloudrun/staging.tfvars (4 new values present)
- Commits: 8125a5e, 561e34c present.
- `terraform validate` exit 0.
- `terraform plan -target=...` exit 0 (2 resources to add).
- HALT documented with operator gates enumerated.
