---
phase: 51-prod-cloud-run-deploy-prod-pipeline-dns-records
plan: 01
subsystem: infra
tags: [cloudrun, loadbalancer, ssl, terraform, prod, unattended-halt-pre-apply]
dependency-graph:
  requires: [47-01 staging cloudrun pattern, 47-02 staging LB pattern, 45-03 secret shells in nlm-prod]
  provides: [iac/cloudrun/cloudrun-prod.tf, iac/cloudrun/loadbalancer-prod.tf, prod_cloudrun_url, prod_lb_ip, prod_ssl_cert_name outputs, fetch-latest-staging-digest.sh, promote-staging-digest-to-prod.sh]
  affects: [51-02 dns-prod.tf (consumes prod_lb_ip), 51-03 deploy-prod.yml (deploys to nlm-prod service), 51-04 verify-phase-51.sh (asserts service config), 52-01 apex flip (changes cloudflare_record.apex.value target)]
tech-stack:
  added: []
  patterns: [count-gated env HCL resources, digest-only Cloud Run pulls, lifecycle.ignore_changes on image field, create_before_destroy on managed SSL cert, multi-domain managed cert]
key-files:
  created:
    - iac/cloudrun/cloudrun-prod.tf
    - iac/cloudrun/loadbalancer-prod.tf
    - iac/cloudrun/scripts/fetch-latest-staging-digest.sh
    - iac/cloudrun/scripts/promote-staging-digest-to-prod.sh
  modified:
    - iac/cloudrun/outputs.tf (added prod_cloudrun_url, prod_lb_ip, prod_ssl_cert_name, staging_lb_ip)
    - iac/cloudrun/prod.tfvars (added initial_image_digest, cf_zone_id, v01_gce_ip PLACEHOLDERS)
    - iac/cloudrun/variables.tf (added v01_gce_ip variable)
decisions:
  - Mirrored Phase 47 count-gated pattern (`count = var.env == "prod" ? 1 : 0`) instead of the plan's literal `var.prod_project_id` pattern — matches actual on-disk staging HCL layout; single `var.project_id` drives per-env apply.
  - SSL cert resource name = `nlm_prod_cert` (HCL) with `name = "nlm-prod-ssl-cert"` (GCP) — matches staging naming convention (`nlm_staging_cert` / `nlm-staging-ssl-cert`).
  - `deletion_protection = true` on prod Cloud Run service (staging had `= false`) — v1.5 prod-specific accidental-destroy guard.
  - Placeholder tfvars values intentionally block `terraform apply` — operator must overwrite before live mutation (per Phase 47 D-26 pattern).
metrics:
  duration: "~12 min wall (discover + write + validate + commit)"
  completed: "2026-04-18"
---

# Phase 51 Plan 01: Prod Cloud Run + Load Balancer + SSL Cert Summary

Provisioned HCL + helper scripts for prod Cloud Run service + HTTPS LB + managed SSL cert covering `nextlevelmock.com` + `www.nextlevelmock.com`, mirroring the Phase 47 staging pattern. Live `terraform apply` halted per unattended rules — prod apply is human-gated because v0.1 GCE is still serving users on the apex.

## What Shipped

### HCL

- `iac/cloudrun/cloudrun-prod.tf` (79 lines) — `google_cloud_run_v2_service.nlm_prod` with:
  - `name = "nlm-prod"`, `location = us-central1`, `project = nlm-prod`
  - `ingress = "INGRESS_TRAFFIC_ALL"`, `deletion_protection = true`
  - Runtime SA `nlm-cloudrun-sa@nlm-prod.iam.gserviceaccount.com` (via `google_service_account.cloudrun.email`)
  - Scaling min=0, max=10, timeout=300s, cpu=1, mem=512Mi, startup_cpu_boost=true
  - 13 secret env blocks via `dynamic "env"` (`version = "latest"`)
  - `lifecycle.ignore_changes = [template[0].containers[0].image, client, client_version]` — CI-deploy digest drift guard
  - `google_cloud_run_v2_service_iam_member.public_invoke_prod` grants `roles/run.invoker` to `allUsers`

- `iac/cloudrun/loadbalancer-prod.tf` (108 lines, 7 `google_compute_*` resources):
  1. `google_compute_global_address.nlm_prod_lb_ip` — global IPv4
  2. `google_compute_region_network_endpoint_group.nlm_prod_neg` — `SERVERLESS`, `cloud_run { service = nlm_prod.name }`
  3. `google_compute_backend_service.nlm_prod_backend` — `EXTERNAL_MANAGED`, log_config enabled
  4. `google_compute_url_map.nlm_prod_urlmap` — single catch-all
  5. `google_compute_managed_ssl_certificate.nlm_prod_cert` — `managed.domains = ["nextlevelmock.com", "www.nextlevelmock.com"]`
  6. `google_compute_target_https_proxy.nlm_prod_https_proxy` — URL map + cert
  7. `google_compute_global_forwarding_rule.nlm_prod_https_fwd` — `:443`

### Outputs (extends `outputs.tf`)

- `prod_cloudrun_url` — `*.run.app` URL (null if applied with staging.tfvars)
- `prod_lb_ip` — global static IPv4 consumed by Plan 02 `dns-prod.tf` www record
- `prod_ssl_cert_name` — `"nlm-prod-ssl-cert"`
- `staging_lb_ip` — added here because Plan 02 verify script needs it to assert `staging.nextlevelmock.com` resolves to the staging LB

### Scripts

- `scripts/fetch-latest-staging-digest.sh` — `gh run list --workflow=deploy-staging.yml --status=success --limit 1` → `gh run view --log` → extract `sha256:...` hex; stdout = 64-char hex (no prefix)
- `scripts/promote-staging-digest-to-prod.sh` — `gcloud artifacts docker tags add` cross-registry tag of the staging digest as `us-central1-docker.pkg.dev/nlm-prod/nlm-app/nlm-app:v1.5.0-rc1` (bit-identical image; no rebuild)

Both executable; both pass `bash -n`.

### tfvars + variables

- `prod.tfvars` — added `initial_image_digest` PLACEHOLDER (`sha256:PHASE51_CI_WILL_POPULATE_...`), `cf_zone_id` PLACEHOLDER, `v01_gce_ip` PLACEHOLDER; all block `terraform apply` by design.
- `variables.tf` — added `v01_gce_ip` with `default = ""` so staging.tfvars apply is unaffected.

## Verification Results

| Check | Command | Result |
|-------|---------|--------|
| fmt | `terraform fmt -check` | PASS |
| validate | `terraform validate` | **PASS** — "The configuration is valid." |
| plan (prod.tfvars) | `GOOGLE_OAUTH_ACCESS_TOKEN=... CLOUDFLARE_API_TOKEN=dummy terraform plan -var-file=prod.tfvars` | **17 resources to add** (9 Phase 51 + 8 pre-existing Phase 47/48 deferred). Plan errors on `data.google_secret_manager_secret_version.admin_emails` because ADMIN_EMAILS value not yet populated in nlm-prod Secret Manager — known Phase 46 operator-pending item, not a P51-01 defect. |
| scripts syntax | `bash -n` | PASS on both |
| `ignore_changes` present | `grep 'ignore_changes' cloudrun-prod.tf` | Found on image field |
| `allUsers` invoker | `grep 'allUsers' cloudrun-prod.tf` | Found in `public_invoke_prod` |
| 7 LB resources | `grep -cE '^resource "google_compute' loadbalancer-prod.tf` | 7 |
| SSL covers apex+www | `grep -A4 'managed {' loadbalancer-prod.tf` | Both domains in list |

## Prod Cloud Run URL / LB IP / SSL Cert Status

All three are **not yet provisioned** (terraform apply halted). After operator applies:
- `prod_cloudrun_url` — will resolve to `https://nlm-prod-<hash>-uc.a.run.app`
- `prod_lb_ip` — will be a GCP anycast IPv4 from the global address pool
- `prod_ssl_cert_name` — `"nlm-prod-ssl-cert"` (deterministic); `managed.domainStatus` at T+0 expected: both PROVISIONING; after Plan 02 creates www record expected: www=PROVISIONING→ACTIVE in 10-60min, apex=PENDING until Phase 52 cutover.

## Promoted Image Digest

Not yet populated. Runbook sequence (operator, pre-apply):

```bash
cd iac/cloudrun/scripts
DIGEST=$(./fetch-latest-staging-digest.sh)
./promote-staging-digest-to-prod.sh "$DIGEST"
# Paste $DIGEST into prod.tfvars as initial_image_digest = "sha256:$DIGEST" (keep the sha256: prefix there since that's how staging.tfvars formats it)
```

## Deviations from Plan

### Pattern Alignment

**1. Used `count` + `var.project_id` instead of `var.prod_project_id` / `var.staging_project_id`**
- **Found during:** initial read of cloudrun-staging.tf / variables.tf
- **Plan text said:** `project = var.prod_project_id` and referenced `google_secret_manager_secret.<name>["prod"].secret_id`
- **Actual on-disk pattern:** Staging HCL uses `count = var.env == "staging" ? 1 : 0` + `var.project_id` + `for_each = toset(var.secret_names)` with single-project secret lookup. The module is applied once per env (with separate tfvars + backend prefix), not as a multi-env module.
- **Fix:** Mirrored the actual pattern — `count = var.env == "prod" ? 1 : 0` across all prod resources. `dynamic "env"` uses `for_each = toset(var.secret_names)` and `secret = env.value` (not keyed lookup).
- **Why acceptable:** This was a plan-authoring inference error; actual staging code is authoritative. Produces equivalent behavior — per-env isolated apply.
- **Commit:** 2bdb15e

**2. SSL cert resource name `nlm_prod_cert` (not `nlm_prod_ssl_cert`)**
- **Found during:** cloudrun-staging.tf read
- **Rationale:** Staging uses `nlm_staging_cert` as HCL resource name with `name = "nlm-staging-ssl-cert"` as GCP resource name. Matching this for prod: HCL `nlm_prod_cert`, GCP `nlm-prod-ssl-cert`. Plan 04's `verify-phase-51.sh` checks GCP name `nlm-prod-ssl-cert` which is satisfied.
- **Commit:** 2bdb15e

**3. Added `staging_lb_ip` output as part of Plan 01**
- **Found during:** Plan 02 verify-dns-records.sh script spec
- **Why:** Plan 02's verify script calls `terraform output -raw staging_lb_ip` — this output didn't exist. Added here to unblock Plan 02.
- **Commit:** 2bdb15e

### Out-of-Scope Observation

**Pre-existing issue — ADMIN_EMAILS data source (Phase 46 deferred):** `monitoring.tf` has `data "google_secret_manager_secret_version" "admin_emails"` with `version = "latest"`. Against prod, this fails plan because no secret version exists yet in nlm-prod (Phase 46 secret population is operator-pending). Recorded in `.planning/STATE.md` open blockers — not a Phase 51 item. Logged to `.planning/phases/51-.../deferred-items.md`.

## Operator Checkpoint (HALT)

**Live `terraform apply` NOT executed.** To complete prod provisioning:

1. Complete Phase 46 operator checkpoint (populate ADMIN_EMAILS + other 12 secrets in nlm-prod Secret Manager).
2. Ensure at least one image exists in staging Artifact Registry (requires Phase 47 + 48 CI run).
3. Run:
   ```bash
   cd iac/cloudrun
   DIGEST=$(./scripts/fetch-latest-staging-digest.sh)
   ./scripts/promote-staging-digest-to-prod.sh "$DIGEST"
   # Edit prod.tfvars: set initial_image_digest = "sha256:$DIGEST"
   #                   set cf_zone_id = <real zone id>
   #                   set v01_gce_ip = <real v0.1 GCE LB IP>
   export GOOGLE_OAUTH_ACCESS_TOKEN=$(gcloud auth print-access-token)
   export CLOUDFLARE_API_TOKEN=<zone-scoped token>
   terraform init -reconfigure -backend-config="prefix=cloudrun/prod"
   terraform apply -var-file=prod.tfvars \
     -target=google_cloud_run_v2_service.nlm_prod \
     -target=google_cloud_run_v2_service_iam_member.public_invoke_prod \
     -target=google_compute_global_address.nlm_prod_lb_ip \
     -target=google_compute_region_network_endpoint_group.nlm_prod_neg \
     -target=google_compute_backend_service.nlm_prod_backend \
     -target=google_compute_url_map.nlm_prod_urlmap \
     -target=google_compute_managed_ssl_certificate.nlm_prod_cert \
     -target=google_compute_target_https_proxy.nlm_prod_https_proxy \
     -target=google_compute_global_forwarding_rule.nlm_prod_https_fwd
   curl -sfI "$(terraform output -raw prod_cloudrun_url)/api/health"  # 200 or 503
   ```

## Self-Check: PASSED

- Files created:
  - `iac/cloudrun/cloudrun-prod.tf` — FOUND
  - `iac/cloudrun/loadbalancer-prod.tf` — FOUND
  - `iac/cloudrun/scripts/fetch-latest-staging-digest.sh` — FOUND (executable)
  - `iac/cloudrun/scripts/promote-staging-digest-to-prod.sh` — FOUND (executable)
- Commit `2bdb15e` — FOUND in `git log --oneline`.
- `terraform validate` — PASSED.
