---
phase: 45
slug: terraform-skeleton-artifact-registry-secret-manager
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-18
---

# Phase 45 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Terraform native (`terraform validate`, `terraform plan`, `terraform fmt`) + gcloud CLI assertions. No vitest — infra provisioning, not app code. |
| **Config file** | `iac/cloudrun/providers.tf` (after Wave 1) |
| **Quick run command** | `cd iac/cloudrun && terraform fmt -check && terraform validate` (offline, <5s) |
| **Full suite command** | `cd iac/cloudrun && bash scripts/verify-phase-45.sh` (runs per-env plan + gcloud assertions) |
| **Estimated runtime** | quick: ~5s; full: ~60-120s (network-bound on GCP API calls) |

---

## Sampling Rate

- **After every task commit:** Run `terraform fmt -check && terraform validate` (offline)
- **After every plan wave:** Run `terraform plan -var-file=staging.tfvars -detailed-exitcode` (exit 0 or 2, 1 = error)
- **Before `/gsd-verify-work`:** Full `verify-phase-45.sh` against both projects must be green
- **Max feedback latency:** 5s for quick, 120s for full

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 45-01-01 | 01 | 1 | INFRA-06 | T-45-06 (state wipe) | `prevent_destroy = true`, versioning on, uniform access | smoke | `gsutil versioning get gs://nlm-tfstate \| grep Enabled && gsutil uniformbucketlevelaccess get gs://nlm-tfstate \| grep Enabled` | ❌ W0 | ⬜ pending |
| 45-01-02 | 01 | 1 | INFRA-01 | T-45-01 (TF drift) | providers/variables/backend skeleton | unit | `terraform fmt -check && terraform validate` | ❌ W0 | ⬜ pending |
| 45-01-03 | 01 | 1 | INFRA-01 | T-45-01 | `google_project_service` for 11 APIs; `disable_on_destroy=false` | integration | `terraform plan -var-file=staging.tfvars -detailed-exitcode` exits 0 or 2 | ❌ W0 | ⬜ pending |
| 45-02-01 | 02 | 2 | INFRA-02 | T-45-02 (image tamper) | Registry `nlm-app` DOCKER us-central1 in both projects | smoke | `gcloud artifacts repositories describe nlm-app --location=us-central1 --project=nlm-staging-493715` exits 0; same for `nlm-prod` | ❌ W0 | ⬜ pending |
| 45-02-02 | 02 | 2 | INFRA-02 | T-45-02 | Smoke image pushed to staging by digest | smoke | `gcloud artifacts docker images list us-central1-docker.pkg.dev/nlm-staging-493715/nlm-app/nlm-app --include-tags \| grep phase45-smoke` | ❌ W0 | ⬜ pending |
| 45-03-01 | 03 | 2 | INFRA-03 | T-45-03 (secret leak) | All 13 secret shells in both projects, no values in tfstate | smoke | `gcloud secrets list --project=nlm-staging-493715 --format='value(name)' \| wc -l` ≥ 13; same for `nlm-prod`; diff against expected list | ❌ W0 | ⬜ pending |
| 45-03-02 | 03 | 2 | INFRA-03 | T-45-04 (over-priv SA) | `nlm-cloudrun-sa` has per-secret `secretAccessor` (not project-level) | smoke | `gcloud secrets get-iam-policy DATABASE_URL --project=nlm-staging-493715 --format=json \| jq '.bindings[] \| select(.role=="roles/secretmanager.secretAccessor")'` shows sa member | ❌ W0 | ⬜ pending |
| 45-03-03 | 03 | 2 | INFRA-03 | T-45-05 (SA key leak) | Service accounts exist; NO JSON keys created | smoke | `gcloud iam service-accounts describe nlm-cloudrun-sa@nlm-staging-493715.iam.gserviceaccount.com` exits 0; `gcloud iam service-accounts keys list --iam-account=<email>` shows only the default system-managed key | ❌ W0 | ⬜ pending |
| 45-04-01 | 04 | 3 | INFRA-07 | T-45-07 (image runtime) | `docker build` succeeds with unchanged Dockerfile | unit | `docker build -t nlm-app:test .` exits 0 | ❌ W0 | ⬜ pending |
| 45-04-02 | 04 | 3 | INFRA-07 | — | Container boots and serves (per relaxed smoke per Pitfall 4) | smoke | `docker run -d --name nlm-smoke --env-file dummy.env -p 3000:3000 nlm-app:test && sleep 8 && curl -sf -o /dev/null -w '%{http_code}' http://localhost:3000/api/health \| grep -E '200\|503'` (either = container booted; 500/connection-refused = real failure) | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `iac/cloudrun/providers.tf` — Google provider `~> 7.0`, backend `gcs` stub
- [ ] `iac/cloudrun/variables.tf` — `project_id`, `region`, `env`, secret-name list, API list, SA list
- [ ] `iac/cloudrun/staging.tfvars` + `iac/cloudrun/prod.tfvars` — per-env values
- [ ] `iac/cloudrun/apis.tf` — `google_project_service` for 11 APIs (dropping `cloudbuild` per research Q2)
- [ ] `iac/cloudrun/state.tf` — doc-only comment stub explaining manual bootstrap + optional import
- [ ] `iac/cloudrun/registry.tf` — `google_artifact_registry_repository` (`nlm-app`, DOCKER, us-central1)
- [ ] `iac/cloudrun/secrets.tf` — `google_secret_manager_secret` × 13 via `for_each`
- [ ] `iac/cloudrun/iam.tf` — 2 SAs + per-secret `secretAccessor` via `for_each` on the secret set
- [ ] `iac/cloudrun/outputs.tf` — artifact_registry_repository_id, cloudrun_service_account_email, secret_ids
- [ ] `iac/cloudrun/README.md` — bootstrap sequence, apply/plan invocations, smoke verification
- [ ] `iac/cloudrun/scripts/verify-phase-45.sh` — full assertion runner
- [ ] `iac/cloudrun/scripts/bootstrap-state-bucket.sh` — one-time `gsutil mb` + versioning + uniform access for `nlm-tfstate` in `nlm-prod`
- [ ] `iac/cloudrun/scripts/enable-seed-apis.sh` — per-project `gcloud services enable serviceusage.googleapis.com cloudresourcemanager.googleapis.com`
- [ ] `iac/cloudrun/dummy.env.example` — template for INFRA-07 smoke test (gitignored `dummy.env`)
- [ ] Preflight framework install: `brew upgrade terraform` (CLI ≥ 1.6 required by provider v7)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Secret values populated out-of-band | INFRA-03 | Human-entered via `gcloud secrets versions add` — values never enter tfstate | After first TF apply: `for s in DATABASE_URL SUPABASE_SECRET_KEY OPENAI_API_KEY RESEND_API_KEY ...; do echo -n "value" \| gcloud secrets versions add $s --data-file=- --project=nlm-staging-493715; done`. Verify `gcloud secrets versions access latest --secret=DATABASE_URL` returns expected string. **Do NOT commit values.** |
| GCP auth / ADC | INFRA-01 | `gcloud auth application-default login` required once per dev machine; cannot be scripted in CI without WIF (Phase 48) | Dev: `gcloud auth application-default login`. CI: deferred to Phase 48 (WIF). |
| `/api/health` semantics | INFRA-07 | Route pings live Prisma + Judge0; 200 requires real external services. Relaxed per Pitfall 4 research — smoke treats 503 as acceptable. | Human verifies docker-compose local path separately if needed. |
| Billing link sanity | — | UI-only check in GCP console | `gcloud billing projects describe nlm-staging-493715` shows billing enabled; same for `nlm-prod`. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter after Wave 0 lands

**Approval:** pending
