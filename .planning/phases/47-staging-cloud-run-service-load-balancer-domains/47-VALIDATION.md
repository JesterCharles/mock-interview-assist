---
phase: 47
slug: staging-cloud-run-service-load-balancer-domains
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-18
---

# Phase 47 — Validation Strategy

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Terraform + gcloud + curl + openssl + `gh` CLI |
| **Quick run command** | `cd iac/cloudrun && terraform fmt -check && terraform validate` |
| **Full suite command** | `bash iac/cloudrun/scripts/verify-phase-47.sh` |
| **Estimated runtime** | quick ~5s; full ~5-15 min (cold-start + SSL polling) |

## Sampling Rate

- **Per task commit:** `terraform fmt -check && terraform validate` + `npx tsc --noEmit` for any TS helper
- **Per wave merge:** `terraform plan -var-file=staging.tfvars -detailed-exitcode`
- **Phase gate:** `verify-phase-47.sh` end-to-end

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat | Automated Command |
|---------|------|------|-------------|--------|-------------------|
| 47-01-01 | 01 | 1 | INFRA-04 | T-47-05 | `gcloud run services describe nlm-staging --region=us-central1 --format='value(template.containers[0].image)' \| grep -q '@sha256:'` (digest pull) |
| 47-01-02 | 01 | 1 | INFRA-04 | — | `gcloud run services describe nlm-staging --region=us-central1 --format=json \| jq -r '.template.scaling.minInstanceCount, .template.scaling.maxInstanceCount, .template.containers[0].resources.limits.cpu, .template.containers[0].resources.limits.memory, .template.timeout' \| paste -sd ','` == `0,10,1,512Mi,300s` |
| 47-01-03 | 01 | 1 | INFRA-04 | T-47-07 | `grep -q 'ignore_changes.*template\[0\]\.containers\[0\]\.image' iac/cloudrun/cloudrun-staging.tf` |
| 47-02-01 | 02 | 2 | INFRA-05 | — | `gcloud compute ssl-certificates describe nlm-staging-ssl-cert --format='value(managed.status)'` == `ACTIVE` (after wait) |
| 47-02-02 | 02 | 2 | INFRA-05 | — | `curl -sfI https://staging.nextlevelmock.com/api/health \| head -1 \| grep -q '200'` |
| 47-02-03 | 02 | 2 | INFRA-05 | T-47-06 | `dig +short staging.nextlevelmock.com A` returns the reserved LB IP; `curl -sI https://staging.nextlevelmock.com \| grep -qi 'cf-ray'` **FAILS** (orange-cloud off: no Cloudflare headers) |
| 47-03-01 | 03 | 2 | CI-04 | T-47-02 | `gcloud iam workload-identity-pools describe github-actions --location=global --project=nlm-staging-493715` exits 0 + has attribute_condition containing `attribute.repository == "JesterCharles/mock-interview-assist"` |
| 47-03-02 | 03 | 2 | CI-04 | T-47-03 | `gh workflow run wif-smoke.yml && sleep 30 && gh run list --workflow=wif-smoke.yml --limit 1 --json conclusion -q '.[].conclusion'` == `success` |
| 47-03-03 | 03 | 2 | CI-04 | T-47-05 | `gcloud iam service-accounts keys list --iam-account=github-actions-deployer@nlm-staging-493715.iam.gserviceaccount.com --format='value(keyType)'` shows only `SYSTEM_MANAGED` |
| 47-04-01 | 04 | 3 | INFRA-04 | — | `bash iac/cloudrun/scripts/coldstart-probe-staging.sh` exits 0 with `time_total < 30.0` |
| 47-04-02 | 04 | 3 | INFRA-04 | — | `NEXT_PUBLIC_SITE_URL` secret populated: `gcloud secrets versions access latest --secret=NEXT_PUBLIC_SITE_URL --project=nlm-staging-493715` == `https://staging.nextlevelmock.com` |

## Wave 0 Requirements

- [ ] `iac/cloudrun/cloudrun-staging.tf` — `google_cloud_run_v2_service` with 13-secret mounts + lifecycle ignore_changes
- [ ] `iac/cloudrun/loadbalancer-staging.tf` — global IP + serverless NEG + backend service + URL map + managed SSL + HTTPS proxy + forwarding rule
- [ ] `iac/cloudrun/dns-staging.tf` — cloudflare provider config + `cloudflare_record` staging A proxied=false
- [ ] `iac/cloudrun/wif.tf` — pool + provider + per-SA impersonation binding in both projects
- [ ] `.github/workflows/wif-smoke.yml` — manual-dispatch WIF proof workflow
- [ ] `iac/cloudrun/scripts/coldstart-probe-staging.sh`
- [ ] `iac/cloudrun/scripts/verify-phase-47.sh`
- [ ] `iac/cloudrun/staging.tfvars` extended with `image_digest`, `cloudflare_zone_id`
- [ ] `iac/cloudrun/variables.tf` extended for LB + WIF + Cloudflare vars
- [ ] `iac/cloudrun/providers.tf` extended with `cloudflare/cloudflare ~> 4.0`
- [ ] `iac/cloudrun/README.md` updated with Phase 47 apply + SSL wait + cold-start probe steps

## Manual-Only Verifications

| Behavior | Requirement | Why | Instructions |
|----------|-------------|-----|--------------|
| Managed SSL cert ACTIVE status wait | INFRA-05 | 10-60 min async | Runbook: `watch gcloud compute ssl-certificates describe nlm-staging-ssl-cert --format='value(managed.status)'` until ACTIVE |
| Cloudflare zone_id lookup | INFRA-05 | One-time | `curl -sH "Authorization: Bearer $CLOUDFLARE_API_TOKEN" 'https://api.cloudflare.com/client/v4/zones?name=nextlevelmock.com' \| jq -r '.result[0].id'` → value goes into `staging.tfvars` |
| First cold-start grace | INFRA-04 | If SSL not yet ACTIVE, probe exits advisory | Runbook says "re-run probe after SSL ACTIVE" |

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dep
- [ ] Feedback latency acceptable
- [ ] `nyquist_compliant: true` after Wave 0 lands

**Approval:** pending
