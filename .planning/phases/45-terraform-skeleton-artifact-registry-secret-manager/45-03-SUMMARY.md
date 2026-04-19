---
phase: 45-terraform-skeleton-artifact-registry-secret-manager
plan: 03
subsystem: secret-manager-iam
one_liner: "13 Secret Manager shells + 2 service accounts per project + per-secret accessor bindings — zero values in tfstate, zero user-managed keys"
tags: [infra, terraform, gcp, secret-manager, iam]
requires: [45-01]
provides:
  - google_secret_manager_secret.app (13 shells per project — 26 total)
  - google_service_account.cloudrun (nlm-cloudrun-sa per project)
  - google_service_account.ghactions (github-actions-deployer per project — bindingless)
  - google_secret_manager_secret_iam_member.cloudrun_accessor (26 total — per-secret scope)
  - outputs: cloudrun_service_account_email, github_actions_sa_email, secret_ids
affects:
  - nlm-staging-493715: +28 resources (13 secrets + 2 SAs + 13 IAM bindings)
  - nlm-prod:           +28 resources (same)
tech_stack:
  added: []
  patterns:
    - "for_each over var.secret_names → secrets"
    - "for_each over google_secret_manager_secret.app → IAM bindings (per-secret scope, not project-level)"
    - "auto-replication for Secret Manager (free-tier-safe)"
key_files:
  created:
    - iac/cloudrun/secrets.tf
    - iac/cloudrun/iam.tf
  modified:
    - iac/cloudrun/outputs.tf (appended 3 outputs)
decisions:
  - Used per-secret google_secret_manager_secret_iam_member (not project-level google_project_iam_member) — T-45-04 least privilege
  - No google_secret_manager_secret_version resources — D-10 keeps plaintext out of tfstate (values added out-of-band in Phase 46 via `gcloud secrets versions add`)
  - No google_service_account_key resources — T-45-05; WIF replaces keys in Phase 48
  - github-actions-deployer SA exists but has NO role bindings yet — D-14 defers WIF bindings to Phase 48
metrics:
  tasks_completed: 3
  commits: 1
  duration_minutes: 10
  completed_date: 2026-04-18
---

# Phase 45 Plan 03: Secret Manager + IAM Summary

## What Was Built

### Secrets (26 total = 13 × 2 projects)

All 13 D-09 secret shells created in both projects with auto-replication:

1. `DATABASE_URL`
2. `DIRECT_URL`
3. `NEXT_PUBLIC_SUPABASE_URL`
4. `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
5. `SUPABASE_SECRET_KEY`
6. `OPENAI_API_KEY`
7. `RESEND_API_KEY`
8. `GITHUB_TOKEN`
9. `NEXT_PUBLIC_SITE_URL`
10. `ADMIN_EMAILS`
11. `JUDGE0_URL`
12. `JUDGE0_AUTH_TOKEN`
13. `CODING_CHALLENGES_ENABLED`

**Zero values written.** All shells empty — values are populated out-of-band in Phase 46 via `gcloud secrets versions add` (D-10). No `google_secret_manager_secret_version` in HCL → T-45-01 mitigated.

### Service Accounts (4 total = 2 × 2 projects)

- `nlm-cloudrun-sa@nlm-staging-493715.iam.gserviceaccount.com` (runtime identity for Phase 47 Cloud Run)
- `nlm-cloudrun-sa@nlm-prod.iam.gserviceaccount.com`
- `github-actions-deployer@nlm-staging-493715.iam.gserviceaccount.com` (WIF principal for Phase 48 — bindingless in 45)
- `github-actions-deployer@nlm-prod.iam.gserviceaccount.com`

### IAM Bindings (26 total = 13 × 2 projects)

Per-secret `roles/secretmanager.secretAccessor` → `nlm-cloudrun-sa` via `for_each = google_secret_manager_secret.app`. No project-level `secretmanager.admin` or project-level `secretAccessor` — T-45-04 least-privilege mitigated.

### Outputs

Appended to `iac/cloudrun/outputs.tf`:
- `cloudrun_service_account_email` — Phase 47 Cloud Run `service_account` argument
- `github_actions_sa_email` — Phase 48 WIF principal binding
- `secret_ids` — `{ "DATABASE_URL" = "projects/.../secrets/DATABASE_URL", ... }` map for Cloud Run env-var mounts

## Verification

```
$ gcloud secrets list --project=nlm-staging-493715 --format='value(name)' | wc -l
13

$ gcloud secrets list --project=nlm-prod --format='value(name)' | wc -l
13

$ gcloud iam service-accounts list --project=nlm-staging-493715 --format="value(email)" | grep -E "nlm-cloudrun-sa|github-actions-deployer"
github-actions-deployer@nlm-staging-493715.iam.gserviceaccount.com
nlm-cloudrun-sa@nlm-staging-493715.iam.gserviceaccount.com

$ gcloud secrets get-iam-policy DATABASE_URL --project=nlm-staging-493715 --format=json
bindings: [{role: "roles/secretmanager.secretAccessor",
            members: ["serviceAccount:nlm-cloudrun-sa@nlm-staging-493715.iam.gserviceaccount.com"]}]

$ gcloud iam service-accounts keys list --iam-account=nlm-cloudrun-sa@nlm-staging-493715.iam.gserviceaccount.com --format='value(keyType)' | grep -v SYSTEM_MANAGED | wc -l
0
```

All assertions passed.

## Deviations from Plan

None.

## Commits

| Task | Subject | Hash |
|------|---------|------|
| 1+2+3 (combined) | feat(45-03): Secret Manager shells + SAs + per-secret accessor bindings | `2adeee5` |

Rationale for single commit: Tasks 1, 2, 3 of plan 45-03 form one atomic delta (shells → SAs → bindings) and the plan's Task 3 explicitly says "apply to both envs" which depends on Tasks 1 and 2 being in place. Splitting would produce an unapplyable intermediate state.

## Self-Check: PASSED

- Files:
  - FOUND: iac/cloudrun/secrets.tf
  - FOUND: iac/cloudrun/iam.tf
  - FOUND: iac/cloudrun/outputs.tf (with 3 new outputs appended)
- Commit: 2adeee5 present.
- 13 secrets × 2 projects confirmed via gcloud.
- 4 SAs confirmed via gcloud.
- Per-secret binding confirmed on DATABASE_URL staging.
- Zero user-managed keys confirmed on nlm-cloudrun-sa staging.
