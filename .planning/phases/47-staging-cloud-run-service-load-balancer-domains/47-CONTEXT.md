# Phase 47: Staging Cloud Run Service + Load Balancer + Domains - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning
**Mode:** `--auto`

<domain>
## Phase Boundary

Phase 47 provisions **the staging Cloud Run service** at `staging.nextlevelmock.com`, fronted by Google Cloud Load Balancer with managed SSL, consuming Secret Manager secrets (Phase 45) and the staging Supabase DB (Phase 46). **Workload Identity Federation** is established so GH Actions (Phase 48) can push + deploy without SA JSON keys.

**In scope:** Cloud Run service `nlm-staging` resource + HTTPS load balancer + managed SSL cert + URL map + HTTP(S) proxy + forwarding rule + Cloudflare DNS record for `staging.nextlevelmock.com`; WIF workload identity pool + provider + SA impersonation bindings; service config to pin min-instances=0 / max=10 / cpu=1 / memory=512Mi / timeout=300s; env-var binding from Secret Manager.

**Out of scope:** Prod Cloud Run (Phase 51), GH Actions workflows themselves (Phase 48 wires them; Phase 47 only proves WIF works via a test manual workflow dispatch), CDN, traffic splitting, canary, blue/green (Phase 48+).

</domain>

<decisions>
## Implementation Decisions

### Cloud Run Service (INFRA-04)
- **D-01:** Service name `nlm-staging` in GCP project `nlm-staging-493715`, region `us-central1` (same as Artifact Registry).
- **D-02:** Service config baseline (REQUIREMENTS.md INFRA-04 locked): `min-instances=0`, `max-instances=10`, `cpu=1`, `memory=512Mi`, `timeout=300s`, `ingress=all`, `allow-unauthenticated=true` (public app).
- **D-03:** Container entrypoint uses Dockerfile default (Next.js standalone server listening on `$PORT`, Cloud Run sets `PORT=8080`). Next.js standalone binds `0.0.0.0:$PORT` by default — no Dockerfile change needed.
- **D-04:** Image source: `us-central1-docker.pkg.dev/nlm-staging-493715/nlm-app/nlm-app` pulled by **digest only** (`@sha256:...`) per INFRA-02. Initial deploy uses the `phase45-smoke` image digest captured in Phase 45 outputs until Phase 48 CI writes fresh digests.
- **D-05:** Runtime service account = `nlm-cloudrun-sa@nlm-staging-493715.iam.gserviceaccount.com` (provisioned in Phase 45, has per-secret `secretAccessor`).
- **D-06:** Env vars mounted from Secret Manager via `--set-secrets` syntax (Terraform: `env { value_source { secret_key_ref { secret = ..., version = "latest" } } }`). All 13 secrets mounted — even the ones Phase 47 doesn't use, to surface missing values early.
- **D-07:** `NEXT_PUBLIC_SITE_URL` secret value set to `https://staging.nextlevelmock.com` as part of Phase 47 (post-deploy; runbook step).

### Load Balancer + SSL + Domain (INFRA-05)
- **D-08:** External HTTPS Load Balancer (global, classic — not regional) with Serverless NEG pointing at the Cloud Run service.
- **D-09:** Managed SSL certificate for `staging.nextlevelmock.com` (Google-managed, auto-renewal).
- **D-10:** URL map routes all paths to the Cloud Run NEG (no host/path-based routing needed yet).
- **D-11:** Forwarding rule on a global static IP named `nlm-staging-lb-ip` (reserved in this phase; IP address goes into the DNS record).
- **D-12:** Cloudflare DNS: `staging.nextlevelmock.com` → A record pointing at the reserved LB IP. **Orange cloud OFF in Phase 47** (staging). The orange-cloud/proxy only turns on for the prod record in Phase 51.

### Workload Identity Federation (CI-04)
- **D-13:** Provisioned in `nlm-staging-493715` project: Workload Identity Pool `github-actions`, OIDC Provider `github` with issuer `https://token.actions.githubusercontent.com`, allowed audience `https://iam.googleapis.com/projects/.../workloadIdentityPools/github-actions/providers/github`.
- **D-14:** WIF pool and provider **also provisioned in `nlm-prod`** (one-time, even though prod deploy is Phase 51 — cheaper to do it here alongside the pattern; Phase 51 re-uses).
- **D-15:** Attribute mapping: `google.subject=assertion.sub`, `attribute.actor=assertion.actor`, `attribute.repository=assertion.repository`, `attribute.ref=assertion.ref`.
- **D-16:** Attribute condition restricts federation to the GitHub repo only: `attribute.repository == "JesterCharles/mock-interview-assist"`. This blocks federation from any other repo even if tokens leak.
- **D-17:** Impersonation binding: `github-actions-deployer@{project}.iam.gserviceaccount.com` receives `roles/iam.workloadIdentityUser` via `principalSet://.../attribute.repository/JesterCharles/mock-interview-assist`.
- **D-18:** `github-actions-deployer` SA gets these project-level roles in Phase 47:
  - `roles/artifactregistry.writer` (push images)
  - `roles/run.admin` (deploy Cloud Run services)
  - `roles/iam.serviceAccountUser` (actAs `nlm-cloudrun-sa` during deploy)
  - **NOT** `roles/owner` or `roles/editor` — least privilege.
- **D-19:** WIF proof test = a manual GH Actions workflow (`.github/workflows/wif-smoke.yml`, triggered `workflow_dispatch`) that uses `google-github-actions/auth@v2` with WIF, runs `gcloud auth print-identity-token`, and exits 0 if identity resolves. Runs once, then file remains (Phase 48 deletes / replaces).

### Module Layout Extensions
- **D-20:** New HCL files under `iac/cloudrun/`: `cloudrun-staging.tf`, `loadbalancer-staging.tf`, `dns-staging.tf` (Cloudflare provider), `wif.tf` (pool + provider + bindings, per-env via for_each). **Not creating `cloudrun-prod.tf` yet — Phase 51 adds it.**
- **D-21:** Cloudflare provider: `cloudflare/cloudflare ~> 4.0`. Auth via `CLOUDFLARE_API_TOKEN` env var (zone-scoped). Token stored in `nlm-prod` Secret Manager as `CLOUDFLARE_API_TOKEN` (new secret shell added to Phase 45 list... **actually Phase 45 doesn't have it — add via tfvars variable here or extend 45 variables.tf in 47**). Planner decides: extend 45's `variables.tf` with the new secret name, and add `google_secret_manager_secret.cloudflare_token` in 47 (acceptable extension; not a Phase 45 regression since the infra was just "secret shells" and adding one is additive). Alternatively, pass the token via developer env var during terraform apply and never persist it server-side in Secret Manager — **pick this** to keep Phase 45 closed: Cloudflare token only lives in developer shell, not Secret Manager. DNS is a one-time-per-phase op; not needed at Cloud Run runtime.
- **D-22:** Use existing Phase 45 `staging.tfvars` to pass `env = "staging"` and the smoke-image digest.

### Cold-Start Verification (success criterion 4)
- **D-23:** After apply, run a script `iac/cloudrun/scripts/coldstart-probe-staging.sh` that:
  1. Calls `gcloud run services update-traffic nlm-staging --to-revisions=LATEST=100 --region=us-central1` (ensures latest)
  2. Waits for instance count to fall to 0 (`gcloud run services describe ... --format='value(status.conditions)'`, or `sleep 300` as a safe default)
  3. Issues `curl -sf -w '\n%{time_total}' https://staging.nextlevelmock.com/api/health`
  4. Asserts `time_total < 30.0` and HTTP status 200
- **D-24:** The response body for `/api/health` in staging **may return 503** if Prisma connection fails (staging DB reachability transient). Runbook escalation: if cold start is 200 locally but 503 on Cloud Run, the issue is Secret Manager binding or VPC egress (which we don't configure; default egress is direct internet). Plan 04 (or phase 47 Plan 03) documents troubleshooting.

### Claude's Discretion
- Exact LB resource names (e.g., `google_compute_global_address.nlm_staging_lb_ip` vs shorter).
- Whether to use `google_compute_managed_ssl_certificate` or `google_certificate_manager_certificate` (the newer Certificate Manager product). Planner picks based on GCP docs current best-practice; Managed SSL Certificates (classic) is fine for staging and has simpler HCL.
- Cloudflare provider auth strategy (env var vs `api_token` attribute).
- Whether to pin the initial Cloud Run image to `phase45-smoke` digest explicitly or use an `image` variable default.
- Whether to wait for SSL cert ACTIVE status in TF (via data source polling) or let runbook step handle it.

### Folded Todos
None.

</decisions>

<canonical_refs>
## Canonical References

### Milestone anchor
- `.planning/REQUIREMENTS.md` §Infrastructure (INFRA-04, INFRA-05), §CI (CI-04)
- `.planning/ROADMAP.md` §Phase 47 success criteria 1-4
- `.planning/phases/45-*/45-CONTEXT.md` (D-07 Registry, D-11 SAs, D-12 APIs)
- `.planning/phases/45-*/45-RESEARCH.md` §Security Domain (WIF threat mitigation)
- `.planning/phases/46-*/46-CONTEXT.md` (staging DB + secret rotation done)

### Existing code
- `Dockerfile` (unchanged; binds `$PORT`)
- `src/app/api/health/route.ts` (dual-dep Prisma + Judge0; INFRA-07 smoke test relaxation)
- `src/lib/prisma.ts`, `src/lib/supabase*.ts` (consume env vars from Secret Manager)

### External specs
- Cloud Run IaC: `google_cloud_run_v2_service` (v7 provider) — preferred over v1.
- Load Balancer: [GCP serverless NEG + classic HTTPS LB pattern](https://cloud.google.com/load-balancing/docs/https/setting-up-https-serverless).
- WIF: [Workload Identity Federation with GitHub](https://cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines).
- `google-github-actions/auth` v2: [official GH Action](https://github.com/google-github-actions/auth).
- Managed SSL certs: [google_compute_managed_ssl_certificate](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_managed_ssl_certificate).
- Cloudflare provider: [cloudflare/cloudflare](https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `iac/cloudrun/providers.tf` etc. — extended, not rewritten.
- `iac/cloudrun/staging.tfvars` — receives `image_digest` and `env = "staging"` vars.
- Phase 45 outputs (`artifact_registry_repository_id`, `cloudrun_service_account_email`, `secret_ids`) — consumed by Phase 47 resources.

### Established Patterns
- HCL split by resource type (D-20 continues the pattern).
- Cloudflare = brand-new provider; no existing patterns.

### Integration Points
- Phase 48 CI will `terraform apply` incrementally (e.g., only Cloud Run service resource after image push) — so Phase 47 must lay out resources such that individual `-target` applies work (best practice anyway).
- Phase 51 clones the staging pattern for prod.

</code_context>

<specifics>
## Specific Ideas

- User likes the free-tier Cloudflare path — orange cloud off on staging (direct to LB IP, no Cloudflare proxy). Only enable orange cloud on prod in Phase 51.
- User explicitly wants WIF (no JSON keys). Phase 47 is the "prove WIF works" phase; Phase 48 uses it.
- Cold-start target 30s is the success criterion 4 ceiling; actual Cloud Run cold starts for a Next.js standalone container typically 8-15s. Should easily pass.

</specifics>

<deferred>
## Deferred Ideas

- **CDN / Cloud CDN in front of LB** — out of scope; v1.6+.
- **Regional LB / multi-region Cloud Run** — single region `us-central1`.
- **Cloud Armor (WAF)** — Phase 49 hardening reviews; deferred.
- **Custom min-instances on staging (>0)** — INFRA-04 explicitly wants 0. Can revisit after Phase 49 load data.
- **TLS 1.3 cipher suite tuning** — defaults OK.
- **SSL cert via Certificate Manager** (newer product) — stay on `google_compute_managed_ssl_certificate` (classic) for simplicity.

### Reviewed Todos (not folded)
None.

</deferred>

---

*Phase: 47-staging-cloud-run-service-load-balancer-domains*
*Context gathered: 2026-04-18 (auto mode)*
