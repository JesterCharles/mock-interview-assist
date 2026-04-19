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

## Phase 47 apply sequence

v1.5 Phase 47 provisions: staging Cloud Run service, HTTPS LB, managed SSL cert, Cloudflare DNS, WIF pool+provider in both projects, SA IAM bindings.

### Prerequisites
- Phase 45 applied (Artifact Registry + 13 secret shells + 2 SAs in both projects)
- Phase 46 applied (all 13 secrets populated with real values in both projects)
- First image pushed to `us-central1-docker.pkg.dev/nlm-staging-493715/nlm-app/nlm-app` (Phase 45-02 Docker smoke HALTED — Phase 48 CI is the first path that pushes a real image)
- `CLOUDFLARE_API_TOKEN` exported in shell (scope: Zone.DNS.Edit on `nextlevelmock.com`; token is never stored in Secret Manager per D-21 / T-47-09)
- `staging.tfvars` has real values for `initial_image_digest` (from Artifact Registry after Phase 48 CI push) and `cf_zone_id` (Cloudflare zone ID from one-time lookup below)

### One-time Cloudflare zone lookup
```bash
export CLOUDFLARE_API_TOKEN='<token-with-Zone.Read+Zone.DNS.Edit-on-nextlevelmock.com>'
curl -sf -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/zones?name=nextlevelmock.com" \
  | jq -r '.result[0].id'
# Paste the 32-char hex output into staging.tfvars: cf_zone_id = "..."
```

**Recommended:** stash the token in macOS Keychain so it's never in shell history:
```bash
security add-generic-password -a "$USER" -s "CLOUDFLARE_API_TOKEN_NLM" -w '<token>'
# Retrieve later:
export CLOUDFLARE_API_TOKEN=$(security find-generic-password -a "$USER" -s CLOUDFLARE_API_TOKEN_NLM -w)
```

### Artifact Registry digest capture
```bash
# After Phase 48 CI pushes the first real image:
gcloud artifacts docker images list us-central1-docker.pkg.dev/nlm-staging-493715/nlm-app/nlm-app \
  --include-tags --filter='tags:*' --format='value(DIGEST)' --limit=1
# Paste into staging.tfvars: initial_image_digest = "sha256:<64-hex>"
```

### Apply sequence (Wave 1 → 2 → 3)
```bash
cd iac/cloudrun
terraform init -reconfigure -backend-config="prefix=cloudrun/staging"

# Wave 1 — Cloud Run service (Plan 01)
terraform apply -var-file=staging.tfvars \
  -target=google_cloud_run_v2_service.nlm_staging \
  -target=google_cloud_run_v2_service_iam_member.public_invoke

# Wave 2 — LB + DNS (Plan 02) and WIF (Plan 03) — can run in any order; no shared resources
terraform apply -var-file=staging.tfvars \
  -target=google_compute_global_address.nlm_staging_lb_ip \
  -target=google_compute_region_network_endpoint_group.nlm_staging_neg \
  -target=google_compute_backend_service.nlm_staging_backend \
  -target=google_compute_url_map.nlm_staging_urlmap \
  -target=google_compute_managed_ssl_certificate.nlm_staging_cert \
  -target=google_compute_target_https_proxy.nlm_staging_https_proxy \
  -target=google_compute_global_forwarding_rule.nlm_staging_https_fwd \
  -target=cloudflare_record.staging

# Plan 03 WIF bindings (also Wave 2) — see 47-03-PLAN.md for full sequence including prod project.
terraform apply -var-file=staging.tfvars \
  -target=google_iam_workload_identity_pool.github \
  -target=google_iam_workload_identity_pool_provider.github \
  -target=google_service_account_iam_member.wif_impersonation \
  -target=google_project_iam_member.ghactions_artifactregistry_writer \
  -target=google_project_iam_member.ghactions_run_admin \
  -target=google_service_account_iam_member.ghactions_act_as_cloudrun_sa

# Same WIF bindings against nlm-prod (D-14 — one-time per project)
terraform init -reconfigure -backend-config="prefix=cloudrun/prod"
terraform apply -var-file=prod.tfvars \
  -target=google_iam_workload_identity_pool.github \
  -target=google_iam_workload_identity_pool_provider.github \
  -target=google_service_account_iam_member.wif_impersonation \
  -target=google_project_iam_member.ghactions_artifactregistry_writer \
  -target=google_project_iam_member.ghactions_run_admin \
  -target=google_service_account_iam_member.ghactions_act_as_cloudrun_sa
```

### Post-apply — wait for managed SSL cert (Pitfall 1)
```bash
# Async 10-60 min. Poll until ACTIVE.
for i in {1..40}; do
  S=$(gcloud compute ssl-certificates describe nlm-staging-ssl-cert \
      --project=nlm-staging-493715 --format='value(managed.status)')
  echo "[$i] cert=$S"; [[ "$S" == "ACTIVE" ]] && break; sleep 60
done
```

If status stays `PROVISIONING` past 60 min, or flips to `FAILED_NOT_VISIBLE`:
1. Verify `dig +short staging.nextlevelmock.com A` matches `gcloud compute addresses describe nlm-staging-lb-ip --global --format='value(address)'`
2. Verify Cloudflare dashboard shows the record with cloud icon GRAY (proxied OFF) — orange cloud on is the #1 cause (Pitfall 5)
3. If still stuck past 24h, Google declares failure; delete + recreate the cert resource via `terraform taint google_compute_managed_ssl_certificate.nlm_staging_cert[0] && terraform apply`

### Post-apply — NEXT_PUBLIC_SITE_URL secret (D-07)
Plan 04 runbook step populates the `NEXT_PUBLIC_SITE_URL` secret value (added out-of-band, not via TF per D-10).

### Plan 04 — NEXT_PUBLIC_SITE_URL secret + cold-start probe

After Plans 01/02/03 are applied and SSL cert is ACTIVE, run Plan 04 steps:

#### 1. Populate NEXT_PUBLIC_SITE_URL (D-07)
```bash
echo -n 'https://staging.nextlevelmock.com' | gcloud secrets versions add NEXT_PUBLIC_SITE_URL \
  --project=nlm-staging-493715 --data-file=-

# Force Cloud Run to re-read the secret (mounted secrets DO NOT auto-refresh between revisions).
gcloud run services update nlm-staging \
  --region=us-central1 --project=nlm-staging-493715 \
  --update-secrets=NEXT_PUBLIC_SITE_URL=NEXT_PUBLIC_SITE_URL:latest \
  --quiet
```

#### 2. Run cold-start probe (INFRA-04 success criterion 4)
```bash
# Takes ~5-10 min due to sleep-to-zero.
bash iac/cloudrun/scripts/coldstart-probe-staging.sh
# Expected: PASS cold start <TIME>s < 30.0s ceiling.
# If output begins with "ADVISORY: SSL cert status is PROVISIONING", re-run after SSL flips to ACTIVE (Pitfall 7).
```

#### 3. Run the phase gate
```bash
bash iac/cloudrun/scripts/verify-phase-47.sh
# Expected final line: All Phase 47 assertions PASSED.
```

### Rotation notes (T-47-10)
Re-running `gcloud secrets versions add` creates a new version but does NOT propagate to Cloud Run automatically. After any secret rotation, re-run `gcloud run services update --update-secrets=<SECRET>=<SECRET>:latest` to force a new revision that re-reads the secret.

## References

- `.planning/phases/45-terraform-skeleton-artifact-registry-secret-manager/45-CONTEXT.md` — locked decisions
- `.planning/phases/45-terraform-skeleton-artifact-registry-secret-manager/45-RESEARCH.md` — HCL patterns + pitfalls
- `.planning/phases/45-terraform-skeleton-artifact-registry-secret-manager/45-VALIDATION.md` — test map
- `.planning/phases/47-staging-cloud-run-service-load-balancer-domains/47-CONTEXT.md` — Phase 47 locked decisions
- `.planning/phases/47-staging-cloud-run-service-load-balancer-domains/47-RESEARCH.md` — Phase 47 patterns + pitfalls
- `.planning/phases/47-staging-cloud-run-service-load-balancer-domains/47-VALIDATION.md` — Phase 47 test map
- `.planning/REQUIREMENTS.md` §INFRA, §CI — milestone requirements

## Phase 48 — Observability + CI/CD

Apply order:

1. Apply monitoring to staging:
   ```bash
   terraform apply -var-file=staging.tfvars \
     -target=google_monitoring_dashboard.nlm_production \
     -target=google_monitoring_notification_channel.email \
     -target=google_monitoring_uptime_check_config.health \
     -target=google_monitoring_alert_policy.uptime
   ```
2. Apply monitoring to prod:
   ```bash
   terraform apply -var-file=prod.tfvars \
     -target=google_monitoring_dashboard.nlm_production \
     -target=google_monitoring_notification_channel.email \
     -target=google_monitoring_uptime_check_config.health \
     -target=google_monitoring_alert_policy.uptime
   ```
3. **One-time**: verify the email notification channel by clicking the link Google Cloud Monitoring sends to `jestercharles@gmail.com`. The channel will not fire alerts until verified.
4. Verify the gate:
   ```bash
   iac/cloudrun/scripts/verify-phase-48.sh
   ```

Runbooks:
- `.github/RUNBOOK-BRANCH-PROTECTION.md` — one-time branch-protection setup after first pr-checks.yml run
- `.github/RUNBOOK-WORKFLOW-VARS.md` — one-time STAGING_PROJECT_NUMBER / PROD_PROJECT_NUMBER repo variable setup
