# Phase 45: Terraform Skeleton + Artifact Registry + Secret Manager - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `45-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-04-18
**Phase:** 45-terraform-skeleton-artifact-registry-secret-manager
**Mode:** `--auto`
**Areas discussed:** Module layout, Remote state, Artifact Registry, Secret Manager, GCP API enablement, Service accounts, Dockerfile verification

---

## Module Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Split by resource type (`providers.tf`, `registry.tf`, `secrets.tf`, `iam.tf`, ...) with per-env `.tfvars` | Matches v1.4 `infra/terraform/` style; one root module; per-env config via `-var-file` | ✓ |
| Split by env (`staging/` + `prod/` root modules) | Max isolation; duplicated HCL |  |
| Terraform workspaces (single module, `workspace new staging`) | Implicit env switching; workspaces hide state bucket/project differences |  |

**Rationale (auto):** Single root module + `.tfvars` is the GCP-community default and matches the v1.4 patterns already in repo. Workspaces make cross-project auditing harder.

---

## Remote State Location

| Option | Description | Selected |
|--------|-------------|----------|
| GCS bucket `nlm-tfstate` in `nlm-prod` project, prefix-per-env | Long-lived project; versioning + uniform access; shared bucket, isolated prefixes | ✓ |
| GCS bucket in each env's own project (two buckets) | Max isolation; 2x setup; env-to-env cross-access messier |  |
| Dedicated third project `nlm-tfstate` for state | Cleanest isolation; extra project overhead + billing link required |  |

**Rationale (auto):** Single bucket in `nlm-prod` is the Google-recommended pattern for small-org Terraform. Prefix separation (`cloudrun/staging` vs `cloudrun/prod`) matches backend config style. Dedicated state project is overkill at this scale.

---

## Artifact Registry Naming

| Option | Description | Selected |
|--------|-------------|----------|
| `nlm-app` per project (Docker, us-central1) | Simple, name matches app | ✓ |
| `nlm-app-{env}` per project | Redundant — project already scopes env |  |
| Single shared repo in one project, cross-project IAM | Single image pull path but cross-project image pulls add latency + complexity |  |

**Rationale (auto):** Per-project repo with identical name (`nlm-app`) makes deploy paths symmetric; the project ID carries the env distinction.

---

## Image Tagging / Pull Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Push `:latest` + digest; Cloud Run pulls by digest | Best practice — tags for humans, digests for prod | ✓ |
| Push semver tags (`v1.5.0-rc1`, …) + digest | Requires tag-management automation |  |
| Push digest-only | Hard for humans to diff revisions in Registry UI |  |

**Rationale (auto):** Digest-pinning deploys are immutable; human-readable `:latest` helps discover the current staging image when debugging. INFRA-02 explicitly requires digest-only at Cloud Run.

---

## Secret Naming Convention

| Option | Description | Selected |
|--------|-------------|----------|
| Plain names (`DATABASE_URL`, `OPENAI_API_KEY`) per project | Project boundary = env boundary — no prefix needed | ✓ |
| Env-prefixed (`staging-database-url`) | Explicit but redundant given project separation |  |
| App-prefixed (`nlm-database-url`) | Useful if sharing with other apps — we are not |  |

**Rationale (auto):** Plain names mirror the `process.env.X` shape in Next.js code, making Secret Manager → Cloud Run env-var mounts 1:1.

---

## Secret Value Population

| Option | Description | Selected |
|--------|-------------|----------|
| Terraform defines `google_secret_manager_secret` only; values set via `gcloud secrets versions add` | Keeps plaintext out of tfstate; still-idempotent schema | ✓ |
| Terraform also manages `google_secret_manager_secret_version` with values in tfvars | Fully declarative but plaintext ends up in state |  |
| Use SOPS/vault integration | Over-engineered for v1.5 scale |  |

**Rationale (auto):** Plaintext in tfstate violates env hygiene rule carried from discover. Gcloud CLI add-version is one-command, documented in README.

---

## Service Account Scaffolding

| Option | Description | Selected |
|--------|-------------|----------|
| Create `nlm-cloudrun-sa` + `github-actions-deployer` in Phase 45 (empty bindings deferred per concern) | SAs exist up-front; Phase 47/48 attach roles | ✓ |
| Defer SAs to the phases that use them (Phase 47 creates CR SA, Phase 48 creates GH SA) | Each phase owns its SA |  |

**Rationale (auto):** Attaching `secretAccessor` to SAs in Phase 45 means Phase 47 can deploy Cloud Run with secret mounts on day one — removes a cross-phase circular dep. GH Actions SA exists but has no bindings in 45 (WIF pool is Phase 48 work).

---

## Dockerfile Verification

| Option | Description | Selected |
|--------|-------------|----------|
| No edits to Dockerfile; verify `docker build` + `docker run --env-file dummy.env` serves `/api/health` 200 | INFRA-07 says "unmodified" — just confirm it works on the Cloud Run target | ✓ |
| Rewrite to match a Cloud Run-specific reference | Not requested — premature |  |

**Rationale (auto):** INFRA-07 is explicit about no Dockerfile changes. Verification only.

---

## Claude's Discretion

- HCL file granularity (merging `iam.tf` into `secrets.tf` if small).
- Exact API list — may trim `cloudbuild.googleapis.com` if demonstrably unused.
- Whether to import the bootstrapped state bucket into TF (nice-to-have; planner decides).
- README content structure inside `iac/cloudrun/`.

## Deferred Ideas

- TF lint / validate in CI → Phase 48.
- TF plan-on-PR automation → Phase 48+.
- Secret rotation automation → v1.6+.
- Binary Authorization / image signing beyond digest-pin → v1.6+.
- Multi-region Cloud Run → out of scope.
- VPC Service Controls / Org Policy → out of scope.
