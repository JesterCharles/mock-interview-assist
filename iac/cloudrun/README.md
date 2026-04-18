# iac/cloudrun — NLM Cloud Run Infrastructure (v1.5)

Terraform module for the v1.5 Cloud Run migration. Provisions non-compute foundation (Artifact Registry, Secret Manager shells, service accounts, API enablement). Cloud Run services themselves land in Phase 47. State backend lives in `gs://nlm-tfstate` under per-env prefixes.

**Locked v1.5 decisions:** See `.planning/phases/45-terraform-skeleton-artifact-registry-secret-manager/45-CONTEXT.md` (D-01 through D-16).

## Prerequisites

- GCP projects `nlm-staging-493715` and `nlm-prod` exist with billing linked (billing account `01A910-0C5083-DCCFED`).
- `gcloud auth login` + `gcloud auth application-default login` completed locally.
- Local Terraform CLI `>= 1.6.0` (provider v7 floor). Enforced by `scripts/preflight.sh`.
- `docker`, `gcloud`, `gsutil` on PATH.

## One-Time Bootstrap (run ONCE before first `terraform init`)

These three steps are chicken-and-egg with Terraform and must run out-of-band:

```bash
# 1. Verify local CLI versions
bash iac/cloudrun/scripts/preflight.sh

# 2. Enable seed APIs in both projects (serviceusage + cloudresourcemanager)
#    Terraform itself needs these; it cannot enable them via google_project_service
#    without them already being on. See Pitfall 2.
bash iac/cloudrun/scripts/enable-seed-apis.sh

# 3. Create gs://nlm-tfstate in nlm-prod (D-05). Versioning + uniform access + PAP.
bash iac/cloudrun/scripts/bootstrap-state-bucket.sh
```

Idempotent — safe to re-run. After these, skip to Per-Env Apply.

## Per-Env Apply — Staging (project `nlm-staging-493715`)

```bash
cd iac/cloudrun

terraform init  -reconfigure -backend-config="prefix=cloudrun/staging"
terraform plan  -var-file=staging.tfvars
terraform apply -var-file=staging.tfvars
```

## Per-Env Apply — Prod (project `nlm-prod`)

```bash
cd iac/cloudrun

terraform init  -reconfigure -backend-config="prefix=cloudrun/prod"
terraform plan  -var-file=prod.tfvars
terraform apply -var-file=prod.tfvars
```

**ALWAYS** re-run `terraform init -reconfigure -backend-config=prefix=cloudrun/<env>` when switching envs. Terraform caches the backend config in `.terraform/` and will happily write staging state to prod prefix otherwise (T-45-08: cross-env state write).

## Why No Workspaces (D-03)

Workspaces multiplex state within a single prefix and hide the active env behind `terraform workspace show`. With explicit `-var-file` + `-backend-config=prefix=`, the env intent is visible in every invocation. Reviewers read the command, not the shell state.

## Why Backend `prefix` Is Injected via `-backend-config` (Pitfall 3)

Terraform evaluates `backend "gcs"` BEFORE variable substitution. `prefix = "cloudrun/${var.env}"` throws `Variables may not be used here`. Partial config + `-backend-config="prefix=..."` at init is the supported path.

## Module File Map (D-02)

| File | Plan | Purpose |
|------|------|---------|
| `providers.tf` | 01 | `required_version >= 1.6`, `hashicorp/google ~> 7.0`, `backend "gcs"`, google provider |
| `variables.tf` | 01 | `project_id`, `region`, `env`, `secret_names` (13), `required_apis` (11), SA IDs |
| `apis.tf` | 01 | `google_project_service` for 11 APIs; `disable_on_destroy = false` |
| `state.tf` | 01 | Doc-only stub (bucket is un-managed by design; `prevent_destroy` deferred to future import) |
| `registry.tf` | 02 | `google_artifact_registry_repository.nlm_app` (DOCKER, us-central1) |
| `secrets.tf` | 03 | `google_secret_manager_secret.app` × 13 via `for_each` |
| `iam.tf` | 03 | 2 service accounts + per-secret `secretAccessor` bindings |
| `outputs.tf` | 02, 03 | Registry ID, SA emails, secret IDs (consumed by Phase 47/48) |
| `staging.tfvars`, `prod.tfvars` | 01 | Per-env values |
| `scripts/*.sh` | 01, 02, 04 | Bootstrap + smoke + phase-gate assertions |

## Common Pitfalls (copy from 45-RESEARCH.md §Common Pitfalls)

1. **CLI < 1.6** → `terraform plan` fails opaquely. `brew upgrade terraform` before first plan. Enforced by `scripts/preflight.sh`.
2. **Seed APIs missing** → first `terraform apply` fails with "Service Usage API has not been used". Run `scripts/enable-seed-apis.sh` once per project.
3. **Backend `prefix` with variables** → `Variables may not be used here`. Use `-backend-config=prefix=...` at init.
4. **`/api/health` smoke false-red** → route pings Prisma + Judge0; local `docker run` with dummy env returns 503. Phase 45 accepts 503 as "container booted" proof (Option C). Full green is a Phase 47 gate.
5. **`terraform destroy` against state bucket** → `prevent_destroy` + un-managed bucket mitigates. Treat this module as append-only in v1.5.
6. **Secret Manager quota** → 13 secrets × 2 projects × auto-replication is well below free-tier storage cost.
7. **Artifact Registry project-less URL** → always use full path `us-central1-docker.pkg.dev/${PROJECT_ID}/nlm-app/nlm-app:<tag>`. Omitting project pushes to whichever project gcloud is authed against (T-45-02).

## Secret Population (out-of-band; Phase 46 owns data, Phase 45 owns shells)

Per D-10, Terraform creates only the secret shell. Values are added via gcloud:

```bash
echo -n "postgresql://postgres:...@pooler.supabase.com:6543/postgres?connection_limit=5&pool_timeout=10" \
  | gcloud secrets versions add DATABASE_URL \
    --data-file=- \
    --project=nlm-staging-493715
```

**Never** commit values. **Never** use `google_secret_manager_secret_version` in HCL (would leak plaintext into tfstate — T-45-01).

## Phase Gate

Run `bash iac/cloudrun/scripts/verify-phase-45.sh` (added by Plan 04) against both projects. Must exit 0 before `/gsd-verify-work`.

## References

- `.planning/phases/45-terraform-skeleton-artifact-registry-secret-manager/45-CONTEXT.md` — locked decisions
- `.planning/phases/45-terraform-skeleton-artifact-registry-secret-manager/45-RESEARCH.md` — HCL patterns + pitfalls
- `.planning/phases/45-terraform-skeleton-artifact-registry-secret-manager/45-VALIDATION.md` — test map
- `.planning/REQUIREMENTS.md` §INFRA — milestone requirements
