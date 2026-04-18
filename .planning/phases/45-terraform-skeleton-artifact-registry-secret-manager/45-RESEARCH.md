# Phase 45: Terraform Skeleton + Artifact Registry + Secret Manager - Research

**Researched:** 2026-04-18
**Domain:** GCP IaC (Terraform) — GCS remote state, Artifact Registry, Secret Manager, IAM scaffolding, Docker runtime verification
**Confidence:** HIGH (all claims cite Terraform provider source, Google docs, or local tool probes)

## Summary

Phase 45 is a greenfield Terraform module (`iac/cloudrun/`) that provisions the **non-compute foundation** for the v1.5 Cloud Run migration: remote state backend, Artifact Registry repos, Secret Manager secrets (empty shells), empty service accounts, and GCP API enablement. No Cloud Run services are created (Phase 47), no WIF (Phase 48), no Supabase (Phase 46).

Three cross-cutting hazards dominate the plan: (1) the **GCS state bucket bootstrap** is a chicken-and-egg that must be resolved manually with `gcloud` before `terraform init`; (2) the **`serviceusage` + `cloudresourcemanager` APIs** must be enabled by `gcloud` before Terraform can call `google_project_service` on anything else; and (3) the **`/api/health` smoke test is a false-green trap** because it pings Prisma *and* Judge0 — a naive local `docker run` with dummy env will return 503, not 200. The plan must document a realistic smoke harness (live staging Supabase URL or docker-compose with Judge0 sidecar) or explicitly relax D-15 to "container boots + Next.js serves a non-DB route 200."

**Primary recommendation:** Pin `hashicorp/google ~> 7.0` (current stable 7.28.0 as of 2026-04-14). Bootstrap GCS bucket + two seed APIs (`serviceusage`, `cloudresourcemanager`) manually via `gcloud` per project. Use one root module, two `.tfvars` files, single `nlm-tfstate` bucket with per-env prefixes. Use `google_secret_manager_secret_iam_member` + `for_each` for least-privilege `secretAccessor` bindings. Upgrade local Terraform CLI from 1.5.7 → ≥ 1.6 before first `plan`.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01** — `iac/cloudrun/` is a fresh directory. `infra/terraform/` (v0.1 GCE + v1.4 Judge0) is NOT touched in 45. Phase 50 will relabel/rename it per JUDGE-INTEG-04.
- **D-02** — Module split by resource type (not by env): `providers.tf`, `variables.tf`, `apis.tf`, `state.tf` (doc-only stub), `registry.tf`, `secrets.tf`, `iam.tf`, `outputs.tf`. One root module, per-env `*.tfvars`.
- **D-03** — Multi-env = separate `.tfvars` files (`staging.tfvars`, `prod.tfvars`) + explicit `-var-file`. **NOT** Terraform workspaces.
- **D-04** — `backend "gcs"` block uses fixed `bucket = "nlm-tfstate"` with `prefix` differentiating env: `cloudrun/staging` vs `cloudrun/prod`.
- **D-05** — State bucket lives in `nlm-prod` project. Versioning on. Uniform bucket-level access. `lifecycle { prevent_destroy = true }`.
- **D-06** — Bucket bootstrapped manually ONCE via `gcloud` before `terraform init`. Optional post-bootstrap `terraform import`.
- **D-07** — One `google_artifact_registry_repository` per project, both named `nlm-app`, format `DOCKER`, region `us-central1`.
- **D-08** — Image tag convention: push `:latest` + digest; Cloud Run pulls by digest only (Phase 48 wires this).
- **D-09** — One Secret Manager secret per env var per project. Project boundary = env boundary, so names are plain (no `staging-` prefix). 13 secrets: `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `OPENAI_API_KEY`, `RESEND_API_KEY`, `GITHUB_TOKEN`, `NEXT_PUBLIC_SITE_URL`, `ADMIN_EMAILS`, `JUDGE0_URL`, `JUDGE0_AUTH_TOKEN`, `CODING_CHALLENGES_ENABLED`.
- **D-10** — Terraform defines `google_secret_manager_secret` resources with automatic replication; values populated out-of-band via `gcloud secrets versions add`. NO `google_secret_manager_secret_version` in TF.
- **D-11** — Two SAs per project created empty in 45: `nlm-cloudrun-sa` and `github-actions-deployer`. Secret accessor bindings attached in 45 (nlm-cloudrun-sa → all 13 secrets via `roles/secretmanager.secretAccessor`). WIF binding deferred to Phase 48.
- **D-12** — `google_project_service` enables: `artifactregistry`, `secretmanager`, `run`, `compute`, `iam`, `iamcredentials`, `cloudresourcemanager`, `serviceusage`, `storage`, `monitoring`, `logging`, `cloudbuild` (optional).
- **D-13** — Service account IDs: `nlm-cloudrun-sa`, `github-actions-deployer`.
- **D-14** — Secret accessor bindings attached in Phase 45. GH Actions binding deferred to 48.
- **D-15** — NO Dockerfile changes. Verification = `docker build -t nlm-app:test .` succeeds + `docker run` against dummy env serves `/api/health` with HTTP 200.
- **D-16** — Push smoke image `nlm-app:phase45-smoke` to staging Artifact Registry as end-to-end wiring proof.

### Claude's Discretion

- HCL module file granularity (e.g., merging `iam.tf` into `secrets.tf` if binding count is small) — planner picks.
- Precise list of GCP APIs (may drop `cloudbuild` if demonstrably unused in 45).
- Whether to `terraform import` the manually-bootstrapped GCS state bucket into TF state — optional.
- README structure inside `iac/cloudrun/` — planner writes.

### Deferred Ideas (OUT OF SCOPE)

- Terraform CI validation (`terraform fmt -check`, `terraform validate`, `tflint` in CI) — Phase 48.
- `terraform plan` on PR (GH Action posting diff as comment) — Phase 48+.
- Secret rotation automation — v1.5 documents manual rotation in Phase 53 runbook.
- VPC Service Controls / Org Policy hardening — out of scope v1.5.
- Binary Authorization / image signing — v1.6+ (digest-pinning is the v1.5 signal).
- Multi-region Cloud Run — v1.5 is `us-central1` only.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INFRA-01 | `iac/cloudrun/` provisions two Cloud Run services (staging + prod) from same image — **45 only builds the module skeleton**; services land in Phase 47. | §Terraform Module Layout confirms directory shape + providers/backend syntax compatible with future Cloud Run resources. |
| INFRA-02 | Artifact Registry per project; digest-only pulls. | §Artifact Registry Resource Shape gives exact HCL + gcloud verification command. Digest-pull enforcement is a Phase 48 CI concern. |
| INFRA-03 | Secret Manager stores runtime env vars; values NOT baked into image. | §Secret Manager Replication confirms `replication { auto {} }` pattern + that omitting `google_secret_manager_secret_version` keeps plaintext out of tfstate. |
| INFRA-06 | GCS bucket `nlm-tfstate` holds TF state; versioning + uniform bucket-level access. | §GCS Remote State Bootstrap Pattern gives exact `gcloud` bootstrap + optional `terraform import` sequence. |
| INFRA-07 | Dockerfile builds standalone Next.js unmodified. | §Dockerfile Smoke Test details `/api/health` trap (pings Prisma + Judge0), recommends smoke harness. |

</phase_requirements>

## Project Constraints (from CLAUDE.md)

CLAUDE.md enforces rules the planner MUST honor:

- **GSD Workflow Enforcement** — no Edit/Write outside a GSD command. Phase 45 tasks must run inside `/gsd-execute-phase` (superpowers TDD worktrees).
- **Codex owns code review** — no self-review. Terraform PR review goes through `codex review` (even for HCL).
- **Testing hierarchy** — unit tests (vitest) for app code; Terraform validation ≠ vitest. Use `terraform validate` + `terraform plan` as the IaC test surface.
- **Health stack** — `npx tsc --noEmit` + `npm run lint` + `npm run test` must pass. These gate the smoke test if any TS change slips in (none expected in 45).
- **DESIGN.md** — N/A for Phase 45 (no UI surface).
- **Docker base** — `node:22-alpine` is locked. No Dockerfile edits.
- **Prisma 7** — existing Supabase Transaction Pooler pattern (`?connection_limit=5&pool_timeout=10` on port 6543, `DIRECT_URL` on 5432). Dockerfile runs `npx prisma migrate deploy` at container start via `CMD` — **matters for the smoke test because the container will attempt a DB connection on boot**. Planner must pre-seed a reachable DB (staging Supabase) or migrations will fail on the smoke run.

## Standard Stack

### Core Terraform

| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| Terraform CLI | `>= 1.6` | HCL runtime | [VERIFIED: local probe] Local is 1.5.7 — **must upgrade** before first plan. Google provider 7.x requires ephemeral resources (Terraform 1.10) for some features; 1.6 is floor for the module skeleton. Use `brew upgrade terraform` (macOS, existing toolchain). |
| `hashicorp/google` provider | `~> 7.0` (current 7.28.0, released 2026-04-14) | GCP resource CRUD | [VERIFIED: web search HashiCorp releases page] 7.0 went GA Oct 2025. v0.1/v1.4 `infra/terraform/` pins `~> 5.0` — **do not copy that constraint**; 7.x adds write-only attrs + ephemeral resources needed for future phases. |
| `google` provider | same as above | No `google-beta` needed in 45 — all resources in scope (APIs, Storage, Artifact Registry, Secret Manager, IAM, Service Accounts) are GA. | [CITED: [provider docs](https://registry.terraform.io/providers/hashicorp/google/latest)] |

### Required providers block

```hcl
terraform {
  required_version = ">= 1.6.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 7.0"
    }
  }

  backend "gcs" {
    bucket = "nlm-tfstate"
    # prefix is injected at `terraform init` time via -backend-config=prefix=cloudrun/staging
    # (backend blocks do not support variables; -backend-config is the standard override)
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}
```

**Alternative rejected:** hard-coding `prefix = "cloudrun/${var.env}"` in `backend "gcs"` is **not supported** — Terraform backend blocks forbid variables (evaluated before variable resolution). Use `-backend-config="prefix=cloudrun/staging"` at init time, documented in README. [CITED: [Terraform docs — backend configuration](https://developer.hashicorp.com/terraform/language/backend)]

### Provider 7.0 breaking-change surface (relevant to this phase)

| Resource | Breaking change | Impact on Phase 45 |
|----------|----------------|---------------------|
| `google_project_service` | `disable_on_destroy` default flipped `true → false` | [VERIFIED: [v7 upgrade guide](https://raw.githubusercontent.com/hashicorp/terraform-provider-google/v7.0.0/website/docs/guides/version_7_upgrade.html.markdown)] SAFE for this phase — we want APIs to stay enabled on `terraform destroy`. |
| `google_storage_bucket` | `retention_period` now string, not int | SAFE — we don't set retention. |
| `google_artifact_registry_repository` | `public_repository` defaults removed | SAFE — we use `DOCKER` format, not `REMOTE`. |
| `google_secret_manager_secret` | none affecting our usage | SAFE. |

### Supporting tools (local probe — already installed)

| Tool | Version | Purpose |
|------|---------|---------|
| `gcloud` | 547.0.0 | Bootstrap (bucket create, initial API enable, secret versions, smoke verify) |
| `gsutil` | 5.35 | Legacy bucket commands (`gsutil versioning get`, validation) |
| `docker` | 24.0.7 | D-15 smoke build + D-16 registry push |
| `terraform` | **1.5.7 (BELOW MIN)** | Must upgrade to ≥ 1.6 before `plan` |

## Architecture Patterns

### Recommended Project Structure

```
iac/cloudrun/
├── README.md            # Bootstrap sequence, apply/plan invocations, env matrix
├── providers.tf         # required_version, required_providers, backend, provider block
├── variables.tf         # project_id, region, env (staging|prod), secret_names list
├── apis.tf              # google_project_service × N (D-12 list)
├── state.tf             # Doc-only stub: commented google_storage_bucket.tfstate (import optional)
├── registry.tf          # google_artifact_registry_repository.nlm_app
├── secrets.tf           # for_each over var.secret_names → google_secret_manager_secret
├── iam.tf               # google_service_account × 2; google_secret_manager_secret_iam_member for_each
├── outputs.tf           # artifact_registry_id, cloudrun_sa_email, ghactions_sa_email, secret_ids
├── staging.tfvars       # project_id = "nlm-staging-493715", env = "staging"
└── prod.tfvars          # project_id = "nlm-prod", env = "prod"
```

### Pattern 1: `providers.tf` with explicit backend + version pins

```hcl
# Source: adapted from infra/terraform/main.tf + v7 upgrade guide
terraform {
  required_version = ">= 1.6.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 7.0"
    }
  }

  backend "gcs" {
    bucket = "nlm-tfstate"
    # prefix injected per-env via: terraform init -backend-config="prefix=cloudrun/staging"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}
```

### Pattern 2: API enablement with explicit `depends_on` chain

```hcl
# Source: [v7 google_project_service docs]
# serviceusage + cloudresourcemanager MUST be enabled manually before first apply.
# Terraform manages all OTHER APIs here; disable_on_destroy=false (v7 default) keeps them on destroy.

locals {
  required_apis = [
    "artifactregistry.googleapis.com",
    "secretmanager.googleapis.com",
    "run.googleapis.com",
    "compute.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "cloudresourcemanager.googleapis.com",  # still managed — even though enabled manually for bootstrap
    "serviceusage.googleapis.com",          # idem
    "storage.googleapis.com",
    "monitoring.googleapis.com",
    "logging.googleapis.com",
    # "cloudbuild.googleapis.com",  # optional — drop if GH Actions does all builds (Phase 48)
  ]
}

resource "google_project_service" "apis" {
  for_each = toset(local.required_apis)

  project = var.project_id
  service = each.value

  # Explicit; matches v7 default. Keeps APIs enabled on `terraform destroy`.
  disable_on_destroy         = false
  disable_dependent_services = false
}
```

### Pattern 3: Artifact Registry (DOCKER, regional)

```hcl
# Source: [google_artifact_registry_repository docs]
resource "google_artifact_registry_repository" "nlm_app" {
  project       = var.project_id
  location      = var.region               # "us-central1"
  repository_id = "nlm-app"
  format        = "DOCKER"
  description   = "NLM Next.js app images (${var.env})"

  # No cleanup_policies in 45 — add in a later phase if image churn justifies
  # No remote_repository_config, no virtual_repository_config (we push our own builds)

  depends_on = [google_project_service.apis]
}
```

### Pattern 4: Secret Manager (resource without version)

```hcl
# Source: [google_secret_manager_secret docs]
# Per D-10: TF manages only the secret shell. Values go in via `gcloud secrets versions add`
# out of band — keeps plaintext out of tfstate entirely.

variable "secret_names" {
  description = "Secret Manager secret IDs to provision. Values populated out-of-band."
  type        = list(string)
  default = [
    "DATABASE_URL",
    "DIRECT_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_SECRET_KEY",
    "OPENAI_API_KEY",
    "RESEND_API_KEY",
    "GITHUB_TOKEN",
    "NEXT_PUBLIC_SITE_URL",
    "ADMIN_EMAILS",
    "JUDGE0_URL",
    "JUDGE0_AUTH_TOKEN",
    "CODING_CHALLENGES_ENABLED",
  ]
}

resource "google_secret_manager_secret" "app" {
  for_each = toset(var.secret_names)

  project   = var.project_id
  secret_id = each.value

  replication {
    auto {}   # Google manages multi-region replication; zero-config, no cost delta for <10KB secrets
  }

  labels = {
    env       = var.env
    managed   = "terraform"
    component = "nlm-app"
  }

  depends_on = [google_project_service.apis]
}
```

### Pattern 5: Service Accounts + per-secret IAM binding (least privilege)

```hcl
# Source: [google_service_account docs], [secret_manager_secret_iam_member docs],
# [Secret Manager best practices — apply permissions at the lowest level in the resource hierarchy]

resource "google_service_account" "cloudrun" {
  project      = var.project_id
  account_id   = "nlm-cloudrun-sa"
  display_name = "NLM Cloud Run runtime identity (${var.env})"
  description  = "Attached to the NLM Cloud Run service in Phase 47. Reads secrets listed in var.secret_names."
}

resource "google_service_account" "ghactions" {
  project      = var.project_id
  account_id   = "github-actions-deployer"
  display_name = "NLM GitHub Actions deployer (${var.env})"
  description  = "WIF principal bound in Phase 48. No role bindings in Phase 45."
}

# Per-secret accessor binding — strictly scoped, no project-wide grant.
# for_each over the same secret set keeps the binding count == secret count.
resource "google_secret_manager_secret_iam_member" "cloudrun_accessor" {
  for_each = google_secret_manager_secret.app

  project   = var.project_id
  secret_id = each.value.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloudrun.email}"
}
```

### Pattern 6: `state.tf` stub (documentation only; optional import)

```hcl
# The GCS state bucket is bootstrapped manually via gcloud before `terraform init`
# (chicken-and-egg — TF cannot create the bucket that stores its own state).
# See README.md §Bootstrap.
#
# OPTIONAL: uncomment + `terraform import` to bring the live bucket under TF management
# for future attribute drift detection. Tradeoff: `terraform destroy` becomes a
# footgun — prevent_destroy mitigates but doesn't eliminate. Per D-06, import
# decision deferred to planner.
#
# resource "google_storage_bucket" "tfstate" {
#   name          = "nlm-tfstate"
#   project       = "nlm-prod"      # D-05: lives in prod project
#   location      = "US"            # multi-region for state durability
#   force_destroy = false
#
#   uniform_bucket_level_access = true   # boolean arg in provider 6.x+, not a block
#   public_access_prevention    = "enforced"
#
#   versioning {
#     enabled = true
#   }
#
#   lifecycle {
#     prevent_destroy = true   # D-05 — block accidental `terraform destroy`
#   }
# }
```

### Anti-Patterns to Avoid

- **Terraform workspaces for env separation** — Workspaces multiplex state within a single prefix. D-03 locks this out. Workspaces hide which env you're in behind a CLI state and tempt "apply to wrong workspace" incidents. Explicit `-var-file=staging.tfvars` + explicit `-backend-config=prefix=cloudrun/staging` keeps env intent visible in every invocation.
- **Variables in `backend` block** — Terraform evaluates backend before variables, so `bucket = var.state_bucket` throws "Variables may not be used here." Use partial config + `-backend-config=` flags.
- **Project-level `roles/secretmanager.secretAccessor`** — Over-privileged. Grants access to every future secret, not just the 13. Use `google_secret_manager_secret_iam_member` per secret.
- **Committing `terraform.tfvars` with project IDs** — `.gitignore` must include `*.tfvars` (or at least `.terraform.tfvars` and `*.auto.tfvars`). Phase 45's `staging.tfvars` + `prod.tfvars` are safe to commit because they only carry public IDs (project, region, env) — but review carefully for anything secret-shaped.
- **`disable_on_destroy = true` on `google_project_service`** — v7 default is `false` (safe). Setting `true` + running `terraform destroy` nukes APIs other phases depend on.
- **Skipping `depends_on = [google_project_service.apis]`** — First-apply race: Terraform can try to create a Secret Manager secret before the API finishes enabling. Failure message ("Secret Manager API has not been used...") is unfriendly. Always add the explicit edge.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Multi-env state separation | Custom bash wrapper that `rm -rf .terraform/` between envs | `terraform init -reconfigure -backend-config=prefix=cloudrun/<env>` + separate `-var-file` | Native pattern, documented in [Terraform GCS backend guide](https://developer.hashicorp.com/terraform/language/backend/gcs). Avoids init-cache corruption. |
| Secret value loading from `.env` | `data "local_file"` + `file()` parsing | `gcloud secrets versions add <name> --data-file=-` (out-of-band) | D-10: plaintext in tfstate = audit finding. Out-of-band population is the Google-recommended pattern. [CITED: [Secret Manager best practices](https://docs.cloud.google.com/secret-manager/docs/best-practices)] |
| Cross-project IAM grants | Hand-writing `google_project_iam_member` per (project, sa, role) | `for_each` over `google_secret_manager_secret.app` + `google_secret_manager_secret_iam_member` | Scales with secret count; least-privilege by construction. |
| GCS bucket bootstrap in TF | `google_storage_bucket` in the same module that uses it as backend | Manual `gcloud storage buckets create` once, optional `terraform import` after | Chicken-and-egg. Official pattern per [Google Cloud docs — store Terraform state](https://docs.cloud.google.com/docs/terraform/resource-management/store-state). |
| Waiting for API enablement | `sleep 30` in shell | `depends_on = [google_project_service.apis]` + retry in provider | Provider has built-in eventual-consistency retries. Explicit `depends_on` is the documented contract. |

**Key insight:** This phase is low-code, high-config. Every resource has a canonical `hashicorp/google` implementation — the risk is not "how do I build X" but "in what order do I apply X so nothing blocks on itself."

## Runtime State Inventory

> Phase 45 is greenfield (new `iac/cloudrun/`). The rename/refactor checklist applies because Phase 50 renames `infra/terraform/` → `iac/gce-judge0/`, but that's Phase 50's concern. For Phase 45 specifically:

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | None — no existing TF state for `iac/cloudrun/` (directory does not exist yet). The `nlm-tfstate` bucket does not yet exist in `nlm-prod`. | Bootstrap bucket + first `terraform init` creates the state file. |
| Live service config | GCP projects `nlm-prod` + `nlm-staging-493715` already exist (user-confirmed in memory `project_v15_direction.md`). Billing `01A910-0C5083-DCCFED` already linked. `gcloud auth login` already done. | None — pre-existing state supports the plan. |
| OS-registered state | None — no Windows tasks, systemd units, launchd plists involved in this phase. | None. |
| Secrets / env vars | The 13 Secret Manager secret **names** listed in D-09 will become env var binding targets in Phase 47. Values are NOT provisioned by TF (D-10). `.env.local` in repo points at current Supabase prod (will be reset by Phase 46). | Phase 45 creates shells only. Population + Cloud Run binding are Phase 46 / 47. |
| Build artifacts | `nlm-app:phase45-smoke` image will be pushed to staging Artifact Registry (D-16). No stale installed packages; `infra/terraform/.terraform/` is untouched and lives in its own module scope. | Verify smoke image is pullable by digest as end-of-phase gate. |

## Common Pitfalls

### Pitfall 1: Terraform CLI version mismatch (local is 1.5.7, provider 7 needs 1.6+)
**What goes wrong:** `terraform init` succeeds but `terraform plan` fails opaquely because an internal provider feature requires a newer CLI.
**Why it happens:** Google provider 7.x leans on ephemeral resources / write-only attributes introduced in Terraform 1.10. Minimum *publishable* is 1.6 because that's when `required_version` enforcement stabilized.
**How to avoid:** First task in plan: `terraform version` check. If < 1.6, `brew upgrade terraform` (macOS) before proceeding.
**Warning signs:** Error referencing "ephemeral" or "write-only" attributes; schema validation errors on API-less blocks.

### Pitfall 2: `serviceusage` + `cloudresourcemanager` bootstrap catch-22
**What goes wrong:** `terraform apply` on a fresh project fails with `Service Usage API has not been used in project <id> before or it is disabled.`
**Why it happens:** `google_project_service` is implemented as an API call that itself requires `serviceusage.googleapis.com`.
**How to avoid:** Before first `terraform init`, run per project:
```bash
gcloud services enable serviceusage.googleapis.com cloudresourcemanager.googleapis.com --project=${PROJECT_ID}
```
[CITED: [terraform-provider-google issue #14174](https://github.com/hashicorp/terraform-provider-google/issues/14174)]
**Warning signs:** First-apply failures on *any* `google_project_service` resource; `PERMISSION_DENIED` on the first API-dependent resource (Artifact Registry, Secret Manager) even though IAM looks right.

### Pitfall 3: GCS backend `prefix` cannot use variables
**What goes wrong:** `prefix = "cloudrun/${var.env}"` throws `Variables may not be used here`.
**Why it happens:** Terraform evaluates backend config before variable substitution — backend must be resolvable at init time.
**How to avoid:** Leave `prefix` unset in HCL; inject via `-backend-config="prefix=cloudrun/staging"` at init time. Document the two invocation lines in the README so there is zero ambiguity.
**Warning signs:** Init error mentioning "Variables may not be used here"; or worse, init silently succeeding against the wrong prefix (state pollution).

### Pitfall 4: `/api/health` is a dual-dependency smoke test
**What goes wrong:** D-15 says "`docker run` with dummy env must return 200 on `/api/health`" — but `src/app/api/health/route.ts` checks BOTH `prisma.$queryRaw SELECT 1` AND Judge0 `systemInfo`. A dummy env run returns **503** (`checks.db: disconnected`, `checks.judge0: unreachable`), not 200.
**Why it happens:** The health route was designed for a live-stack Cloud Run + Supabase + Judge0 topology. There's no "boot-only" mode.
**How to avoid:** Pick one:
- (Option A) Smoke against **staging Supabase** — set `DATABASE_URL` and `DIRECT_URL` in `dummy.env` to the staging pooler/direct URLs (phase-scoped credentials). `judge0` will still return `unreachable`; health returns 503. **Still fails D-15.**
- (Option B) Smoke with **local docker-compose** that pairs the app with a throwaway Postgres + the existing Judge0 docker-compose. Heavy. Takes 5 min to bring up.
- (Option C) **Relax D-15** to "build succeeds + container boots without crash + `/api/github/health` or a DB-free route returns 200." Recommended. Requires a Phase 45 addendum documenting the relaxation.
- (Option D) **Add a `/api/health/boot` endpoint** that returns 200 as long as the Next.js process is up — code change, out of D-15 scope.

**Recommended:** Option C with planner-authored addendum. D-15's intent is "Dockerfile is not broken." A live-dependency green-light is a Phase 47 concern (end-to-end Cloud Run smoke against staging Supabase).

**Warning signs:** Smoke job in Phase 45 "fails verification" for reasons unrelated to IaC — every future phase drags this red herring.

### Pitfall 5: `force_destroy = false` + `prevent_destroy = true` both on state bucket
**What goes wrong:** Running `terraform destroy` on the module the state bucket backs panics the provider (lifecycle block rejects destroy, provider already holds the lock).
**Why it happens:** Over-defensive layering. `prevent_destroy` is sufficient; `force_destroy = false` is only useful when the bucket has objects — which a state bucket will.
**How to avoid:** Set `force_destroy = false` on the tfstate bucket resource (if imported). `prevent_destroy = true` is the gate. Never run `terraform destroy` against the cloudrun module — treat it as append-only.
**Warning signs:** Team member asks "can I just `destroy` to reset?" — answer is always NO for this module.

### Pitfall 6: Secret Manager free-tier quota leak
**What goes wrong:** Creating 13 secrets × 2 projects × 2 replicas (auto) = 52 secret replicas. Free tier = 6 active replicas/month before billing starts.
**Why it happens:** `replication { auto {} }` replicates across multiple Google-managed regions. Each replica counts.
**How to avoid:** Free-tier math: active-secret replica count is billed per 10k access operations, not per storage replica. Storage cost is negligible below $0.06/month even at 52 replicas. [CITED: [Secret Manager pricing](https://cloud.google.com/secret-manager/pricing)] **Auto replication is safe at this scale.**
**Warning signs:** Unexpected "SecretManagerSecretCount" alerts in billing console — unlikely until Phase 50 adds Judge0 secrets (~16 more).

### Pitfall 7: Artifact Registry repo ID collision across projects
**What goes wrong:** Both projects have `repository_id = "nlm-app"`. A GH Actions workflow with hardcoded `us-central1-docker.pkg.dev/nlm-app/nlm-app` (omitting project) will push to whichever project `gcloud` is authed against — silent cross-env pollution.
**Why it happens:** Per-project repos with same name are valid (D-07 confirms this is intentional). Scripts must always include the project in the image URL.
**How to avoid:** Always use the full path: `us-central1-docker.pkg.dev/${PROJECT_ID}/nlm-app/nlm-app:${TAG}`. Phase 48 CI must template `PROJECT_ID` per env. Document in README.
**Warning signs:** Image appears "missing" in one project but is present in the other — symptom of project-less push.

## Code Examples

### Common Operation 1: Full bootstrap sequence (per project)

```bash
# Source: adapted from [Google Cloud — store Terraform state]
# (https://docs.cloud.google.com/docs/terraform/resource-management/store-state)
# Run ONCE. Idempotent re-run with `|| true` is safe.

# 1. Enable seed APIs that Terraform itself needs (chicken-and-egg fix)
gcloud services enable serviceusage.googleapis.com cloudresourcemanager.googleapis.com \
  --project=${PROJECT_ID}

# 2. (Once, for nlm-prod only — D-05) create the remote-state bucket
#    US multi-region for state durability, versioning on, uniform access
PROJECT_ID="nlm-prod"

gcloud storage buckets create gs://nlm-tfstate \
  --project=${PROJECT_ID} \
  --location=US \
  --uniform-bucket-level-access \
  --public-access-prevention

gcloud storage buckets update gs://nlm-tfstate --versioning

# 3. Verify
gsutil versioning get gs://nlm-tfstate     # Expected: Enabled
gsutil uniformbucketlevelaccess get gs://nlm-tfstate  # Expected: Enabled

# 4. (Optional per D-06) import into cloudrun module state so future edits
#    go through TF. Uncomment the state.tf block first, then:
# cd iac/cloudrun
# terraform init -backend-config="prefix=cloudrun/prod"
# terraform import google_storage_bucket.tfstate nlm-prod/nlm-tfstate
```

### Common Operation 2: Per-env plan/apply invocation

```bash
# Source: adapted from [Terraform GCS backend docs]
cd iac/cloudrun

# STAGING (nlm-staging-493715)
terraform init -reconfigure -backend-config="prefix=cloudrun/staging"
terraform plan  -var-file=staging.tfvars
terraform apply -var-file=staging.tfvars

# PROD (nlm-prod)
terraform init -reconfigure -backend-config="prefix=cloudrun/prod"
terraform plan  -var-file=prod.tfvars
terraform apply -var-file=prod.tfvars
```

### Common Operation 3: D-16 smoke image push

```bash
# Source: [Artifact Registry docker push docs]
PROJECT_ID="nlm-staging-493715"
REGION="us-central1"
REPO="nlm-app"
TAG="phase45-smoke"

# Configure docker auth against the registry (run once per host)
gcloud auth configure-docker ${REGION}-docker.pkg.dev

# Build + tag
docker build -t nlm-app:test .
docker tag nlm-app:test \
  ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/nlm-app:${TAG}

# Push
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/nlm-app:${TAG}

# Verify digest is recorded
gcloud artifacts docker images list \
  ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO} \
  --include-tags \
  --project=${PROJECT_ID}
# Expected: one row; TAG=phase45-smoke; DIGEST=sha256:...
```

### Common Operation 4: Populate a secret value out-of-band (Phase 46 territory, documented here for completeness)

```bash
# Source: [Secret Manager CLI docs]
# Phase 45 does NOT run this — secrets are shells only. Example for README so
# the runbook includes the hand-off to Phase 46.

echo -n "postgresql://postgres:....@aws-0-us-west-1.pooler.supabase.com:6543/postgres?connection_limit=5" \
  | gcloud secrets versions add DATABASE_URL \
    --data-file=- \
    --project=${PROJECT_ID}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `uniform_bucket_level_access { enabled = true }` (block) | `uniform_bucket_level_access = true` (bool) | provider 4.x → 5.x | Phase 45 uses the boolean form. Older docs may still show the block. |
| `google_project_service` default `disable_on_destroy = true` | default `false` | provider 7.0 GA (Oct 2025) | Phase 45 sets explicitly to `false` for clarity; either the default or the explicit setting is fine. |
| Service-account JSON key files in CI | Workload Identity Federation (OIDC) | 2023+ | Phase 48 wires WIF; Phase 45 only creates the empty SA. |
| `wait = true` on Judge0 | async submit + poll | v1.4 internal | Not relevant to Phase 45 IaC; carryover decision noted for Phase 47+. |
| Cloud Run deploys by tag | Cloud Run deploys by digest | Google recommends since 2022 | INFRA-02 locks digest-only; Phase 48 enforces in CI. |

**Deprecated / outdated:**
- `gcloud beta secrets` — Secret Manager is GA; use `gcloud secrets`.
- `terraform workspace` for env separation — still supported, but discouraged for multi-cloud / multi-project setups. [CITED: [Handling Terraform State in Multi-Env](https://wintelguy.com/2025/handling-terraform-state-in-multi-environment-deployments.html)]
- `google-beta` provider for Secret Manager — all needed features are in `google` 7.x.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | User already has Owner or Editor on both GCP projects | §Bootstrap | Can't enable APIs / create resources; first `gcloud services enable` fails with `PERMISSION_DENIED`. Low risk — user confirmed `gcloud auth login` done in memory `project_v15_direction.md`. |
| A2 | The 13 secret names in D-09 cover every `process.env.*` read by the app | §Secret Manager | Phase 47 Cloud Run deploy succeeds, but app hits undefined env at runtime. MEDIUM risk — planner should grep `process.env` in `src/` and cross-check. |
| A3 | `nlm-tfstate` bucket name is globally available in GCS | §GCS Bootstrap | `gcloud storage buckets create` fails with 409. LOW risk but VERIFY before running — bucket names are global. Suggested fallback: `nlm-tfstate-${random_suffix}`. |
| A4 | `us-central1` is the only region needed | §Artifact Registry | Multi-region serving (INFRA-05 prod LB) may want the Artifact Registry closer to Cloud Run. LOW risk — Cloud Run pulls across regions are cheap and fast. |
| A5 | Auto replication is Google-default and free at <13 secrets | §Pitfall 6 | Billing surprise. LOW — pricing verified below free-tier storage. |
| A6 | The smoke test relaxation (Pitfall 4, Option C) is acceptable to user | §Dockerfile Smoke | Phase 45 "verification" argued over. MEDIUM — planner must surface this explicitly and get /discuss sign-off OR land Option A (staging Supabase creds in dummy.env). |

## Open Questions

1. **Should we `terraform import` the manually-bootstrapped bucket?**
   - What we know: D-06 leaves this optional; planner decides.
   - What's unclear: Tradeoff between "import = future drift detection" vs "import = easier-to-accidentally-destroy."
   - Recommendation: Leave the `state.tf` as a commented stub (Pattern 6). Add a one-line README note: "Bucket is deliberately NOT in TF state; manage via gcloud only." Matches the Atmos / Gruntwork industry-standard bootstrap pattern.

2. **Is `disable_on_destroy = false` the right call for `serviceusage` and `cloudresourcemanager` specifically?**
   - What we know: These are the two seed APIs. Destroying them would brick the project's TF management.
   - What's unclear: If user deletes the project later, leaving APIs enabled is harmless.
   - Recommendation: `disable_on_destroy = false` for all 10-12 managed APIs. v7 default aligns.

3. **Does D-09's secret list match the app's actual `process.env.*` reads?**
   - What we know: The list was captured during /discuss.
   - What's unclear: Whether new code (e.g., v1.4 coding challenges) added any reads not in the list.
   - Recommendation: Planner task: `rg 'process\.env\.[A-Z_]+' src/ | sed -E 's/.*process\.env\.([A-Z_]+).*/\1/' | sort -u` and reconcile against D-09. Missing entries go into a Phase 46 backlog.

4. **Cloud Build API enablement — keep or drop?**
   - What we know: D-12 marks it optional. GH Actions in Phase 48 does all builds on runner-side, so `cloudbuild.googleapis.com` shouldn't be needed.
   - Recommendation: Drop from v1.5 initial list. Easy to add in a future phase (single-line addition).

5. **`nlm-tfstate` bucket location: US multi-region vs us-central1 regional?**
   - What we know: D-05 doesn't specify. Reference `infra/terraform/README.md` used `${REGION}` (regional).
   - Recommendation: US multi-region (`location = "US"`). State file durability > latency. Cost delta is ~$0.00001/month at <1MB state.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Terraform CLI | `terraform init/plan/apply` | Yes (but **below minimum**) | 1.5.7 (needs ≥ 1.6) | `brew upgrade terraform` before first plan |
| gcloud | Bucket bootstrap, API enablement, secret versions, smoke verification | Yes | 547.0.0 | — |
| gsutil | Legacy bucket commands (versioning check) | Yes | 5.35 | `gcloud storage` equivalents exist |
| docker | Smoke build, D-16 push | Yes | 24.0.7 | — |
| GCP auth | `gcloud services enable`, bucket create | Yes (`gcloud auth login` done) | — | — |
| `hashicorp/google` provider | Module apply | Auto-downloaded by `terraform init` | 7.28.0 (current) | Pin `~> 7.0` in `providers.tf` |
| Node.js | Docker build stage | Yes (v24.2 local, v22-alpine in Docker) | — | — |
| GCP project `nlm-prod` | State bucket host, prod resources | Yes (user-confirmed) | — | — |
| GCP project `nlm-staging-493715` | Staging resources | Yes (user-confirmed) | — | — |
| GCP billing `01A910-0C5083-DCCFED` | All provisioning | Yes (linked per discover) | — | — |

**Missing dependencies with no fallback:**
- None blocking — Terraform upgrade is trivial.

**Missing dependencies with fallback:**
- Terraform 1.6+ via `brew upgrade terraform`. Plan task: add as the first preflight step.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Terraform native (`terraform validate`, `terraform plan`) + gcloud CLI assertions. No vitest/unit tests — this phase is infra provisioning, not app code. |
| Config file | `iac/cloudrun/providers.tf` |
| Quick run command | `terraform validate && terraform fmt -check` (no network) |
| Full suite command | `terraform plan -var-file=${env}.tfvars` + gcloud assertion script |
| Phase gate | All 5 INFRA-0x requirements verified via commands below; planner authors a shell script `iac/cloudrun/scripts/verify-phase-45.sh` that runs every assertion and exits non-zero on first failure. |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFRA-01 | `iac/cloudrun/` module structure is executable (Cloud Run services come in P47) | integration | `cd iac/cloudrun && terraform init -backend-config="prefix=cloudrun/staging" && terraform validate && terraform plan -var-file=staging.tfvars -detailed-exitcode` (exit 0 or 2; 1 = error) | ❌ Wave 0 |
| INFRA-02 | Artifact Registry `nlm-app` exists in both projects | smoke | `gcloud artifacts repositories describe nlm-app --location=us-central1 --project=nlm-staging-493715` AND `... --project=nlm-prod` (both exit 0); plus `gcloud artifacts docker images list us-central1-docker.pkg.dev/nlm-staging-493715/nlm-app --include-tags` shows `phase45-smoke` tag with a digest | ❌ Wave 0 |
| INFRA-03 | All 13 secrets exist in both projects | smoke | `gcloud secrets list --project=nlm-staging-493715 --format="value(name)" \| sort` shows all 13 names; repeat for `nlm-prod`; diff against expected list | ❌ Wave 0 |
| INFRA-06 | GCS `nlm-tfstate` holds state with versioning | smoke | `gsutil versioning get gs://nlm-tfstate` outputs `Enabled`; `gsutil uniformbucketlevelaccess get gs://nlm-tfstate` shows Enabled; `gsutil ls gs://nlm-tfstate/cloudrun/staging/default.tfstate` + `gsutil ls gs://nlm-tfstate/cloudrun/prod/default.tfstate` both succeed after first apply | ❌ Wave 0 |
| INFRA-07 | Dockerfile builds unmodified + container serves `/api/health` | smoke | `docker build -t nlm-app:test .` exits 0; `docker run --rm --env-file dummy.env -p 3000:3000 nlm-app:test` boots; `curl -sf -w '%{http_code}' http://localhost:3000/api/health` — **see Pitfall 4; expected value depends on chosen option (A/B/C/D)** | ❌ Wave 0 + **planner decides the relaxation** |

### Sampling Rate

- **Per task commit:** `terraform validate && terraform fmt -check` (offline, fast)
- **Per wave merge:** `terraform plan -var-file=staging.tfvars -detailed-exitcode`
- **Phase gate:** Full `verify-phase-45.sh` runs against both projects, requires green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `iac/cloudrun/providers.tf` + `variables.tf` + `apis.tf` + `state.tf` + `registry.tf` + `secrets.tf` + `iam.tf` + `outputs.tf` — covers INFRA-01..03, 06
- [ ] `iac/cloudrun/staging.tfvars` + `prod.tfvars` — per-env vars
- [ ] `iac/cloudrun/README.md` — bootstrap sequence, apply/plan invocations, smoke verification
- [ ] `iac/cloudrun/scripts/verify-phase-45.sh` — automated assertion runner
- [ ] `iac/cloudrun/dummy.env` (gitignored) — smoke test env for INFRA-07
- [ ] Framework install: `brew upgrade terraform` (preflight for CLI ≥ 1.6)
- [ ] Pre-apply: `gcloud services enable serviceusage.googleapis.com cloudresourcemanager.googleapis.com` per project

*(No vitest coverage needed — this phase has no app-code changes. `npm run test` continues to pass against existing 963 tests.)*

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | partial | GCP ADC (`gcloud auth login`) is the human-side. WIF (Phase 48) is machine-side. |
| V3 Session Management | no | No sessions in IaC. |
| V4 Access Control | yes | Least-privilege IAM: per-secret `secretAccessor` binding only on `nlm-cloudrun-sa`; no project-level grant; `github-actions-deployer` has zero bindings until Phase 48. |
| V5 Input Validation | n/a | No user input in IaC. |
| V6 Cryptography | yes (partial) | GCS `nlm-tfstate` + Secret Manager use Google-managed default encryption. CMEK is deferred (documented in `infra/terraform/README.md` as optional hardening). |

### Known Threat Patterns for {GCP IaC / secrets}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Plaintext secrets in tfstate | Information Disclosure | D-10: TF owns only secret shells; values added via `gcloud secrets versions add` out-of-band. State file contains no secret material. |
| tfstate bucket public exposure | Information Disclosure | `public_access_prevention = enforced`, `uniform_bucket_level_access = true`, IAM restricted to user + CI SA. |
| `terraform destroy` wipes tfstate bucket | Denial of Service | `prevent_destroy = true` on bucket; bucket not in module state (per recommendation) so destroy is a no-op. |
| Over-privileged Cloud Run SA | Elevation of Privilege | Per-secret `secretAccessor` binding only. No `secretmanager.admin`, no project-level role. |
| SA JSON keys committed | Spoofing | No keys created in Phase 45. WIF replaces keys in Phase 48. `github-actions-deployer` has no key material ever. |
| Image tampering between push and Cloud Run pull | Tampering | Digest-only pulls (INFRA-02). Phase 48 CI captures digest from push, injects into deploy. Binary Authorization deferred. |
| Accidental cross-env state write | Tampering | Explicit `-var-file` + `-backend-config=prefix=` per env. No workspaces. README documents the full invocation. |
| API enablement flap (attacker disables) | Denial of Service | `disable_on_destroy = false` on all managed APIs. Project-level `serviceusage.services.disable` permission is bound to Owner only. |
| Artifact Registry public expose | Information Disclosure | Default = private. Phase 45 does NOT set `public_repository` (v7 default is off). |
| `serviceusage` / `cloudresourcemanager` bootstrap gap | Denial of Service (self-inflicted) | README documents the seed-API enable step as a prerequisite to `terraform init`. |

## Sources

### Primary (HIGH confidence)

- [Terraform — Backend Type: gcs (HashiCorp)](https://developer.hashicorp.com/terraform/language/backend/gcs) — backend block syntax, `-backend-config=` pattern
- [google_artifact_registry_repository source markdown (hashicorp/terraform-provider-google)](https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/artifact_registry_repository.html.markdown) — required args, import format
- [google_secret_manager_secret source markdown](https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/secret_manager_secret.html.markdown) — replication modes, import format
- [google_storage_bucket source markdown](https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/storage_bucket.html.markdown) — versioning, uniform access, lifecycle
- [google_project_service source markdown](https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/google_project_service.html.markdown) — `disable_on_destroy` semantics
- [v7 upgrade guide (raw v7.0.0 tag)](https://raw.githubusercontent.com/hashicorp/terraform-provider-google/v7.0.0/website/docs/guides/version_7_upgrade.html.markdown) — confirmed `disable_on_destroy` default flip, retention_period type change
- [Google Cloud — Store Terraform state in a Cloud Storage bucket](https://docs.cloud.google.com/docs/terraform/resource-management/store-state) — canonical GCS backend bootstrap
- [Google Cloud — Import resources into Terraform state](https://docs.cloud.google.com/docs/terraform/resource-management/import) — `terraform import` command
- [Google Cloud — Secret Manager best practices](https://docs.cloud.google.com/secret-manager/docs/best-practices) — least privilege at resource level
- [Google Cloud — Artifact Registry push/pull](https://docs.cloud.google.com/artifact-registry/docs/docker/pushing-and-pulling) — digest vs tag pulls, Cloud Run integration
- [HashiCorp releases — terraform-provider-google versions](https://releases.hashicorp.com/terraform-provider-google/) — current stable 7.28.0 (2026-04-14)
- Local tool probes — terraform 1.5.7, gcloud 547.0.0, docker 24.0.7, gsutil 5.35 (all confirmed available)
- Project files read — CLAUDE.md, CONTEXT.md, REQUIREMENTS.md, STATE.md, ROADMAP.md, PROJECT.md, PIPELINE-DISCOVER.md, Dockerfile, next.config.ts, prisma.config.ts path, `src/app/api/health/route.ts`, existing `infra/terraform/` module

### Secondary (MEDIUM confidence)

- [Scalr — Using the GCS Backend Block in Terraform](https://scalr.com/learning-center/using-the-gcs-backend-block-in-terraform/) — prefix pattern verified against official docs
- [WintelGuy — Handling Terraform State in Multi-Environment Deployments](https://wintelguy.com/2025/handling-terraform-state-in-multi-environment-deployments.html) — tfvars vs workspaces tradeoff
- [HashiCorp blog — Terraform Google Provider 7.0 GA](https://www.hashicorp.com/en/blog/terraform-provider-for-google-cloud-7-0-is-now-ga) — release announcement
- [InfoQ — Terraform Google Provider 7.0 GA](https://www.infoq.com/news/2025/10/terraform-google-provider-7-ga/) — release coverage
- [Atmos — automatic backend provisioning](https://atmos.tools/changelog/automatic-backend-provisioning) — industry pattern for bootstrap chicken-and-egg
- [terraform-provider-google issue #14174 — Enable Service Usage API by default](https://github.com/hashicorp/terraform-provider-google/issues/14174) — seed API requirement
- [terraform-google-modules/terraform-google-bootstrap](https://github.com/terraform-google-modules/terraform-google-bootstrap) — reference for seed API pattern

### Tertiary (LOW confidence — cross-verified)

- [OneUptime blog series on GCP Terraform (2026-02)](https://oneuptime.com/blog/post/2026-02-23-terraform-gcs-backend/view) — general pattern; verified against official docs before inclusion
- [Medium — Paul Ravvich — Terraform for GCP Artifact Registry](https://medium.com/terraform-using-google-cloud-platform/terraform-for-gcp-how-to-create-artifact-registry-6e83ae8633a5) — one example; confirmed against provider source

## Metadata

**Confidence breakdown:**

- **Standard stack:** HIGH — provider version + min Terraform CLI verified against provider source + hashicorp releases page
- **Architecture:** HIGH — all HCL snippets mirror the official provider resource markdown, cross-verified against v1.4 `infra/terraform/` which followed the same conventions
- **Pitfalls:** HIGH for 1-3, 5-7 (verified via GitHub issues + Google docs); HIGH for 4 — confirmed by reading `src/app/api/health/route.ts` (pings Prisma AND Judge0)
- **Validation:** HIGH — all verification commands confirmed with `gcloud <cmd> --help` during research

**Research date:** 2026-04-18
**Valid until:** 2026-05-18 (30 days — provider stable, no major GCP API changes imminent)
