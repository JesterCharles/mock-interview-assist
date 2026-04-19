---
phase: 47-staging-cloud-run-service-load-balancer-domains
plan: 02
subsystem: loadbalancer-dns
one_liner: "Staging HTTPS LB (7 resources) + Cloudflare DNS A record (proxied=false) HCL shipped; terraform apply HALTED (needs CLOUDFLARE_API_TOKEN + real cf_zone_id + real image digest)"
tags: [infra, terraform, load-balancer, ssl, cloudflare, dns, halt]
requires: [47-01]
provides:
  - iac/cloudrun/loadbalancer-staging.tf (7 chained LB resources, count=staging)
  - iac/cloudrun/dns-staging.tf (cloudflare_record.staging v4 syntax, proxied=false)
  - iac/cloudrun/README.md extended with "## Phase 47 apply sequence" runbook
affects:
  - iac/cloudrun: full LB+DNS chain added; terraform validate + plan both green
tech_stack:
  added: []
  patterns:
    - "serverless NEG → backend service → URL map → HTTPS proxy → forwarding rule chain"
    - "managed SSL cert with create_before_destroy (domain swap safety)"
    - "cloudflare_record v4 resource name + `value` arg (NOT v5 cloudflare_dns_record/content)"
key_files:
  created:
    - iac/cloudrun/loadbalancer-staging.tf
    - iac/cloudrun/dns-staging.tf
    - .planning/phases/47-staging-cloud-run-service-load-balancer-domains/47-02-SUMMARY.md
  modified:
    - iac/cloudrun/README.md (appended Phase 47 apply sequence H2 + references)
decisions:
  - "Unattended mode: shipped HCL + terraform fmt + validate + full plan; DID NOT apply. Plan shows 10 resources to add total (2 from P47-01 + 7 LB + 1 Cloudflare)."
  - "Cloudflare provider pinned v4.x per D-21 (v5 breaking renames). Resource name cloudflare_record + `value` arg preserved."
  - "No HTTP→HTTPS redirect on :80 in Phase 47 per plan guidance. Phase 49 hardening may add."
metrics:
  tasks_completed: 2
  tasks_halted: 1
  commits: 2
  duration_minutes: 8
  completed_date: 2026-04-18
---

# Phase 47 Plan 02: Load Balancer + DNS Summary

## What Was Built

Two new HCL files + one README appendix:

1. **`iac/cloudrun/loadbalancer-staging.tf`** — 7 chained LB resources, all `count = var.env == "staging" ? 1 : 0`:
   - `google_compute_global_address.nlm_staging_lb_ip` (EXTERNAL IPV4 anycast)
   - `google_compute_region_network_endpoint_group.nlm_staging_neg` (SERVERLESS → `nlm-staging`)
   - `google_compute_backend_service.nlm_staging_backend` (EXTERNAL_MANAGED, HTTPS, 300s, log sample_rate=1.0)
   - `google_compute_url_map.nlm_staging_urlmap` (catch-all default)
   - `google_compute_managed_ssl_certificate.nlm_staging_cert` (managed, `staging.nextlevelmock.com`, create_before_destroy)
   - `google_compute_target_https_proxy.nlm_staging_https_proxy`
   - `google_compute_global_forwarding_rule.nlm_staging_https_fwd` (port 443)

2. **`iac/cloudrun/dns-staging.tf`** — `cloudflare_record.staging` with `proxied = false` literal. Uses v4 argument `value` (not v5's `content`). Zone from `var.cf_zone_id`, TTL=300.

3. **`iac/cloudrun/README.md`** — Appended "## Phase 47 apply sequence" section with prerequisites, Cloudflare zone lookup (+ Keychain stash), Artifact Registry digest capture, full Wave 1→2→3 apply sequence (both staging + prod for WIF), SSL ACTIVE 40×60s polling loop, PROVISIONING/FAILED_NOT_VISIBLE troubleshooting, NEXT_PUBLIC_SITE_URL pointer to Plan 04.

**Plan/validate evidence:**

```
terraform validate
  Success! The configuration is valid.

terraform plan -var-file=staging.tfvars
  Plan: 10 to add, 0 to change, 0 to destroy.
  # 2 Cloud Run (P47-01) + 7 LB (P47-02 Task 1) + 1 Cloudflare (P47-02 Task 2)
```

## What Was NOT Built (HALT)

**Task 3 live apply + SSL polling + HTTPS smoke — HALTED per unattended mode.**

Apply requires all of:
- `CLOUDFLARE_API_TOKEN` — operator-held (Zone.DNS.Edit on nextlevelmock.com zone, T-47-09)
- Real `cf_zone_id` — one-time lookup via Cloudflare API (staging.tfvars placeholder)
- Real `initial_image_digest` from AR (Phase 48 CI gate — no image pushed yet)
- All 13 Phase 46 secrets populated (operator runbook gate)

Unattended rules forbid destructive or external-API calls against Cloudflare. Creating the DNS A record IS a live mutation, so HALTED.

## Verification

```
$ test -f iac/cloudrun/loadbalancer-staging.tf && echo FOUND
FOUND
$ test -f iac/cloudrun/dns-staging.tf && echo FOUND
FOUND
$ grep -c 'count = var.env == "staging" ? 1 : 0' iac/cloudrun/loadbalancer-staging.tf
7
$ grep -c 'load_balancing_scheme = "EXTERNAL_MANAGED"' iac/cloudrun/loadbalancer-staging.tf
2  # backend service + forwarding rule
$ ! grep balancing_mode iac/cloudrun/loadbalancer-staging.tf  # Pitfall: invalid on SERVERLESS NEG
# exit 0
$ grep -q 'proxied = false' iac/cloudrun/dns-staging.tf && echo "T-47-06 OK"
T-47-06 OK
$ ! grep 'proxied = true' iac/cloudrun/dns-staging.tf
# exit 0
$ ! grep cloudflare_dns_record iac/cloudrun/dns-staging.tf  # would be v5
# exit 0
$ grep -q "^## Phase 47 apply sequence" iac/cloudrun/README.md && echo RUNBOOK
RUNBOOK
```

## Deviations from Plan

### HALT (Unattended Mode)

**HALT: needs operator** — Task 3 apply sequence (LB+DNS+SSL poll+HTTPS smoke).

- **Trigger:** Live Cloudflare mutation + waiting on SSL cert provisioning (10-60 min async).
- **Action taken:** Full Terraform plan validated directionally. Runbook documents the operator-run apply steps in detail (README "Phase 47 apply sequence").

### Auto-fixes

None.

## Commits

| Task | Subject | Hash |
|------|---------|------|
| 1+2 | feat(47-02): add staging HTTPS LB + managed SSL + Cloudflare DNS HCL (INFRA-05) | `0d791ac` |
| 3 | docs(47-02): document Phase 47 apply sequence + SSL poll + Cloudflare zone lookup runbook | `c1e16a8` |

## Self-Check: PASSED

- Files:
  - FOUND: iac/cloudrun/loadbalancer-staging.tf (7 resources, count-gated)
  - FOUND: iac/cloudrun/dns-staging.tf (cloudflare_record v4)
  - FOUND: iac/cloudrun/README.md (Phase 47 apply sequence section present)
- Commits: 0d791ac, c1e16a8 present.
- `terraform validate` exit 0.
- `terraform plan -var-file=staging.tfvars` shows 10 to add, 0 changed, 0 destroyed (full chain).
- HALT documented with operator gates.
