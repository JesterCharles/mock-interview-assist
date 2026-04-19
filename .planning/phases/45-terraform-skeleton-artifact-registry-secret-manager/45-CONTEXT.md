# Phase 45: Terraform Skeleton + Artifact Registry + Secret Manager - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning
**Mode:** `--auto` (recommended defaults selected)

<domain>
## Phase Boundary

Phase 45 delivers the **executable IaC foundation** for Cloud Run: a new `iac/cloudrun/` Terraform module that provisions the remote state backend (GCS `nlm-tfstate`), Artifact Registry repositories in both `nlm-staging-493715` and `nlm-prod`, Secret Manager secret definitions for every runtime env var, and enables all GCP APIs needed by later phases (47 creates Cloud Run services, 48 wires CI/CD).

**In scope:** `iac/cloudrun/` module + GCS state + Artifact Registry + Secret Manager + required GCP API enablement + Dockerfile build verification.

**Out of scope:** Cloud Run services themselves (Phase 47), Load Balancer + SSL (Phase 47), GH Actions (Phase 48), DNS (Phase 51-52), Supabase env work (Phase 46).

</domain>

<decisions>
## Implementation Decisions

### Terraform Module Layout
- **D-01:** New directory `iac/cloudrun/` created fresh. **Existing `infra/terraform/` (v0.1 GCE + v1.4 Judge0 VM) left untouched** in 45. Phase 50 renames/labels it as `iac/gce-judge0/` per JUDGE-INTEG-04.
- **D-02:** Module split by resource type (not by env): `providers.tf`, `variables.tf`, `apis.tf`, `state.tf` (doc-only stub — bucket is bootstrapped manually before first apply), `registry.tf`, `secrets.tf`, `iam.tf`, `outputs.tf`. One root module, per-env `*.tfvars`.
- **D-03:** Multi-env = **separate `.tfvars` files** (`staging.tfvars`, `prod.tfvars`) + explicit `-var-file` invocation. **Not Terraform workspaces** (workspaces hide state bucket/project differences; explicit files are easier to review).
- **D-04:** `backend "gcs"` block uses variable-less bucket (`bucket = "nlm-tfstate"`) with **`prefix` differentiating env**: `cloudrun/staging` vs `cloudrun/prod`. Each env's state lives in a separate prefix in the same bucket.

### Remote State (GCS bucket `nlm-tfstate`)
- **D-05:** Bucket lives in the **`nlm-prod` project** (less churn risk than staging; prod project is long-lived). Versioning on. Uniform bucket-level access. `lifecycle { prevent_destroy = true }` on the bucket resource.
- **D-06:** Bucket is **bootstrapped manually once** via `gcloud` before `terraform init` (chicken-and-egg: TF needs the bucket to exist to store state for the module that creates it). Bootstrap commands documented in `iac/cloudrun/README.md`. After bootstrap, the bucket is imported into TF state so future edits are managed (optional — can leave bootstrapped-only).

### Artifact Registry
- **D-07:** One `google_artifact_registry_repository` per project, both named **`nlm-app`**, format `DOCKER`, region `us-central1`. No shared cross-project repo.
- **D-08:** Image tagging convention: push by both `:latest` (for human pulls + rollback discovery) **AND** immutable digest. Cloud Run deploys **pull by digest only** (per INFRA-02). GH Actions in Phase 48 writes the digest output to the deploy step.

### Secret Manager
- **D-09:** **One Secret Manager secret per env var per project.** Project boundary = env boundary, so names are plain (no `staging-` prefix): `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `OPENAI_API_KEY`, `RESEND_API_KEY`, `GITHUB_TOKEN`, `NEXT_PUBLIC_SITE_URL`, `ADMIN_EMAILS`, `JUDGE0_URL`, `JUDGE0_AUTH_TOKEN`, `CODING_CHALLENGES_ENABLED`.
- **D-10:** Terraform defines **secret resources** (`google_secret_manager_secret`) with automatic replication; **values are populated out-of-band** via `gcloud secrets versions add` or console. Rationale: keeps plaintext out of tfstate.
- **D-11:** Each Cloud Run service account (created in Phase 47) will receive `roles/secretmanager.secretAccessor` on these secrets. Phase 45 provisions the service accounts themselves (empty, no bindings to Cloud Run yet).

### GCP API Enablement
- **D-12:** `google_project_service` resources enable: `artifactregistry.googleapis.com`, `secretmanager.googleapis.com`, `run.googleapis.com`, `compute.googleapis.com` (needed for LB in Phase 47), `iam.googleapis.com`, `iamcredentials.googleapis.com` (WIF in Phase 48), `cloudresourcemanager.googleapis.com`, `serviceusage.googleapis.com`, `storage.googleapis.com`, `monitoring.googleapis.com`, `logging.googleapis.com`, `cloudbuild.googleapis.com` (optional — GH Actions does builds, but kept for terraform plan flexibility).

### Service Accounts (scaffolded in 45, bound in 47/48)
- **D-13:** Create two empty service accounts per project:
  - `nlm-cloudrun-sa` — runtime identity for Cloud Run (secretAccessor bindings added here; Cloud Run service binding in Phase 47).
  - `github-actions-deployer` — WIF principal for CI/CD (bindings added in Phase 48).
- **D-14:** Secret accessor bindings are attached in **Phase 45** (so secrets are ready-to-mount when Phase 47 creates Cloud Run services). GH Actions binding deferred to Phase 48 where WIF pool is created.

### Dockerfile Verification (INFRA-07)
- **D-15:** **No Dockerfile changes in Phase 45.** Current Dockerfile already produces Next.js standalone output + runs on `node:22-alpine`. Phase 45 verification = `docker build -t nlm-app:test .` succeeds locally **AND** `docker run` against dummy env vars serves `/api/health` with HTTP 200. If either fails, capture root cause in `.planning/phases/45-*/DOCKER-NOTES.md` and escalate as a Phase 45 blocker.
- **D-16:** Docker build output digest pushed manually to staging Artifact Registry as the first smoke test of end-to-end IaC + Registry wiring. Image tag `nlm-app:phase45-smoke`.

### Claude's Discretion
- Exact HCL module file granularity (e.g., merging `iam.tf` into `secrets.tf` if bindings are few) — planner picks based on resource count.
- Precise list of GCP APIs (may drop `cloudbuild` if demonstrably unused in 45).
- Whether to import the manually-bootstrapped GCS state bucket into TF state (optional; planner decides based on TF version / lifecycle concerns).
- README structure inside `iac/cloudrun/` (planner writes).

### Folded Todos
None — no backlog items matched Phase 45.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone anchor
- `.planning/REQUIREMENTS.md` §Infrastructure — INFRA-01..03, INFRA-06..07 full text (Phase 45 req set)
- `.planning/ROADMAP.md` §v1.5 Phase 45 — success criteria 1-5
- `.planning/PROJECT.md` — v1.5 milestone summary + Cloud Run + Supabase decision rationale
- `.planning/PIPELINE-DISCOVER.md` — discover brief (Approach C Hybrid decision + env hygiene rule)
- `.planning/DEPLOY.md` — current deploy doc (v0.1 GCE); will be superseded by v1.5 runbook in Phase 53

### Existing infrastructure (reference-only, do not modify in 45)
- `infra/terraform/` — v0.1 + v1.4 GCE/Judge0 TF (will be relabeled in Phase 50 per JUDGE-INTEG-04)
- `Dockerfile` — production image (validated by D-15; no edits expected)
- `docker-compose.yml`, `docker-compose.expose-judge0.yml` — local dev; untouched in 45

### Environment
- User-confirmed IDs (memory `project_v15_direction.md` + PIPELINE.md):
  - GCP projects: `nlm-prod`, `nlm-staging-493715` (both exist as of 2026-04-18)
  - GCP billing: `01A910-0C5083-DCCFED` ("My Billing Account")
  - Supabase staging: project ref `lzuqbpqmqlvzwebliptj`
  - DNS: Cloudflare Free Tier on `nextlevelmock.com`
  - GCP auth: `gcloud auth login` already done by user

### External specs
- Google Cloud: Artifact Registry docs (`google_artifact_registry_repository`), Secret Manager docs (`google_secret_manager_secret` + replication), GCS backend for TF (`backend "gcs"`).
- Hashicorp: Terraform root module + `-var-file` pattern.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`Dockerfile`** — already produces standalone Next.js on `node:22-alpine`. Validated as-is per D-15. No edits.
- **`prisma/schema.prisma` + `prisma.config.ts`** — Prisma setup already handles Supabase Transaction Pooler + direct URL pattern. Migrations run during Docker build via postinstall. No changes in 45; Phase 46 wires `migrate deploy` into CI.
- **`infra/terraform/` (v1.4)** — reference template for module layout, provider blocks, variable patterns. Not copied; structure echoed.

### Established Patterns
- **Env vars via `.env` / `process.env`** — Cloud Run env-var binding to Secret Manager matches existing `src/lib/prisma.ts` + `src/lib/supabase*.ts` shape. No code changes in 45.
- **GitHub Actions not yet wired** — no `.github/workflows/` deploy yet. Phase 48 adds.

### Integration Points
- Future Phase 47 will reference these outputs from `iac/cloudrun/`:
  - `artifact_registry_repository_id` (per env)
  - `cloudrun_service_account_email` (per env)
  - `secret_ids` list (for Cloud Run env-var mounting)
- Future Phase 48 will reference:
  - `github_actions_sa_email` (WIF principal)

</code_context>

<specifics>
## Specific Ideas

- User explicitly wants **prod Supabase left clean** — but that's Phase 46's concern, not 45. Do not touch Supabase in 45.
- User mentions **burning GCP credits** (INFRA-04 `min-instances=0` even in prod) — Phase 45 doesn't set scaling; just noted as the scaling intent for Phase 47.
- **`gcloud auth login` already done.** Planner should not include "have user run gcloud auth login" as a step.
- **Billing account** `01A910-0C5083-DCCFED` already linked to both projects per discover.

</specifics>

<deferred>
## Deferred Ideas

- **Terraform CI validation** (`terraform fmt -check`, `terraform validate`, `tflint` in CI) — belongs in Phase 48 (CI pipeline).
- **Terraform plan on PR** (github action to post `terraform plan` diff as PR comment) — Phase 48+.
- **Secret rotation automation** — out of scope for v1.5. Manual rotation documented in Phase 53 runbook.
- **VPC Service Controls / Org Policy hardening** — out of scope v1.5 (single-project scope too small to justify).
- **Binary Authorization / image signing** — deferred to v1.6+ (INFRA-02 says "signed images" via digest-pinning only; Binary Authorization = next tier up).
- **Multi-region Cloud Run** — out of scope v1.5. Single region `us-central1`.

### Reviewed Todos (not folded)
None — no todo matches from `todo match-phase 45`.

</deferred>

---

*Phase: 45-terraform-skeleton-artifact-registry-secret-manager*
*Context gathered: 2026-04-18 (auto mode)*
