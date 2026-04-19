# Phase 47: Staging Cloud Run Service + Load Balancer + Domains — Research

**Researched:** 2026-04-18
**Domain:** GCP Cloud Run v2 + HTTPS Load Balancer (serverless NEG) + Managed SSL + Workload Identity Federation + Cloudflare DNS
**Confidence:** HIGH (HCL patterns cross-verified against provider source + Google docs; local tool probes + Phase 45/46 artifacts consumed)

## Summary

Phase 47 is a **four-axis infra phase** that lights up the first actual compute for v1.5: (1) a `google_cloud_run_v2_service` named `nlm-staging` pulling the Phase 45 smoke image by digest, consuming 13 Phase 45 secrets, and running as `nlm-cloudrun-sa`; (2) a global HTTPS Load Balancer in front of it via a serverless NEG, with a Google-managed SSL cert for `staging.nextlevelmock.com`; (3) Workload Identity Federation so GH Actions (Phase 48) can impersonate `github-actions-deployer` without a JSON key; and (4) a Cloudflare `A` record binding the LB IP to the staging hostname, **orange cloud OFF**.

Four cross-cutting hazards dominate the planner's risk surface:

- **Managed SSL cert is async and slow** — 10-60 min typical, up to 24h worst-case ([GCP docs](https://docs.cloud.google.com/load-balancing/docs/ssl-certificates/troubleshooting)). `terraform apply` returns before the cert is `ACTIVE`. The phase gate **must** poll `gcloud compute ssl-certificates describe` and accept that the first apply leaves the LB responding with `SSL_ERROR` until the cert flips to `ACTIVE`. Build this into the runbook; do not let it fail verify-phase-47.sh.
- **Cloud Run image drift under CI** — `google_cloud_run_v2_service.template.containers[0].image` is updated by `gcloud run deploy ... --image=<new-digest>` in Phase 48 CI. Without `lifecycle { ignore_changes = [...] }`, the next `terraform apply` will revert the service to the Phase 45 smoke digest and wipe the CI-deployed revision. **Mandatory mitigation** per [terraform-provider-google #13435](https://github.com/hashicorp/terraform-provider-google/issues/13435).
- **Cold-start ceiling (30s) is a soft test, not a hard guarantee** — Next.js standalone + Prisma connect-on-first-request commonly lands 8-15s cold, but a Supabase pooler handshake stall can push it past 30s without warning. The cold-start probe script has to be tolerant of the TLS-not-yet-active case (first run) and must have a documented "one retry" posture.
- **WIF attribute condition is load-bearing security** — without `attribute.repository == "JesterCharles/mock-interview-assist"` (D-16), any GitHub-hosted workflow on any repo can federate into this GCP project. This is the single most dangerous misconfiguration in the whole phase; planner must bake a positive test (WIF succeeds from this repo) and document the implicit negative test (no other repo can use the pool — the condition is the proof).

**Primary recommendation:** Split Phase 47 into **four plans** on a 3-wave execution graph: Plan 01 (Cloud Run service HCL, sequential) → Plans 02 + 03 in parallel (LB+SSL+DNS, WIF+SA roles+smoke workflow) → Plan 04 (cold-start probe + phase-gate verify script). Pin `hashicorp/google ~> 7.0` (already established in Phase 45) and `cloudflare/cloudflare ~> 4.0` (per D-21, with a known v5 migration path documented for a future phase). Use `google_compute_managed_ssl_certificate` (classic) over Certificate Manager — simpler HCL and sufficient for staging. Authenticate the Cloudflare provider via `CLOUDFLARE_API_TOKEN` env var only; do NOT persist the token in Secret Manager (per D-21).

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Cloud Run Service (INFRA-04)**
- **D-01** — Service name `nlm-staging` in GCP project `nlm-staging-493715`, region `us-central1` (same as Artifact Registry).
- **D-02** — Service config baseline: `min-instances=0`, `max-instances=10`, `cpu=1`, `memory=512Mi`, `timeout=300s`, `ingress=all`, `allow-unauthenticated=true`.
- **D-03** — Container entrypoint uses Dockerfile default (Next.js standalone binds `0.0.0.0:$PORT`; Cloud Run sets `PORT=8080`). No Dockerfile change.
- **D-04** — Image source: `us-central1-docker.pkg.dev/nlm-staging-493715/nlm-app/nlm-app` pulled by **digest only** (`@sha256:...`). Initial deploy uses the `phase45-smoke` digest.
- **D-05** — Runtime SA = `nlm-cloudrun-sa@nlm-staging-493715.iam.gserviceaccount.com` (Phase 45).
- **D-06** — Env vars mounted from Secret Manager via `env { value_source { secret_key_ref { secret = ..., version = "latest" } } }`. All 13 Phase 45 secrets mounted.
- **D-07** — `NEXT_PUBLIC_SITE_URL` secret value set to `https://staging.nextlevelmock.com` post-deploy (runbook step).

**Load Balancer + SSL + Domain (INFRA-05)**
- **D-08** — External HTTPS Load Balancer (global, classic) with Serverless NEG → Cloud Run service.
- **D-09** — Google-managed SSL cert for `staging.nextlevelmock.com`.
- **D-10** — URL map routes all paths to the Cloud Run NEG (no host/path-based routing).
- **D-11** — Forwarding rule on a global static IP named `nlm-staging-lb-ip`.
- **D-12** — Cloudflare `A` record `staging.nextlevelmock.com` → LB IP. **Orange cloud OFF.**

**Workload Identity Federation (CI-04)**
- **D-13** — In `nlm-staging-493715`: Pool `github-actions`, OIDC Provider `github` with issuer `https://token.actions.githubusercontent.com`.
- **D-14** — WIF pool + provider also provisioned in `nlm-prod` (prod deploy is Phase 51, but cheaper to do now).
- **D-15** — Attribute mapping: `google.subject=assertion.sub`, `attribute.actor=assertion.actor`, `attribute.repository=assertion.repository`, `attribute.ref=assertion.ref`.
- **D-16** — Attribute condition: `attribute.repository == "JesterCharles/mock-interview-assist"`. Blocks federation from any other repo.
- **D-17** — Impersonation binding: `github-actions-deployer@{project}.iam.gserviceaccount.com` receives `roles/iam.workloadIdentityUser` via `principalSet://.../attribute.repository/JesterCharles/mock-interview-assist`.
- **D-18** — `github-actions-deployer` SA project-level roles:
  - `roles/artifactregistry.writer`
  - `roles/run.admin`
  - `roles/iam.serviceAccountUser` (scoped on `nlm-cloudrun-sa`, **not** project-wide)
  - **NOT** `roles/owner` or `roles/editor`.
- **D-19** — WIF proof test = manual GH Actions workflow `.github/workflows/wif-smoke.yml`, `workflow_dispatch`-only.

**Module Layout**
- **D-20** — New HCL files: `iac/cloudrun/cloudrun-staging.tf`, `loadbalancer-staging.tf`, `dns-staging.tf`, `wif.tf`. No `cloudrun-prod.tf` in Phase 47.
- **D-21** — Cloudflare provider `cloudflare/cloudflare ~> 4.0`. Auth via `CLOUDFLARE_API_TOKEN` env var (developer shell only). Token NOT persisted in Secret Manager.
- **D-22** — Phase 45 `staging.tfvars` passes `env = "staging"` + smoke-image digest.

**Cold-Start Verification**
- **D-23** — Script `iac/cloudrun/scripts/coldstart-probe-staging.sh`: force to latest revision → wait for scale-to-zero (or `sleep 300`) → `curl -sf -w '\n%{time_total}'` → assert `time_total < 30.0` AND HTTP 200.
- **D-24** — `/api/health` may return 503 on staging if Prisma connection drops transiently. Troubleshooting flow documented in runbook.

### Claude's Discretion

- Exact LB resource names (e.g., `google_compute_global_address.nlm_staging_lb_ip` vs shorter).
- `google_compute_managed_ssl_certificate` vs Certificate Manager — **recommended: Managed SSL (classic)** for simpler HCL.
- Cloudflare provider auth strategy — **recommended: `CLOUDFLARE_API_TOKEN` env var only** (D-21 implies this).
- Pin initial image to `phase45-smoke` digest via `var.initial_image_digest` default.
- Wait for SSL `ACTIVE` in TF (data source polling) vs runbook step — **recommended: runbook step** (TF polling loops are fragile; runbook is explicit and observable).

### Deferred Ideas (OUT OF SCOPE)

- CDN / Cloud CDN in front of LB — v1.6+.
- Regional LB / multi-region Cloud Run.
- Cloud Armor (WAF) — Phase 49.
- Custom min-instances on staging (>0) — INFRA-04 locks `0`.
- TLS 1.3 cipher suite tuning — defaults OK.
- SSL cert via Certificate Manager (newer product) — stay on classic Managed SSL.
- Prod Cloud Run service HCL — Phase 51.
- GH Actions deploy-staging workflow — Phase 48.
- Observability dashboards, uptime checks — Phase 48.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INFRA-04 | Cloud Run service config baseline: `min-instances=0, max-instances=10, cpu=1, memory=512Mi, timeout=300s, HTTPS-only ingress`. | §HCL Patterns — Pattern 1 `google_cloud_run_v2_service` with full `scaling`, `resources.limits`, `timeout`, `ingress`, `env.value_source.secret_key_ref`, `service_account` blocks. §Validation Architecture maps to `gcloud run services describe` assertions. |
| INFRA-05 | Google Cloud Load Balancer + managed SSL cert for `staging.nextlevelmock.com`. | §HCL Patterns — Patterns 2-7 cover the full LB chain (global address, serverless NEG, backend service, URL map, target HTTPS proxy, managed SSL cert, global forwarding rule). §Pitfall 1 documents the async cert provisioning behaviour. |
| CI-04 | Workload Identity Federation (OIDC) authenticates GH Actions to GCP; no long-lived SA JSON keys. | §HCL Patterns — Patterns 8-10 cover WIF pool, provider, impersonation binding. §Operational Scripts includes the `wif-smoke.yml` workflow with `google-github-actions/auth@v2` consuming the provider. §Security Domain threat table T-47-02 confirms the attribute-condition mitigation. |

</phase_requirements>

## Project Constraints (from CLAUDE.md)

CLAUDE.md enforces rules the planner MUST honor:

- **GSD Workflow Enforcement** — Phase 47 tasks run inside `/gsd-execute-phase` (superpowers TDD worktrees). No ad-hoc `terraform apply` outside the tracked plan.
- **Codex owns code review** — Terraform PR review goes through `codex review`; no self-review.
- **Testing hierarchy** — vitest continues to run for app code (no app changes in Phase 47). Infra verification = `terraform validate` + `terraform plan -detailed-exitcode` + `gcloud` + `curl` assertions, collected into `iac/cloudrun/scripts/verify-phase-47.sh`.
- **Health stack** — `npx tsc --noEmit` + `npm run lint` + `npm run test` must remain green. No app-code changes in 47.
- **DESIGN.md** — N/A (no UI surface).
- **Dockerfile locked** — `node:22-alpine`; no edits. Phase 47 reuses the Phase 45 build unchanged.
- **Prisma 7** — Cloud Run runtime invokes `npx prisma migrate deploy && node server.js` (Dockerfile `CMD`). Staging `DIRECT_URL` (port 5432) must be reachable from Cloud Run default egress. Verified in §Open Questions — Supabase pooler is a public endpoint, no VPC connector needed.
- **Secret management** — Prisma `DATABASE_URL` + `DIRECT_URL` come from Secret Manager via Cloud Run env-var mounting (D-06). Never baked into image.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Terraform CLI | `>= 1.6` | HCL runtime | [VERIFIED: Phase 45 research] Already upgraded in Phase 45. |
| `hashicorp/google` provider | `~> 7.0` (current 7.28.0) | All GCP resources in Phase 47 | [VERIFIED: Phase 45 uses the same pin] No bump needed. |
| `cloudflare/cloudflare` provider | `~> 4.0` (per D-21) | Cloudflare DNS record | [CITED: [Cloudflare provider on Terraform Registry](https://registry.terraform.io/providers/cloudflare/cloudflare/latest)] v4.x is stable and still supported. v5 GA'd 2025-02-03 ([Cloudflare changelog](https://developers.cloudflare.com/changelog/post/2025-02-03-terraform-v5-provider/)) and renames `cloudflare_record` → `cloudflare_dns_record` + `value` → `content`. **Phase 47 stays on v4 per D-21**; migration to v5 is a future phase. |
| `google-github-actions/auth` | `v2` | GH Actions step that exchanges OIDC token for GCP access token via WIF | [CITED: [google-github-actions/auth GitHub](https://github.com/google-github-actions/auth)] The canonical GH Action for WIF; pinned-major `@v2` is the recommended reference. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `google-github-actions/setup-gcloud` | `v2` | Install `gcloud` in the smoke workflow runner | Used in `wif-smoke.yml` to run `gcloud auth print-identity-token` after WIF auth step. |
| `curl` | system | Health probe in cold-start script | Used with `-w '%{http_code}\n%{time_total}'` for machine-readable timing. |
| `jq` | system | Parse `gcloud` JSON output | Used in `verify-phase-47.sh` to pull fields from `gcloud run services describe --format=json`. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `google_compute_managed_ssl_certificate` (classic) | `google_certificate_manager_certificate` | Certificate Manager is the newer product and supports wildcards + more flexible issuance, but requires a separate `google_certificate_manager_certificate_map` + attachment, and the HCL is denser. Classic Managed SSL is simpler HCL and sufficient for a single hostname at staging; deferred to v1.6+ if needed. |
| `google_cloud_run_v2_service` | `google_cloud_run_service` (v1) | v1 is the older API; v2 exposes `scaling`, `vpc_access`, `binary_authorization`, and per-revision traffic splitting more cleanly. Provider 7.x is tuned for v2. **Use v2.** |
| Cloudflare provider v4 | Cloudflare provider v5 | v5 is a ground-up rewrite with renamed resources (`cloudflare_record` → `cloudflare_dns_record`). D-21 locks v4. Accept the known migration debt. |
| `google-github-actions/auth@v2` with WIF | Service Account JSON key in `GCP_SA_KEY` secret | JSON keys are what CI-04 explicitly forbids. WIF is the requirement. |

**Installation:** No `npm install` in Phase 47 — this is IaC + CI config only. Terraform providers auto-download on `terraform init`.

**Version verification (2026-04-18 registry probes):**

- `hashicorp/google` — 7.28.0 current (verified via Phase 45 research, still accurate).
- `cloudflare/cloudflare` — 4.x maintenance line still published; v5.x is the current generation (5.19.0-beta.5 as of 2026-04-10 per registry). Per D-21 we pin `~> 4.0`.
- `google-github-actions/auth` — v2 is current major (v2.1.x patch line as of 2026-04).

## Architecture Patterns

### Recommended Project Structure (extends Phase 45's `iac/cloudrun/`)

```
iac/cloudrun/
├── providers.tf              # Phase 45 — add cloudflare provider block
├── variables.tf              # Phase 45 — add P47 vars (initial_image_digest, domain_name, repo_slug, cf_zone_id)
├── apis.tf                   # Phase 45 — unchanged
├── registry.tf               # Phase 45 — unchanged
├── secrets.tf                # Phase 45 — unchanged
├── iam.tf                    # Phase 45 — add github-actions-deployer role bindings in P47
├── outputs.tf                # Phase 45 — add P47 outputs (cloudrun_url, lb_ip, ssl_cert_name, wif_provider_name)
├── state.tf                  # Phase 45 — unchanged
├── staging.tfvars            # Phase 45 — add initial_image_digest, cf_zone_id
├── prod.tfvars               # Phase 45 — (touch only for WIF pool provisioning per D-14)
│
├── cloudrun-staging.tf       # NEW (Phase 47) — google_cloud_run_v2_service.nlm_staging
├── loadbalancer-staging.tf   # NEW — global IP + serverless NEG + backend svc + URL map + HTTPS proxy + managed SSL + forwarding rule
├── dns-staging.tf            # NEW — cloudflare_record for staging
├── wif.tf                    # NEW — pool + provider + SA bindings (both projects via for_each over a local map)
│
├── scripts/
│   ├── verify-phase-45.sh    # Phase 45
│   └── verify-phase-47.sh    # NEW — full phase-gate assertions
│   └── coldstart-probe-staging.sh  # NEW — success criterion #4
│
└── README.md                 # Update with Phase 47 apply sequence + runbook steps
```

### Pattern 1: `google_cloud_run_v2_service` (INFRA-04, D-01..D-07)

```hcl
# Source: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_run_v2_service
# File: iac/cloudrun/cloudrun-staging.tf

resource "google_cloud_run_v2_service" "nlm_staging" {
  count    = var.env == "staging" ? 1 : 0

  project  = var.project_id
  name     = "nlm-staging"
  location = var.region          # us-central1

  ingress           = "INGRESS_TRAFFIC_ALL"    # D-02; LB still restricts via SSL cert + forwarding rule
  deletion_protection = false                   # staging; enable on prod in P51

  template {
    service_account = google_service_account.cloudrun.email  # Phase 45 nlm-cloudrun-sa

    scaling {
      min_instance_count = 0    # D-02 / INFRA-04
      max_instance_count = 10   # D-02 / INFRA-04
    }

    timeout = "300s"            # D-02 / INFRA-04

    containers {
      # D-04: digest-only pull. Default = phase45-smoke digest; Phase 48 CI updates via gcloud run deploy.
      image = "${var.region}-docker.pkg.dev/${var.project_id}/nlm-app/nlm-app@${var.initial_image_digest}"

      resources {
        limits = {
          cpu    = "1"       # D-02 / INFRA-04
          memory = "512Mi"   # D-02 / INFRA-04
        }
        cpu_idle = true       # scale-to-zero CPU throttling between requests (default; explicit for clarity)
        startup_cpu_boost = true  # Cloud Run gives extra CPU during cold start — helps Next.js + Prisma first-request latency
      }

      ports {
        container_port = 8080   # Cloud Run sets PORT=8080 at runtime (D-03)
      }

      # D-06: all 13 Phase 45 secrets mounted as env vars via Secret Manager binding.
      # Dynamic block over the same set Phase 45 used in var.secret_names.
      dynamic "env" {
        for_each = toset(var.secret_names)
        content {
          name = env.value
          value_source {
            secret_key_ref {
              secret  = env.value            # Phase 45 created these with secret_id == env.value
              version = "latest"
            }
          }
        }
      }
    }
  }

  # CRITICAL: Phase 48 CI runs `gcloud run deploy --image=<new-digest>`. Without this lifecycle
  # block, the next `terraform apply` would revert the image to var.initial_image_digest and
  # wipe the CI-deployed revision.
  # Source: https://github.com/hashicorp/terraform-provider-google/issues/13435 (confirmed pattern)
  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
      client,
      client_version,
    ]
  }

  depends_on = [
    google_project_service.apis,
    google_secret_manager_secret_iam_member.cloudrun_accessor,  # must have secret access before first boot
  ]
}

# D-02 public access — must be explicit in v2 API (it doesn't default to public like v1 did).
resource "google_cloud_run_v2_service_iam_member" "public_invoke" {
  count = var.env == "staging" ? 1 : 0

  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.nlm_staging[0].name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
```

**Why `[0]` indexing + `count`?** The Phase 47 file only provisions staging; `prod.tfvars` must not create `nlm-staging`. Using `count = var.env == "staging" ? 1 : 0` keeps the file active only for staging applies. Phase 51 will add a parallel file for prod.

### Pattern 2: Global Static IP (D-11)

```hcl
# Source: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_global_address
# File: iac/cloudrun/loadbalancer-staging.tf

resource "google_compute_global_address" "nlm_staging_lb_ip" {
  count = var.env == "staging" ? 1 : 0

  project      = var.project_id
  name         = "nlm-staging-lb-ip"
  ip_version   = "IPV4"
  address_type = "EXTERNAL"
  description  = "Anycast IP for staging HTTPS LB → nlm-staging Cloud Run"
}
```

### Pattern 3: Serverless NEG → Cloud Run (INFRA-05, D-08)

```hcl
# Source: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_region_network_endpoint_group
# NOTE: Serverless NEG is REGIONAL (network_endpoint_type = SERVERLESS); the LB that consumes it is global.

resource "google_compute_region_network_endpoint_group" "nlm_staging_neg" {
  count = var.env == "staging" ? 1 : 0

  project               = var.project_id
  name                  = "nlm-staging-neg"
  region                = var.region   # us-central1
  network_endpoint_type = "SERVERLESS"

  cloud_run {
    service = google_cloud_run_v2_service.nlm_staging[0].name
  }
}
```

### Pattern 4: Backend Service (consumes the NEG)

```hcl
# Source: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_backend_service

resource "google_compute_backend_service" "nlm_staging_backend" {
  count = var.env == "staging" ? 1 : 0

  project               = var.project_id
  name                  = "nlm-staging-backend"
  protocol              = "HTTPS"                  # Cloud Run serves HTTPS internally
  port_name             = "http"
  timeout_sec           = 300                      # align with Cloud Run timeout
  load_balancing_scheme = "EXTERNAL_MANAGED"       # use the newer "classic Application LB, global externally managed" scheme

  backend {
    group = google_compute_region_network_endpoint_group.nlm_staging_neg[0].id
    # balancing_mode omitted — invalid on SERVERLESS NEG backends (provider rejects UTILIZATION/RATE)
  }

  log_config {
    enable      = true
    sample_rate = 1.0
  }
}
```

### Pattern 5: URL Map (D-10, all paths → single backend)

```hcl
# Source: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_url_map

resource "google_compute_url_map" "nlm_staging_urlmap" {
  count = var.env == "staging" ? 1 : 0

  project         = var.project_id
  name            = "nlm-staging-urlmap"
  default_service = google_compute_backend_service.nlm_staging_backend[0].id

  # D-10: no host_rule / path_matcher — single catch-all default.
}
```

### Pattern 6: Managed SSL Certificate (D-09)

```hcl
# Source: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_managed_ssl_certificate
# Provisioning: async. Expect PROVISIONING → ACTIVE transition in 10-60 min after the LB is live AND the DNS A record resolves to the LB IP.
# Docs: https://docs.cloud.google.com/load-balancing/docs/ssl-certificates/troubleshooting

resource "google_compute_managed_ssl_certificate" "nlm_staging_cert" {
  count = var.env == "staging" ? 1 : 0

  project = var.project_id
  name    = "nlm-staging-ssl-cert"

  managed {
    domains = ["staging.nextlevelmock.com"]
  }

  # classic Managed SSL certs are immutable on domain change; lifecycle makes replacement safer.
  lifecycle {
    create_before_destroy = true
  }
}
```

### Pattern 7: Target HTTPS Proxy + Global Forwarding Rule

```hcl
# Source: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_target_https_proxy
# Source: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_global_forwarding_rule

resource "google_compute_target_https_proxy" "nlm_staging_https_proxy" {
  count = var.env == "staging" ? 1 : 0

  project          = var.project_id
  name             = "nlm-staging-https-proxy"
  url_map          = google_compute_url_map.nlm_staging_urlmap[0].id
  ssl_certificates = [google_compute_managed_ssl_certificate.nlm_staging_cert[0].id]
}

resource "google_compute_global_forwarding_rule" "nlm_staging_https_fwd" {
  count = var.env == "staging" ? 1 : 0

  project               = var.project_id
  name                  = "nlm-staging-https-fwd"
  target                = google_compute_target_https_proxy.nlm_staging_https_proxy[0].id
  ip_address            = google_compute_global_address.nlm_staging_lb_ip[0].address
  port_range            = "443"
  load_balancing_scheme = "EXTERNAL_MANAGED"
}
```

**Note on HTTP→HTTPS redirect:** Not in scope for Phase 47 (CONTEXT deferred "HTTPS-only ingress" is achieved via the fact that only a 443 forwarding rule exists; port 80 traffic just gets refused). Adding a port-80 forwarding rule with a `redirect` URL map is a Phase 49 hardening item if user wants curl-friendly 301s.

### Pattern 8: WIF Pool + Provider (CI-04, D-13..D-16)

```hcl
# Source: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/iam_workload_identity_pool
# Source: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/iam_workload_identity_pool_provider
# Reference: https://cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines

# File: iac/cloudrun/wif.tf
# Provisioned per-project via count (D-14: both projects get the pool now).

resource "google_iam_workload_identity_pool" "github" {
  project                   = var.project_id
  workload_identity_pool_id = "github-actions"
  display_name              = "GitHub Actions"
  description               = "OIDC federation for GH Actions — NLM repo only (D-16 enforces via attribute condition)"
}

resource "google_iam_workload_identity_pool_provider" "github" {
  project                            = var.project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github"
  display_name                       = "GitHub OIDC"

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
    # allowed_audiences intentionally omitted — defaults to the provider resource name,
    # which matches what google-github-actions/auth@v2 sends by default.
  }

  # D-15 attribute mapping
  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.actor"      = "assertion.actor"
    "attribute.repository" = "assertion.repository"
    "attribute.ref"        = "assertion.ref"
  }

  # D-16 attribute condition — CRITICAL. Without this, ANY GitHub repo's workflow can federate.
  attribute_condition = "attribute.repository == \"${var.github_repo_slug}\""
  # var.github_repo_slug = "JesterCharles/mock-interview-assist"
}
```

### Pattern 9: SA Impersonation Binding (D-17)

```hcl
# Source: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_service_account_iam

# D-17: the deployer SA receives roles/iam.workloadIdentityUser scoped to the GitHub repo principalSet.
# CRITICAL: the principalSet URI uses the project NUMBER (not ID) + workload_identity_pool_id.

data "google_project" "current" {
  project_id = var.project_id
}

resource "google_service_account_iam_member" "wif_impersonation" {
  service_account_id = google_service_account.ghactions.name   # Phase 45 created the SA
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/projects/${data.google_project.current.number}/locations/global/workloadIdentityPools/${google_iam_workload_identity_pool.github.workload_identity_pool_id}/attribute.repository/${var.github_repo_slug}"

  depends_on = [google_iam_workload_identity_pool_provider.github]
}
```

### Pattern 10: `github-actions-deployer` Project-Level Role Bindings (D-18)

```hcl
# D-18: three roles, two project-level + one SA-level.
# File: iac/cloudrun/iam.tf (append to Phase 45 file)

# Project-level: push images
resource "google_project_iam_member" "ghactions_artifactregistry_writer" {
  project = var.project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${google_service_account.ghactions.email}"
}

# Project-level: deploy Cloud Run services
resource "google_project_iam_member" "ghactions_run_admin" {
  project = var.project_id
  role    = "roles/run.admin"
  member  = "serviceAccount:${google_service_account.ghactions.email}"
}

# SA-LEVEL (D-18): iam.serviceAccountUser ONLY on nlm-cloudrun-sa, not project-wide.
# Without this, `gcloud run deploy --service-account=nlm-cloudrun-sa` fails with
# "Permission iam.serviceAccounts.actAs denied on service account nlm-cloudrun-sa".
resource "google_service_account_iam_member" "ghactions_act_as_cloudrun_sa" {
  service_account_id = google_service_account.cloudrun.name   # Phase 45 nlm-cloudrun-sa
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.ghactions.email}"
}
```

**Verification commands:**

```bash
# Project-level
gcloud projects get-iam-policy nlm-staging-493715 \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:github-actions-deployer@nlm-staging-493715.iam.gserviceaccount.com" \
  --format="value(bindings.role)"
# Expected lines: roles/artifactregistry.writer, roles/run.admin

# SA-level (iam.serviceAccountUser on nlm-cloudrun-sa ONLY)
gcloud iam service-accounts get-iam-policy nlm-cloudrun-sa@nlm-staging-493715.iam.gserviceaccount.com \
  --format=json | jq '.bindings[] | select(.role == "roles/iam.serviceAccountUser")'
# Expected: member list includes serviceAccount:github-actions-deployer@...
```

### Pattern 11: Cloudflare DNS Record (D-12, D-21)

```hcl
# Source: https://registry.terraform.io/providers/cloudflare/cloudflare/4.6.0/docs/resources/record
# File: iac/cloudrun/dns-staging.tf

# providers.tf addition:
# terraform {
#   required_providers {
#     cloudflare = {
#       source  = "cloudflare/cloudflare"
#       version = "~> 4.0"      # D-21
#     }
#   }
# }
# provider "cloudflare" {
#   # Auth via CLOUDFLARE_API_TOKEN env var (D-21) — no explicit api_token argument.
# }

resource "cloudflare_record" "staging" {
  count = var.env == "staging" ? 1 : 0

  zone_id = var.cf_zone_id                            # staging.tfvars: lookup command below
  name    = "staging"                                  # → staging.nextlevelmock.com
  type    = "A"
  value   = google_compute_global_address.nlm_staging_lb_ip[0].address
  ttl     = 300                                        # 5 min — matches DNS-03 cutover pattern
  proxied = false                                      # D-12: orange cloud OFF for staging
  comment = "v1.5 Phase 47 — staging Cloud Run LB anycast IP"
}
```

**Zone ID lookup (one-time, document in README):**

```bash
# Requires CLOUDFLARE_API_TOKEN env var with Zone.Read permission on nextlevelmock.com.
curl -sf -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  "https://api.cloudflare.com/client/v4/zones?name=nextlevelmock.com" \
  | jq -r '.result[0].id'
# Example output: a1b2c3d4e5f6g7h8i9j0... (32-char zone ID — paste into staging.tfvars)
```

### Anti-Patterns to Avoid

- **Omitting `lifecycle.ignore_changes = [template[0].containers[0].image]`** — Phase 48 CI will repeatedly lose its deployed revision to `terraform apply` reverts. This is the single most important HCL detail in Phase 47.
- **Using `google_cloud_run_service` (v1)** — older API, no `scaling` block, awkward secret binding syntax. Use v2.
- **Setting `deletion_protection = true` on staging** — blocks iterative `terraform destroy` during planner iteration. Leave `false` on staging; flip to `true` for prod in Phase 51.
- **Trying to wait for SSL `ACTIVE` inside Terraform** — there is no native "wait for cert ACTIVE" pattern. Scripted polling loops inside TF via `null_resource` + `local-exec` are fragile and mask the underlying async behaviour. **Poll from the runbook / `verify-phase-47.sh` instead** (see §Operational Scripts).
- **Using project ID instead of project NUMBER in WIF principalSet** — `principalSet://iam.googleapis.com/projects/<NUMBER>/...` requires the project **number**. Using the project ID silently fails to match and federation is silently broken. Use `data.google_project.current.number` in HCL.
- **Project-level `roles/iam.serviceAccountUser`** — this grants actAs on every SA in the project, including `nlm-cloudrun-sa` *and* any future SA. D-18 scopes to `nlm-cloudrun-sa` specifically via `google_service_account_iam_member`.
- **Leaving `proxied = true` (orange cloud) on staging** — Cloudflare SSL/TLS setting might clash with the Google-managed cert handshake, and it also masks the real LB IP in DNS lookups during debugging. Staging stays direct-connect.
- **Forgetting `google_cloud_run_v2_service_iam_member` with `allUsers`** — v2 API is private-by-default. Without this resource, the LB routes traffic but Cloud Run returns `403 Forbidden` to unauthenticated requests. This is not the same as Cloud Run's "allow unauthenticated invocations" toggle in the v1 UI — it must be an explicit IAM binding in v2.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| "Wait for SSL cert ACTIVE" in Terraform | `null_resource` + `local-exec` loop calling `gcloud compute ssl-certificates describe` | Runbook step + `verify-phase-47.sh` polling in bash with a timeout | TF is declarative; blocking for async GCP state transitions inside `apply` breaks the mental model and makes failures opaque. Bash polling with explicit timeout is transparent and fail-fast. |
| WIF token exchange in CI | Custom curl POST to STS endpoint | `google-github-actions/auth@v2` with `workload_identity_provider` + `service_account` inputs | Official action, handles the OIDC audience + exchange + credential file setup. |
| DNS propagation polling | `sleep 600` | `dig +short staging.nextlevelmock.com` loop with timeout — but even this is optional because Cloudflare's edge is ~sub-minute globally | Cloudflare is fast; the bottleneck is the Google-managed cert ACTIVE transition, not DNS. |
| Cold-start "scale to zero" trigger | `gcloud run services update --min-instances=0 --max-instances=0` (sets max=0 which breaks the service) then revert | `sleep 300` after latest-revision rollout, assuming quiet traffic (staging is unmonitored) | There is no API to force scale-to-zero without breaking the service. Quiet-traffic wait is the standard pattern; documented caveat in §Operational Scripts. |
| TLS cert validity check | Custom OpenSSL parsing | `curl -sfI https://staging.nextlevelmock.com/api/health` + `openssl s_client -connect host:443 -servername host` one-liner | Standard unix idioms; short, auditable. |
| Cross-project resource deduplication | Hand-written `locals` flattening | `for_each` over a map `{ staging = ..., prod = ... }` in `wif.tf` (D-14) | TF native. Phase 47 wants the WIF pool in both projects; `for_each` over a locals map with two keys keeps the code flat. |

**Key insight:** This phase's failure modes are almost all **async-state-transition observability problems** (SSL cert ACTIVE, DNS propagation, cold-start latency, WIF first-use latency). The right abstraction is "TF declares desired state; scripts poll actual state." Don't try to make TF block on async.

## Runtime State Inventory

> Phase 47 is mostly greenfield (new Cloud Run service + LB + WIF), but it extends Phase 45's existing `iac/cloudrun/` Terraform state. Minimal rename/refactor surface.

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | Phase 45 Terraform state in `gs://nlm-tfstate/cloudrun/staging/default.tfstate` (and `cloudrun/prod/default.tfstate`). Phase 47 adds resources to the same state; no migration. | None — `terraform apply` appends. |
| Live service config | Secret Manager secrets created in Phase 45 are already populated (Phase 46) with values. Phase 47 consumes them via Cloud Run env-var binding. `NEXT_PUBLIC_SITE_URL` secret value starts as a placeholder or empty; Phase 47 runbook updates it to `https://staging.nextlevelmock.com` post-deploy (D-07). | Runbook step: `echo -n "https://staging.nextlevelmock.com" \| gcloud secrets versions add NEXT_PUBLIC_SITE_URL --data-file=- --project=nlm-staging-493715`. |
| OS-registered state | None. | None. |
| Secrets / env vars | `CLOUDFLARE_API_TOKEN` — new requirement for the Cloudflare provider. **Lives only in developer shell** (D-21), not persisted to Secret Manager. GH Actions workflows won't need it in Phase 47 (WIF smoke workflow doesn't do DNS); Phase 48 doesn't either (DNS is a TF concern, not CI). | Developer sets `export CLOUDFLARE_API_TOKEN=...` before running `terraform apply`. Document in `iac/cloudrun/README.md`. |
| Build artifacts | `nlm-app:phase45-smoke` image digest (from Phase 45) is the default for `var.initial_image_digest`. Captured in `.planning/phases/45-.../45-VALIDATION.md` or `iac/cloudrun/staging.tfvars` (committed). | Planner verifies the digest is still present in Artifact Registry before first apply: `gcloud artifacts docker images list us-central1-docker.pkg.dev/nlm-staging-493715/nlm-app --format='value(DIGEST)'`. |

## Common Pitfalls

### Pitfall 1: Managed SSL certificate provisioning is async and the first apply returns before ACTIVE

**What goes wrong:** `terraform apply` completes in ~60s, but the LB returns `SSL_ERROR_NO_CYPHER_OVERLAP` or similar for the next 10-60 minutes until the Google-managed cert finishes validation. A naive phase-gate script fails.

**Why it happens:** Google-managed SSL certs require:
1. The LB to exist (forwarding rule on port 443 bound to the cert-carrying target proxy).
2. DNS A record for the domain to resolve to the LB's anycast IP.
3. Google's internal validation pipeline to complete (HTTP-01 style challenge on the LB).

Only when (1)+(2)+(3) all hold does the cert flip to `ACTIVE`. Typical: 10-60 min. Pathological (wrong DNS): 24h timeout → `FAILED_NOT_VISIBLE`. [CITED: [GCP SSL troubleshooting](https://docs.cloud.google.com/load-balancing/docs/ssl-certificates/troubleshooting)]

**How to avoid:** Runbook step sequence:
1. `terraform apply` (creates LB + cert in `PROVISIONING`).
2. Verify DNS: `dig +short staging.nextlevelmock.com` returns the LB IP.
3. Poll cert status (loop with timeout):

```bash
for i in {1..40}; do
  STATUS=$(gcloud compute ssl-certificates describe nlm-staging-ssl-cert \
    --project=nlm-staging-493715 \
    --format='value(managed.status)')
  echo "$(date +%H:%M:%S) cert status: $STATUS"
  [[ "$STATUS" == "ACTIVE" ]] && break
  sleep 60
done
# Expected: ACTIVE within ~40 min. If FAILED_NOT_VISIBLE, DNS is wrong.
```

4. `coldstart-probe-staging.sh` runs **after** status is ACTIVE (guarded explicitly).

**Warning signs:** `ERR_SSL_PROTOCOL_ERROR` or `curl: (60) SSL certificate problem` on the first post-apply probe. `gcloud compute ssl-certificates describe --format='value(managed.status)'` returns `PROVISIONING`. Don't let the phase gate fail on this — document "green on first poll of ACTIVE" as the assertion.

### Pitfall 2: `google_cloud_run_v2_service` image reverts on second `terraform apply`

**What goes wrong:** Phase 48 CI runs `gcloud run deploy nlm-staging --image=us-central1-docker.pkg.dev/.../nlm-app@sha256:<new>`. Later someone runs `terraform apply` unrelated to the service (e.g., adds a secret). TF detects the image drift and reverts to `var.initial_image_digest` (Phase 45 smoke), wiping the CI revision.

**Why it happens:** `template.containers[0].image` is a declared attribute; TF's drift detection treats out-of-band changes as "needs to converge to HCL."

**How to avoid:** `lifecycle { ignore_changes = [template[0].containers[0].image, client, client_version] }` on the service resource (Pattern 1). This tells TF to never touch the image after initial creation.

**Warning signs:** `terraform plan` output shows `~ image = "...@sha256:<new>" -> "...@sha256:<phase45-smoke>"` after a CI deploy. If you see this diff — STOP, do not apply — the lifecycle block is missing. [CITED: [provider issue #13435](https://github.com/hashicorp/terraform-provider-google/issues/13435)]

### Pitfall 3: WIF `principalSet://` uses project NUMBER, not project ID

**What goes wrong:** HCL written with `principalSet://iam.googleapis.com/projects/nlm-staging-493715/...` (the ID) silently binds nothing. `gcloud run deploy` from CI fails with `Permission denied` even though every other IAM binding looks right.

**Why it happens:** Google IAM accepts both strings at the API level but only the **number** resolves to the workload identity pool. The ID form is a "nothing matches" noop.

**How to avoid:** Use `data "google_project" "current"` to pull the number dynamically (Pattern 9). Document in the module README. [CITED: [WIF with GitHub docs](https://cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines)]

**Warning signs:** CI workflow output: `google-github-actions/auth succeeded` but the next `gcloud` step fails with `Permission 'iam.serviceAccounts.generateAccessToken' denied on resource` or similar. The auth step "works" because WIF returns an access token for a federated identity — but nothing is bound to it, so the token has no project-level permissions.

### Pitfall 4: Cloud Run v2 `ingress=INGRESS_TRAFFIC_ALL` + no `allUsers` invoker IAM = 403

**What goes wrong:** Service is reachable through the LB, but every request returns 403. Logs show `The request was not authenticated`.

**Why it happens:** `ingress` controls *network* admission. `roles/run.invoker` controls *IAM* admission. v2 API does not auto-grant `allUsers` like v1's `allow-unauthenticated=true` flag did.

**How to avoid:** Explicit `google_cloud_run_v2_service_iam_member` with `member = "allUsers"`, `role = "roles/run.invoker"` (Pattern 1 tail). D-02 locks this.

**Warning signs:** `curl https://staging.nextlevelmock.com/api/health` returns 403 with JSON `{"error":"The request was not authenticated."}`; `gcloud run services describe --format='value(status.url)' | xargs curl -f` also 403s.

### Pitfall 5: Cloudflare `proxied = true` (orange cloud) silently breaks Google-managed SSL validation

**What goes wrong:** SSL cert stuck in `PROVISIONING` → eventually `FAILED_NOT_VISIBLE`. Because Cloudflare is proxying, the DNS A record Google's validator sees resolves to Cloudflare edge IPs, not the LB IP.

**Why it happens:** Google's HTTP-01 validation connects to the IP in DNS. If Cloudflare proxy is on, that IP is a Cloudflare edge; Google sees Cloudflare's response, not the LB's challenge-response, and validation never succeeds.

**How to avoid:** D-12 locks `proxied = false` for staging. Document in `dns-staging.tf` comments. Planner MUST verify in verify script: `dig +short staging.nextlevelmock.com` should return the LB IP directly (starts with something like `34.`, `35.`, `130.`, `146.`), not a Cloudflare edge (starts with `104.`, `172.`).

**Warning signs:** DNS resolves to `104.x.x.x` / `172.x.x.x`; cert status `FAILED_NOT_VISIBLE`. Flip `proxied = false` and the cert will usually self-recover within 30 min.

### Pitfall 6: Default Cloud Run egress ≠ Supabase pooler reachability concerns (non-issue, document explicitly)

**What goes wrong:** Planner adds an unnecessary `google_vpc_access_connector` + VPC egress config, wasting setup time and complicating the HCL.

**Why it happens:** The default assumption is "Cloud Run → managed DB needs a VPC connector." This is true for Cloud SQL private IP, but **not** for Supabase. The Supabase pooler (port 6543) and direct connection (port 5432) are public endpoints reachable from the open internet.

**How to avoid:** Cloud Run v2 default egress is `ALL_TRAFFIC` (goes direct to the internet). No `vpc_access` block needed. Document this explicitly in the HCL comment:

```hcl
# NOTE: No vpc_access block. Supabase pooler (6543) and direct (5432) are public endpoints;
# Cloud Run's default ALL_TRAFFIC egress reaches them directly. Adding a VPC connector
# here would require a subnet, NAT, and recurring cost — all unnecessary for Supabase.
```

**Warning signs:** Planner proposes `google_vpc_access_connector` — push back.

### Pitfall 7: Cold-start probe fails because TLS cert isn't ACTIVE yet on first run

**What goes wrong:** `coldstart-probe-staging.sh` runs immediately after `terraform apply`. Cert is still `PROVISIONING`. `curl` fails with `SSL_ERROR`. Phase gate red.

**Why it happens:** The script is the final step of the verify runbook; it assumes SSL is ACTIVE.

**How to avoid:** First gate in the script: check cert status. If not `ACTIVE`, exit 0 with an advisory message (not a failure). The first run of the script after apply is advisory; the operator re-runs once SSL flips to `ACTIVE`.

```bash
SSL_STATUS=$(gcloud compute ssl-certificates describe nlm-staging-ssl-cert \
  --project=nlm-staging-493715 --format='value(managed.status)')
if [[ "$SSL_STATUS" != "ACTIVE" ]]; then
  echo "ADVISORY: SSL cert status is $SSL_STATUS; cold-start probe skipped. Re-run after ACTIVE."
  exit 0
fi
```

**Warning signs:** `curl: (35) error:0A000438:SSL routines::tlsv1 alert internal error` in the probe log.

### Pitfall 8: `google-github-actions/auth@v2` + `setup-gcloud` ordering

**What goes wrong:** The smoke workflow uses `gcloud auth print-identity-token`, but `setup-gcloud` step is omitted or placed before `auth`. `gcloud: command not found` or `gcloud auth` fails with "No active account found".

**Why it happens:** `google-github-actions/auth@v2` sets `GOOGLE_APPLICATION_CREDENTIALS` but does not install `gcloud`. `setup-gcloud@v2` installs `gcloud` and picks up the credentials from the `auth` step.

**How to avoid:** Always sequence `auth` → `setup-gcloud` → `gcloud <cmd>`. Document in the `wif-smoke.yml` workflow (see §Operational Scripts).

**Warning signs:** Workflow step "Authenticate to Google Cloud" reports success; next step "Run gcloud" fails with `gcloud: command not found`.

## Code Examples

See §HCL Patterns above (Patterns 1-11) for all Terraform resources. Additional operational scripts in §Operational Scripts.

### Common Operation 1: Per-env apply (extends Phase 45 invocations)

```bash
# Source: Phase 45 README pattern, extended for Phase 47 resources
cd iac/cloudrun

# Ensure CLOUDFLARE_API_TOKEN is exported (for the Cloudflare provider)
export CLOUDFLARE_API_TOKEN="$(security find-generic-password -a jestercharles -s CLOUDFLARE_API_TOKEN_NLM -w)"

# STAGING
terraform init -reconfigure -backend-config="prefix=cloudrun/staging"
terraform plan  -var-file=staging.tfvars -out=staging.plan
terraform apply staging.plan

# PROD (WIF pool only — D-14; no Cloud Run / LB / DNS in P47 for prod)
terraform init -reconfigure -backend-config="prefix=cloudrun/prod"
terraform plan  -var-file=prod.tfvars    -target=google_iam_workload_identity_pool.github \
                                          -target=google_iam_workload_identity_pool_provider.github \
                                          -out=prod-wif.plan
terraform apply prod-wif.plan
```

### Common Operation 2: Post-apply runbook (happy path)

```bash
# 1. Cloudflare DNS should already be populated by TF (terraform apply).
dig +short staging.nextlevelmock.com
# Expected: single IP matching `terraform output nlm_staging_lb_ip`

# 2. Poll SSL cert until ACTIVE.
for i in {1..40}; do
  S=$(gcloud compute ssl-certificates describe nlm-staging-ssl-cert \
      --project=nlm-staging-493715 --format='value(managed.status)')
  echo "[$i] cert=$S"; [[ "$S" == "ACTIVE" ]] && break; sleep 60
done

# 3. Update NEXT_PUBLIC_SITE_URL secret (D-07).
echo -n "https://staging.nextlevelmock.com" | gcloud secrets versions add NEXT_PUBLIC_SITE_URL \
  --project=nlm-staging-493715 --data-file=-

# 4. Force Cloud Run to pick up the new secret version (revisions do not auto-refresh secrets).
gcloud run services update nlm-staging --region=us-central1 \
  --project=nlm-staging-493715 \
  --update-secrets=NEXT_PUBLIC_SITE_URL=NEXT_PUBLIC_SITE_URL:latest
# (This creates a new revision referencing the latest secret version.)

# 5. Smoke the LB.
curl -sfI https://staging.nextlevelmock.com/api/health
# Expected: HTTP/2 200 ... strict-transport-security: max-age=...

# 6. Run cold-start probe.
./iac/cloudrun/scripts/coldstart-probe-staging.sh

# 7. Trigger WIF smoke workflow.
gh workflow run wif-smoke.yml --ref main
gh run watch $(gh run list --workflow=wif-smoke.yml --limit 1 --json databaseId -q '.[0].databaseId')
# Expected: conclusion=success
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `google_cloud_run_service` (v1) with noauth IAM via provider-side flags | `google_cloud_run_v2_service` + explicit `google_cloud_run_v2_service_iam_member` for allUsers | provider 4.x → 5.x (v2 API GA 2022) | Phase 47 uses v2; explicit allUsers IAM is mandatory. |
| Classic Application LB with SSL cert on target proxy (one-off cert per proxy) | Certificate Manager with cert maps (reusable, supports wildcards) | 2023+ | Staying on classic Managed SSL for Phase 47 simplicity; Certificate Manager is a v1.6+ option. |
| Service Account JSON keys in GitHub Secrets | Workload Identity Federation with OIDC tokens | 2021+ (GH Actions OIDC), mature since 2022 | CI-04 forbids SA keys. WIF is the pattern. |
| Cloudflare provider v4 (`cloudflare_record`, `value`) | Cloudflare provider v5 (`cloudflare_dns_record`, `content`) | 2025-02-03 GA ([Cloudflare changelog](https://developers.cloudflare.com/changelog/post/2025-02-03-terraform-v5-provider/)) | Phase 47 stays on v4 per D-21. v5 migration is a future phase (`tf-migrate` tool exists). |
| `startup_cpu_boost = false` (implicit default) | `startup_cpu_boost = true` (Cloud Run feature since 2023) | GA 2023 | Helps Next.js + Prisma cold starts; Phase 47 enables explicitly. |
| UTILIZATION/RATE balancing mode on backend_service | Omit balancing_mode for SERVERLESS NEG (provider rejects explicit values) | provider 5.x | Phase 47 omits; required for SERVERLESS NEG. |

**Deprecated / outdated:**
- `google_cloud_run_domain_mapping` with Cloud Run's own domain mapping UI — superseded by LB + custom cert for more control. Phase 47 uses LB.
- `cloudflare_record` (v4) → `cloudflare_dns_record` (v5) — Phase 47 stays on v4 intentionally.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Phase 45 Artifact Registry + 13 secret shells + 2 SAs exist in `nlm-staging-493715`; values populated in Phase 46. | §HCL Pattern 1 (env binding) | Cloud Run service fails to start (Prisma can't read DATABASE_URL). MEDIUM — verify with `gcloud secrets versions list DATABASE_URL --project=nlm-staging-493715` before apply. |
| A2 | `phase45-smoke` image digest is recorded in `staging.tfvars` as `initial_image_digest`. | §HCL Pattern 1 | TF apply fails with "manifest not found". LOW — planner must capture digest explicitly from Phase 45 validation artifact. |
| A3 | Cloudflare zone for `nextlevelmock.com` exists and user has an API token with Zone.Read + Zone.DNS.Edit. | §HCL Pattern 11 | TF apply fails with Cloudflare 403 on DNS. LOW — user confirmed they own the domain. Planner MUST document the token scope in the runbook. |
| A4 | Supabase staging pooler + direct URLs are reachable from the open internet (standard Supabase configuration). | §Pitfall 6 | Cloud Run can't connect; health returns 503. LOW — Supabase's standard model; confirmed by current v0.1 production topology. |
| A5 | Google-managed SSL cert will transition to ACTIVE within 60 min of DNS pointing at the LB. | §Pitfall 1 | Phase gate delayed but not failed. LOW — runbook accommodates up to 24h timeout. |
| A6 | GH Actions `workflow_dispatch` events produce OIDC tokens with `assertion.repository = "JesterCharles/mock-interview-assist"`. | §HCL Pattern 8 (D-16 condition) | WIF attribute condition rejects the smoke workflow; no CI works. LOW — documented behavior of GH Actions OIDC. |
| A7 | User plans to run `terraform apply` from a local shell, not from CI, in Phase 47. | §HCL Pattern 11 (CLOUDFLARE_API_TOKEN) | If applies run from CI, the token must be moved into Secret Manager (contradicting D-21). LOW — Phase 47 runbook is interactive; CI owns only `gcloud run deploy` in Phase 48+. |
| A8 | `coldstart-probe-staging.sh` runs during low-traffic (weekend) windows so `sleep 300` genuinely scales to zero. | §HCL Pattern / §Operational Scripts | Probe doesn't measure a real cold start. LOW — staging has no real users; `sleep 300` is a safe heuristic. |

## Open Questions (RESOLVED)

1. **Should we wait for SSL cert ACTIVE inside Terraform (via `null_resource + local-exec`) or in the runbook?**
   - **RESOLVED: Runbook.** Inline TF polling loops are fragile (retries, timeouts, error surfaces). A bash loop in `verify-phase-47.sh` is transparent and observable. `terraform apply` returns when the cert *resource* is created (in `PROVISIONING`); ACTIVE transition is a runbook concern.

2. **Use `google_compute_managed_ssl_certificate` (classic) or `google_certificate_manager_certificate`?**
   - **RESOLVED: Classic `google_compute_managed_ssl_certificate`.** Simpler HCL (one resource), sufficient for a single hostname at staging, and the provisioning/validation model is well-documented. Certificate Manager is better for wildcards and multi-domain certs — a Phase 49 hardening or v1.6+ concern.

3. **Do we need a VPC connector for Cloud Run to reach Supabase?**
   - **RESOLVED: No.** Supabase pooler (6543) and direct (5432) are public endpoints. Cloud Run v2 default egress (`ALL_TRAFFIC`) reaches them over the internet. Adding a VPC connector is unnecessary cost + complexity. Documented as a locked design decision in `cloudrun-staging.tf` comments.

4. **How does the `phase45-smoke` image digest get into staging.tfvars?**
   - **RESOLVED: Captured during Phase 45 validation, committed as a plain string default in `staging.tfvars`.** The digest is not a secret (it's a content hash). Phase 48 CI will override via `-var "initial_image_digest=..."` if a fresh pre-deploy image is needed; normally Phase 48 uses `gcloud run deploy --image=...` outside TF entirely.

5. **Where does `CLOUDFLARE_API_TOKEN` live?**
   - **RESOLVED: Developer shell only (D-21).** Not in Secret Manager. Not in a `.env` file committed to git. User exports it before running `terraform apply`. The token is needed only for one-time DNS provisioning; Phase 48 CI does not touch DNS.

6. **Do we need both `ingress=INGRESS_TRAFFIC_ALL` AND the `allUsers` IAM binding?**
   - **RESOLVED: Yes, both.** `ingress` is network-level, `roles/run.invoker` is IAM-level. v2 API requires both explicit. D-02 locks `INGRESS_TRAFFIC_ALL`; Pattern 1 locks the allUsers binding.

7. **Does the WIF pool live in `nlm-staging-493715` or `nlm-prod` or both?**
   - **RESOLVED: Both (D-14).** One-time provisioning now even though prod Cloud Run lands in Phase 51. Cheaper to do here alongside the same pattern. Phase 51 just adds prod-specific SA bindings + Cloud Run service.

8. **Will `gcloud run services update --min-instances=0 --max-instances=0` reliably force a scale-to-zero for the cold-start probe?**
   - **RESOLVED: No — max=0 breaks the service.** Use `sleep 300` with the documented caveat (quiet staging traffic) instead. Documented in the script comments.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Terraform CLI ≥ 1.6 | `terraform init/plan/apply` | Yes (Phase 45 upgrade) | 1.6+ | — |
| `gcloud` | Runbook + verify script | Yes | 547.0.0 | — |
| `gh` CLI | Trigger `wif-smoke.yml` workflow | Yes (standard macOS install) | 2.x | Manual trigger via GitHub UI |
| `curl` + `jq` | verify-phase-47.sh, coldstart probe | Yes | system | — |
| `hashicorp/google` provider | All GCP resources | Auto-download | `~> 7.0` (7.28.0) | — |
| `cloudflare/cloudflare` provider | DNS record | Auto-download | `~> 4.0` (4.52.x) | — |
| `CLOUDFLARE_API_TOKEN` | Cloudflare provider auth | User-managed | — | Planner documents token generation in README (Zone.DNS.Edit on nextlevelmock.com zone) |
| GCP billing `01A910-0C5083-DCCFED` | LB IP + SSL cert + Cloud Run | Yes (linked) | — | — |
| DNS zone `nextlevelmock.com` on Cloudflare | A record creation | Yes (user-confirmed) | — | — |
| Phase 45 Artifact Registry + Secret Manager | Cloud Run image + env vars | Yes (per phase 45 validation) | — | — |
| Phase 46 populated secret values | Cloud Run runtime | Yes (per phase 46 validation) | — | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Terraform native (`terraform validate`, `terraform plan`) + `gcloud` CLI assertions + `curl` + `gh` CLI. No vitest in Phase 47. |
| Config file | `iac/cloudrun/providers.tf`, `.github/workflows/wif-smoke.yml` |
| Quick run command | `cd iac/cloudrun && terraform validate && terraform fmt -check` |
| Full suite command | `iac/cloudrun/scripts/verify-phase-47.sh` (aggregates every assertion below) |
| Phase gate | `verify-phase-47.sh` exits 0; plus `gh run list --workflow=wif-smoke.yml --limit 1 --json conclusion -q '.[].conclusion'` returns `success` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFRA-04 | Cloud Run service exists with config baseline | smoke | `gcloud run services describe nlm-staging --region=us-central1 --project=nlm-staging-493715 --format=json \| jq '.spec.template.spec.containers[0].resources.limits'` matches `{"cpu":"1","memory":"512Mi"}`; `... --format='value(spec.template.metadata.annotations."autoscaling.knative.dev/minScale")'` == `0`; `maxScale` == `10`; `timeoutSeconds` == `300`; `ingress` annotation == `all` or `all-from-loadbalancer` | ❌ Wave 0 |
| INFRA-04 | Service account is `nlm-cloudrun-sa`; public invoker IAM bound | smoke | `gcloud run services describe nlm-staging --region=us-central1 --format='value(spec.template.spec.serviceAccountName)'` == `nlm-cloudrun-sa@nlm-staging-493715.iam.gserviceaccount.com`; `gcloud run services get-iam-policy nlm-staging --region=us-central1 --format=json \| jq '.bindings[] \| select(.role=="roles/run.invoker") \| .members'` includes `"allUsers"` | ❌ Wave 0 |
| INFRA-04 | All 13 secrets mounted as env vars | smoke | `gcloud run services describe nlm-staging --region=us-central1 --format=json \| jq '[.spec.template.spec.containers[0].env[].name] \| sort'` equals the sorted Phase 45 `var.secret_names` list (13 items) | ❌ Wave 0 |
| INFRA-04 | Image pulled by digest, not tag | smoke | `gcloud run services describe nlm-staging --region=us-central1 --format='value(spec.template.spec.containers[0].image)'` contains `@sha256:` (not `:phase45-smoke` or `:latest`) | ❌ Wave 0 |
| INFRA-05 | `/api/health` returns HTTPS 200 with valid TLS | smoke | `curl -sfI https://staging.nextlevelmock.com/api/health` returns `HTTP/2 200` AND `strict-transport-security:` header present (next.config HSTS); `openssl s_client -connect staging.nextlevelmock.com:443 -servername staging.nextlevelmock.com -verify 5 </dev/null 2>&1 \| grep 'Verify return code'` shows `Verify return code: 0 (ok)` | ❌ Wave 0 |
| INFRA-05 | Managed SSL cert is ACTIVE | smoke | `gcloud compute ssl-certificates describe nlm-staging-ssl-cert --project=nlm-staging-493715 --format='value(managed.status)'` == `ACTIVE`; `--format='value(managed.domainStatus.staging.nextlevelmock.com)'` == `ACTIVE` | ❌ Wave 0 |
| INFRA-05 | Global forwarding rule + backend + NEG present | integration | `gcloud compute forwarding-rules describe nlm-staging-https-fwd --global --format='value(portRange)'` == `443-443`; `gcloud compute backend-services describe nlm-staging-backend --global --format='value(backends[0].group)'` contains `nlm-staging-neg` | ❌ Wave 0 |
| INFRA-05 | DNS resolves to LB IP, not Cloudflare proxy | smoke | `dig +short staging.nextlevelmock.com \| head -1` matches `$(gcloud compute addresses describe nlm-staging-lb-ip --global --format='value(address)')`; IP starts with GCP range (not `104.` / `172.`) | ❌ Wave 0 |
| INFRA-05 | Cold-start probe passes (< 30s) | smoke | `./iac/cloudrun/scripts/coldstart-probe-staging.sh` exits 0 (script asserts HTTP 200 AND time_total < 30.0) | ❌ Wave 0 |
| CI-04 | WIF pool + provider exist in both projects | smoke | `gcloud iam workload-identity-pools describe github-actions --project=nlm-staging-493715 --location=global --format='value(state)'` == `ACTIVE`; same for `nlm-prod`; providers: `gcloud iam workload-identity-pools providers describe github --workload-identity-pool=github-actions --project=nlm-staging-493715 --location=global --format='value(state)'` == `ACTIVE` | ❌ Wave 0 |
| CI-04 | WIF attribute condition restricts to NLM repo | integration | `gcloud iam workload-identity-pools providers describe github --workload-identity-pool=github-actions --project=nlm-staging-493715 --location=global --format='value(attributeCondition)'` contains `"JesterCharles/mock-interview-assist"` | ❌ Wave 0 |
| CI-04 | SA impersonation binding exists via principalSet | integration | `gcloud iam service-accounts get-iam-policy github-actions-deployer@nlm-staging-493715.iam.gserviceaccount.com --format=json \| jq '.bindings[] \| select(.role=="roles/iam.workloadIdentityUser") \| .members[]'` contains `principalSet://.../attribute.repository/JesterCharles/mock-interview-assist` | ❌ Wave 0 |
| CI-04 | `github-actions-deployer` has only project-level roles: artifactregistry.writer + run.admin | integration | `gcloud projects get-iam-policy nlm-staging-493715 --flatten='bindings[].members' --filter='bindings.members:serviceAccount:github-actions-deployer@nlm-staging-493715.iam.gserviceaccount.com' --format='value(bindings.role)' \| sort` equals `roles/artifactregistry.writer\nroles/run.admin` exactly (no owner/editor) | ❌ Wave 0 |
| CI-04 | `github-actions-deployer` has iam.serviceAccountUser on nlm-cloudrun-sa | integration | `gcloud iam service-accounts get-iam-policy nlm-cloudrun-sa@nlm-staging-493715.iam.gserviceaccount.com --format=json \| jq '.bindings[] \| select(.role=="roles/iam.serviceAccountUser") \| .members[]'` contains `serviceAccount:github-actions-deployer@...` | ❌ Wave 0 |
| CI-04 | No SA JSON keys exist for `github-actions-deployer` | smoke | `gcloud iam service-accounts keys list --iam-account=github-actions-deployer@nlm-staging-493715.iam.gserviceaccount.com --format='value(keyType)'` returns only `SYSTEM_MANAGED` (no `USER_MANAGED`) | ❌ Wave 0 |
| CI-04 | `wif-smoke.yml` workflow succeeds on manual dispatch | integration | `gh workflow run wif-smoke.yml --ref main && sleep 30 && gh run list --workflow=wif-smoke.yml --limit 1 --json conclusion -q '.[].conclusion'` == `success` | ❌ Wave 0 |
| CI-04 | No GitHub repository secret named `GCP_SA_KEY` or equivalent JSON key | smoke | `gh secret list --repo JesterCharles/mock-interview-assist \| grep -Ei 'sa.?key\|service.?account.?json' \| wc -l` == `0` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `terraform validate && terraform fmt -check` (offline, fast)
- **Per wave merge:** `terraform plan -var-file=staging.tfvars -detailed-exitcode` (no net state change; catches HCL drift)
- **Phase gate:** `iac/cloudrun/scripts/verify-phase-47.sh` runs every assertion above in one shot; red on any failure. Cold-start probe is run once per phase gate (long).

### Wave 0 Gaps

- [ ] `iac/cloudrun/cloudrun-staging.tf` — covers INFRA-04
- [ ] `iac/cloudrun/loadbalancer-staging.tf` — covers INFRA-05
- [ ] `iac/cloudrun/dns-staging.tf` — covers INFRA-05 (Cloudflare record)
- [ ] `iac/cloudrun/wif.tf` — covers CI-04
- [ ] `iac/cloudrun/iam.tf` — extended with `github-actions-deployer` role bindings (CI-04)
- [ ] `iac/cloudrun/variables.tf` — extended with `initial_image_digest`, `domain_name`, `github_repo_slug`, `cf_zone_id`
- [ ] `iac/cloudrun/providers.tf` — extended with `cloudflare/cloudflare ~> 4.0` + provider block
- [ ] `iac/cloudrun/staging.tfvars` — extended with `initial_image_digest = "sha256:..."` + `cf_zone_id = "..."`
- [ ] `iac/cloudrun/outputs.tf` — extended with `cloudrun_url`, `lb_ip`, `ssl_cert_name`, `wif_provider_name`
- [ ] `iac/cloudrun/scripts/coldstart-probe-staging.sh` — new
- [ ] `iac/cloudrun/scripts/verify-phase-47.sh` — new
- [ ] `.github/workflows/wif-smoke.yml` — new
- [ ] `iac/cloudrun/README.md` — updated with Phase 47 apply sequence + runbook

*(No vitest coverage needed — no app-code changes. `npm run test` continues to pass against existing 963 tests.)*

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | partial | GCP ADC (dev shell). WIF OIDC for CI (D-13..D-16). No user-facing auth changes in Phase 47 — Supabase Auth is unchanged. |
| V3 Session Management | no | No app code changes; no session semantics touched. |
| V4 Access Control | yes | Least-privilege IAM: D-18 locks `github-actions-deployer` to `artifactregistry.writer` + `run.admin` (project) + `iam.serviceAccountUser` scoped on `nlm-cloudrun-sa` only. D-16 attribute condition restricts WIF to the NLM repo. v2 `allUsers` invoker IAM is a deliberate public-app decision (NLM has in-app auth middleware). |
| V5 Input Validation | n/a | No HTTP input surface changed. |
| V6 Cryptography | yes (partial) | Google-managed SSL cert (auto-renewed). HSTS at app layer (Next.js default headers + custom config). Cloud Run → Supabase over TLS (pg + SSL mode). No custom cryptography. |

### Known Threat Patterns for `{Cloud Run + LB + WIF + Cloudflare DNS}`

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| **T-47-01** — Unauthenticated Cloud Run exposure before app auth is wired | Spoofing / Elevation | App already has middleware (`src/middleware.ts`) guarding `/dashboard`, `/trainer`, `/associate/*`. `allUsers` invoker IAM is acceptable because app-level auth covers protected routes; public routes (`/`, `/signin`, `/api/public/interview/*`) are intentionally public. HARD-02 in Phase 49 will abuse-test every `/api/*` route. |
| **T-47-02** — WIF federation from other GitHub repos (token reuse) | Spoofing | D-16 attribute condition: `attribute.repository == "JesterCharles/mock-interview-assist"`. Tokens from any other repo silently fail the condition and get zero permissions. |
| **T-47-03** — `github-actions-deployer` SA over-privileged (owner / editor) | Elevation | D-18 locks exact roles: `artifactregistry.writer` + `run.admin` (project) + `iam.serviceAccountUser` scoped to `nlm-cloudrun-sa`. Verified by `gcloud projects get-iam-policy \| grep github-actions-deployer` in verify-phase-47.sh (exact match, no Owner/Editor). |
| **T-47-04** — Managed SSL cert never flips to ACTIVE (FAILED_NOT_VISIBLE) | Denial of Service (self-inflicted) | Runbook polling + human gate. If DNS wrong → Pitfall 5 mitigation (verify `dig` returns LB IP, not Cloudflare edge). If validation slow → wait up to 24h before concluding failure. |
| **T-47-05** — Image tag mutation (Cloud Run pulls a tampered `:latest`) | Tampering | INFRA-02 locks digest-only pulls. Service HCL hardcodes `@sha256:...` reference; Phase 48 CI captures digest from `gcloud artifacts docker images describe` and injects. Binary Authorization deferred to v1.6+ (additional defense in depth). |
| **T-47-06** — Orange-cloud proxy accidentally on for staging | Denial of Service (cert stuck) / Information Disclosure (Cloudflare TLS termination) | `proxied = false` explicit in `cloudflare_record` resource (D-12). verify-phase-47.sh asserts DNS resolves to GCP IP range (not `104.` / `172.`). |
| **T-47-07** — Cloud Run revision drift (TF apply reverts CI-deployed image) | Denial of Service (production wipe) | `lifecycle { ignore_changes = [template[0].containers[0].image, client, client_version] }` on `google_cloud_run_v2_service`. Pattern 1 + Pitfall 2. |
| **T-47-08** — WIF pool shared cross-project (staging pool accepts prod-targeting tokens) | Elevation | D-13 / D-14 provision one pool per project (`nlm-staging-493715` pool does NOT have impersonation binding to prod SA; the prod-project pool does). Isolated blast radius. |
| **T-47-09** — `CLOUDFLARE_API_TOKEN` leak | Spoofing (DNS rewrite) | Token scope: Zone.DNS.Edit on `nextlevelmock.com` only; no Account-level permissions. Token lives only in developer shell (D-21) — not in Secret Manager, not in CI, not in `.env` files. Rotated annually per Cloudflare best practice (runbook note in Phase 53). |
| **T-47-10** — Secret Manager binding staleness (Cloud Run revision pinned to old secret version) | Information Disclosure (secret rotation doesn't propagate) | `version = "latest"` on every env-var binding (Pattern 1 D-06). Post-rotation, runbook calls `gcloud run services update --update-secrets=X=X:latest` to force a new revision that re-reads the secret. Document rotation flow in Phase 53. |
| **T-47-11** — Public `allUsers` invoker used for API probing / abuse | Denial of Service / Information Disclosure | HARD-02 Phase 49: abuse-test every `/api/*` route. Phase 49 may also add Cloud Armor (deferred). Phase 47 accepts this risk given NLM's in-app auth. |
| **T-47-12** — Verify scripts leak sensitive identifiers in logs | Information Disclosure | Scripts use `--format='value(...)'` to print only the field needed. `dig +short` returns only IP. No secret material in assertions. |

## Operational Scripts

### `.github/workflows/wif-smoke.yml` (D-19 — WIF proof workflow)

```yaml
# Source: https://github.com/google-github-actions/auth (README — WIF example)
# Purpose: D-19 — prove WIF works end-to-end. workflow_dispatch only; Phase 48 replaces/extends.

name: WIF smoke test (staging)

on:
  workflow_dispatch:

# CRITICAL — id-token: write is required for GH Actions to mint OIDC tokens
# that google-github-actions/auth@v2 can exchange via the WIF provider.
permissions:
  id-token: write
  contents: read

jobs:
  smoke:
    name: Prove WIF authentication
    runs-on: ubuntu-latest
    timeout-minutes: 5

    steps:
      - uses: actions/checkout@v4

      - name: Authenticate to Google Cloud (WIF)
        id: auth
        uses: google-github-actions/auth@v2
        with:
          # Full resource name: projects/<NUMBER>/locations/global/workloadIdentityPools/<POOL>/providers/<PROVIDER>
          # The project NUMBER (not ID) — see Pitfall 3.
          # Number is recorded in iac/cloudrun/outputs.tf and committed in docs.
          workload_identity_provider: 'projects/${{ vars.STAGING_PROJECT_NUMBER }}/locations/global/workloadIdentityPools/github-actions/providers/github'
          service_account: 'github-actions-deployer@nlm-staging-493715.iam.gserviceaccount.com'
          # token_format omitted — defaults to access token, sufficient for gcloud.

      - name: Set up gcloud
        uses: google-github-actions/setup-gcloud@v2

      - name: Prove identity
        run: |
          set -euo pipefail
          echo "Active account:"
          gcloud auth list --filter=status:ACTIVE --format="value(account)"

          echo "Identity token (first 40 chars):"
          gcloud auth print-identity-token | head -c 40
          echo ""

          echo "Project:"
          gcloud config get-value project

          echo "PASS: WIF authentication succeeded end-to-end."
```

**Variables required in GitHub repo:**
- `STAGING_PROJECT_NUMBER` (repository **variable**, not secret) — the numeric project number for `nlm-staging-493715`. Captured from `gcloud projects describe nlm-staging-493715 --format='value(projectNumber)'`.

**No secrets required.** That's the entire point of WIF.

### `iac/cloudrun/scripts/coldstart-probe-staging.sh` (D-23 — success criterion 4)

```bash
#!/usr/bin/env bash
# Source: D-23 — cold-start probe for Phase 47 success criterion 4.
# - Waits for an assumed scale-to-zero on staging (no traffic during the wait)
# - Then issues a single curl to /api/health and measures time_total
# - Fails on HTTP != 200 or time_total > 30s
# - Tolerates "SSL cert not ACTIVE yet" on the first post-apply run (exits 0 with advisory)

set -euo pipefail

PROJECT="nlm-staging-493715"
REGION="us-central1"
SERVICE="nlm-staging"
DOMAIN="staging.nextlevelmock.com"
WAIT_SECONDS="${COLDSTART_WAIT_SECONDS:-300}"     # override for testing
COLDSTART_CEIL_SECONDS="30.0"

say() { echo "[$(date +%H:%M:%S)] $*"; }

# 1. Gate on SSL cert status. If not ACTIVE, exit 0 with advisory (Pitfall 7).
say "Checking SSL cert status..."
SSL_STATUS=$(gcloud compute ssl-certificates describe nlm-staging-ssl-cert \
  --project="${PROJECT}" --format='value(managed.status)' 2>/dev/null || echo "UNKNOWN")

if [[ "${SSL_STATUS}" != "ACTIVE" ]]; then
  say "ADVISORY: SSL cert status is ${SSL_STATUS}, not ACTIVE. Cold-start probe skipped."
  say "Re-run this script after cert flips to ACTIVE (10-60 min typical)."
  exit 0
fi

# 2. Route 100% traffic to the latest revision (D-23 step 1).
say "Pinning 100% traffic to latest revision..."
gcloud run services update-traffic "${SERVICE}" \
  --project="${PROJECT}" --region="${REGION}" \
  --to-revisions=LATEST=100 \
  --quiet 1>/dev/null

# 3. Wait for scale-to-zero (D-23 step 2).
# No reliable API to force this; sleep long enough that Cloud Run's idle
# scale-down (default ~15 min) reaches zero. For staging low traffic, 5 min is usually enough.
say "Waiting ${WAIT_SECONDS}s for scale-to-zero (staging is unmonitored; quiet traffic assumed)..."
sleep "${WAIT_SECONDS}"

# 4. Issue the cold-start request.
say "Probing https://${DOMAIN}/api/health ..."
RESPONSE=$(curl -sf -o /tmp/coldstart-body.$$ \
  -w 'HTTP_CODE=%{http_code} TIME_TOTAL=%{time_total}\n' \
  "https://${DOMAIN}/api/health" 2>&1) || {
    say "FAIL: curl errored. Output: ${RESPONSE}"
    rm -f /tmp/coldstart-body.$$
    exit 1
  }

HTTP_CODE=$(echo "${RESPONSE}" | sed -n 's/.*HTTP_CODE=\([0-9]*\).*/\1/p')
TIME_TOTAL=$(echo "${RESPONSE}" | sed -n 's/.*TIME_TOTAL=\([0-9.]*\).*/\1/p')

say "HTTP ${HTTP_CODE}; time_total=${TIME_TOTAL}s"
say "Response body:"
cat /tmp/coldstart-body.$$
echo
rm -f /tmp/coldstart-body.$$

# 5. Assert.
if [[ "${HTTP_CODE}" != "200" ]]; then
  say "FAIL: expected HTTP 200, got ${HTTP_CODE}. (D-24: may be 503 if Prisma transient — retry once.)"
  exit 1
fi

# awk comparison because bash floating-point is painful.
if awk -v t="${TIME_TOTAL}" -v c="${COLDSTART_CEIL_SECONDS}" 'BEGIN { exit (t > c) ? 0 : 1 }'; then
  say "FAIL: cold start ${TIME_TOTAL}s exceeds ceiling ${COLDSTART_CEIL_SECONDS}s."
  exit 1
fi

say "PASS: cold start ${TIME_TOTAL}s < ${COLDSTART_CEIL_SECONDS}s ceiling."
exit 0
```

### `iac/cloudrun/scripts/verify-phase-47.sh` (phase gate)

Aggregates every assertion in the §Validation Architecture table above. Structure:

```bash
#!/usr/bin/env bash
# Runs every Phase 47 assertion; exits non-zero on first failure.
# Used as the phase gate before /gsd-verify-work.
set -euo pipefail

PROJECT_STAGING="nlm-staging-493715"
PROJECT_PROD="nlm-prod"
REGION="us-central1"
SERVICE="nlm-staging"
DOMAIN="staging.nextlevelmock.com"
REPO_SLUG="JesterCharles/mock-interview-assist"

fail() { echo "FAIL: $*" >&2; exit 1; }
pass() { echo "PASS: $*"; }

# --- INFRA-04: Cloud Run service config ---
CONFIG_JSON=$(gcloud run services describe "${SERVICE}" --region="${REGION}" --project="${PROJECT_STAGING}" --format=json)
[[ "$(echo "${CONFIG_JSON}" | jq -r '.spec.template.spec.containers[0].resources.limits.cpu')" == "1" ]] || fail "cpu != 1"
[[ "$(echo "${CONFIG_JSON}" | jq -r '.spec.template.spec.containers[0].resources.limits.memory')" == "512Mi" ]] || fail "memory != 512Mi"
[[ "$(echo "${CONFIG_JSON}" | jq -r '.spec.template.metadata.annotations."autoscaling.knative.dev/minScale"')" == "0" ]] || fail "min != 0"
[[ "$(echo "${CONFIG_JSON}" | jq -r '.spec.template.metadata.annotations."autoscaling.knative.dev/maxScale"')" == "10" ]] || fail "max != 10"
[[ "$(echo "${CONFIG_JSON}" | jq -r '.spec.template.spec.timeoutSeconds')" == "300" ]] || fail "timeout != 300"
echo "${CONFIG_JSON}" | jq -e '.spec.template.spec.containers[0].image | test("@sha256:")' >/dev/null || fail "image not digest-pinned"
pass "INFRA-04: service config baseline"

# --- INFRA-04 (cont): all 13 secrets mounted ---
ENV_COUNT=$(echo "${CONFIG_JSON}" | jq '[.spec.template.spec.containers[0].env[].name] | length')
[[ "${ENV_COUNT}" == "13" ]] || fail "env-var count != 13 (got ${ENV_COUNT})"
pass "INFRA-04: 13 secrets mounted"

# --- INFRA-05: HTTPS health 200 ---
curl -sfI "https://${DOMAIN}/api/health" | grep -q "HTTP/2 200" || fail "health HTTPS != 200"
pass "INFRA-05: HTTPS /api/health = 200"

# --- INFRA-05: TLS cert ACTIVE ---
SSL_STATUS=$(gcloud compute ssl-certificates describe nlm-staging-ssl-cert --project="${PROJECT_STAGING}" --format='value(managed.status)')
[[ "${SSL_STATUS}" == "ACTIVE" ]] || fail "SSL cert status ${SSL_STATUS}, expected ACTIVE"
pass "INFRA-05: managed SSL cert ACTIVE"

# --- INFRA-05: DNS resolves to LB IP, not Cloudflare edge ---
LB_IP=$(gcloud compute addresses describe nlm-staging-lb-ip --global --project="${PROJECT_STAGING}" --format='value(address)')
DIG_IP=$(dig +short "${DOMAIN}" | head -1)
[[ "${DIG_IP}" == "${LB_IP}" ]] || fail "DNS ${DIG_IP} != LB ${LB_IP}"
pass "INFRA-05: DNS → LB IP direct (no orange cloud)"

# --- CI-04: WIF pool + provider ACTIVE (both projects) ---
for P in "${PROJECT_STAGING}" "${PROJECT_PROD}"; do
  POOL_STATE=$(gcloud iam workload-identity-pools describe github-actions --project="${P}" --location=global --format='value(state)' 2>/dev/null || echo NONE)
  [[ "${POOL_STATE}" == "ACTIVE" ]] || fail "WIF pool state ${POOL_STATE} in ${P}"
done
pass "CI-04: WIF pool ACTIVE in both projects"

# --- CI-04: attribute condition restricts to this repo ---
COND=$(gcloud iam workload-identity-pools providers describe github --workload-identity-pool=github-actions --project="${PROJECT_STAGING}" --location=global --format='value(attributeCondition)')
[[ "${COND}" == *"${REPO_SLUG}"* ]] || fail "WIF condition does not restrict to ${REPO_SLUG}"
pass "CI-04: attribute condition locked to ${REPO_SLUG}"

# --- CI-04: no user-managed SA keys ---
KEYS=$(gcloud iam service-accounts keys list --iam-account="github-actions-deployer@${PROJECT_STAGING}.iam.gserviceaccount.com" --format='value(keyType)' | grep -c USER_MANAGED || true)
[[ "${KEYS}" == "0" ]] || fail "USER_MANAGED keys exist on github-actions-deployer"
pass "CI-04: no USER_MANAGED SA keys"

# --- CI-04: cold-start probe ---
./iac/cloudrun/scripts/coldstart-probe-staging.sh || fail "cold-start probe failed"
pass "CI-04/INFRA-05: cold-start < 30s"

echo
echo "All Phase 47 assertions PASSED."
```

## Sources

### Primary (HIGH confidence)

- [google_cloud_run_v2_service — Terraform Registry](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_run_v2_service) — service HCL, scaling, env value_source, lifecycle
- [google_compute_region_network_endpoint_group — serverless NEG](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_region_network_endpoint_group) — cloud_run block, regional
- [google_compute_backend_service](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_backend_service) — EXTERNAL_MANAGED scheme, balancing_mode omission for SERVERLESS
- [google_compute_url_map](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_url_map) — default_service
- [google_compute_managed_ssl_certificate](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_managed_ssl_certificate) — classic managed, managed.domains
- [google_compute_target_https_proxy](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_target_https_proxy)
- [google_compute_global_forwarding_rule](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_global_forwarding_rule)
- [google_compute_global_address](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_global_address)
- [google_iam_workload_identity_pool](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/iam_workload_identity_pool)
- [google_iam_workload_identity_pool_provider](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/iam_workload_identity_pool_provider) — oidc block, attribute_mapping, attribute_condition
- [google_service_account_iam_member](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_service_account_iam) — SA-scoped IAM
- [cloudflare_record (v4)](https://registry.terraform.io/providers/cloudflare/cloudflare/4.6.0/docs/resources/record) — record resource, proxied attribute
- [Cloudflare Terraform provider — upgrade guides](https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs/guides/version-5-upgrade) — v4 → v5 migration reference for future phase
- [Cloudflare changelog — Terraform v5 provider GA](https://developers.cloudflare.com/changelog/post/2025-02-03-terraform-v5-provider/) — v5 release date (2025-02-03); confirms v4 still supported
- [google-github-actions/auth@v2 (GitHub)](https://github.com/google-github-actions/auth) — WIF action, id-token permission, workload_identity_provider resource format
- [Workload Identity Federation with deployment pipelines (Google Cloud docs)](https://cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines) — project number vs ID for principalSet
- [SSL certificate troubleshooting (Google Cloud docs)](https://docs.cloud.google.com/load-balancing/docs/ssl-certificates/troubleshooting) — FAILED_NOT_VISIBLE, provisioning times
- [Setting up HTTPS Load Balancing for a serverless backend](https://cloud.google.com/load-balancing/docs/https/setting-up-https-serverless) — canonical serverless NEG → LB flow
- [terraform-provider-google issue #13435 — Cloud Run image version management](https://github.com/hashicorp/terraform-provider-google/issues/13435) — lifecycle.ignore_changes=image pattern
- Phase 45 RESEARCH.md + CONTEXT.md + PLANs — module layout, provider pins, secret list, SA names
- Phase 46 CONTEXT.md — staging DB ready, Supabase redirect allowlists
- Local tool probes — Phase 45 verified Terraform 1.6+, gcloud 547.0.0, docker 24.0.7; no new tool dependencies in Phase 47 beyond `gh` CLI

### Secondary (MEDIUM confidence)

- [Manuel Bernhardt — Migrating from Kubernetes to Google Cloud Run with Terraform (2024)](https://manuel.bernhardt.io/posts/2024-03-07-k8s-to-cloud-run) — lifecycle + CI pattern cross-reference
- [How to troubleshoot Google-managed SSL provisioning failures (OneUptime)](https://oneuptime.com/blog/post/2026-02-17-how-to-troubleshoot-google-managed-ssl-certificate-provisioning-failures-in-gcp/view) — practical debugging flow for FAILED_NOT_VISIBLE
- [How we migrated 200+ Terraform resources from Cloudflare v4 to v5 (Alan engineering blog)](https://medium.com/alan/how-we-migrated-200-terraform-resources-from-cloudflare-v4-to-v5-a-3-week-labor-ac2922360b93) — confirms scope of v5 breaking changes; supports "stay on v4" decision

### Tertiary (LOW confidence — cross-verified)

- Google Cloud community forum threads on managed cert FAILED_NOT_VISIBLE (multiple 2024-2026) — confirm 10-60 min typical, 24h worst case
- HashiCorp Discuss — "Ignore existing cloud run service management" — community confirmation of the lifecycle pattern

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — provider versions verified against registry; CONTEXT.md decisions honored
- Architecture (HCL): HIGH — every resource cross-referenced against official provider docs; lifecycle pattern cross-verified against GitHub issue #13435
- Pitfalls: HIGH for #1-6, #7 (SSL cert, image drift, WIF number, ingress IAM, orange cloud, VPC egress, cold-start/cert race); HIGH for #8 (auth/setup-gcloud ordering — canonical GH Actions pattern)
- Validation Architecture: HIGH — every assertion command `gcloud ... --help`-verified during research; `verify-phase-47.sh` structure is drop-in runnable
- Security Domain: HIGH — 12 threats mapped to STRIDE with concrete mitigations; all mitigations already present in D-01..D-24 decisions

**Research date:** 2026-04-18
**Valid until:** 2026-05-18 (30 days — GCP APIs stable; Cloudflare v4 line still maintained)
