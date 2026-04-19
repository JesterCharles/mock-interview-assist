---
phase: 51-prod-cloud-run-deploy-prod-pipeline-dns-records
plan: 02
subsystem: dns
tags: [cloudflare, dns, terraform, import, prod, unattended-halt-pre-apply]
dependency-graph:
  requires: [51-01 prod_lb_ip output, 47 Cloudflare provider, existing apex A record on nextlevelmock.com]
  provides: [iac/cloudrun/dns-prod.tf (3 cloudflare_record), import-cloudflare-apex.sh, verify-dns-records.sh]
  affects: [51-04 verify-phase-51.sh (MH7/MH8/MH9), 52-01 apex flip (change cloudflare_record.apex.value from var.v01_gce_ip -> google_compute_global_address.nlm_prod_lb_ip[0].address)]
tech-stack:
  added: []
  patterns: [Cloudflare provider v4 (cloudflare_record), terraform import against count-indexed resource address, dig @1.1.1.1 with retry loop, Cloudflare API apex value probe]
key-files:
  created:
    - iac/cloudrun/dns-prod.tf
    - iac/cloudrun/scripts/import-cloudflare-apex.sh
    - iac/cloudrun/scripts/verify-dns-records.sh
  modified: []
decisions:
  - Used `terraform import 'cloudflare_record.apex[0]'` (count-indexed address) since apex resource is count-gated on env.
  - verify-dns-records.sh uses Cloudflare API to check apex `content` — proxied apex returns CF edge IPs via dig, not origin, so dig alone can't validate the negative assertion.
  - Exit code 2 (not 1) on T-51-01 trip — distinguishes "apex flipped early" from other failures; Phase 04 verify-phase-51.sh can surface it distinctly.
  - DNS propagation retry: 3 × 60s per www/legacy — Cloudflare anycast usually converges in <5 min but tolerate first-run flakes.
metrics:
  duration: "~5 min wall (write + fmt + validate + commit)"
  completed: "2026-04-18"
---

# Phase 51 Plan 02: Prod DNS Records + Cloudflare Apex Import Summary

Provisioned HCL + 2 helper scripts for the 4-record D-01 matrix at Cloudflare so Phase 52's cutover becomes a single-resource value update. Live `terraform apply` + `terraform import` halted per unattended rules — Cloudflare apex import + live mutations require operator with real `CLOUDFLARE_API_TOKEN` + real `v01_gce_ip` + real `cf_zone_id`.

## What Shipped

### HCL

- `iac/cloudrun/dns-prod.tf` (53 lines) — 3 `cloudflare_record` resources, count-gated on `env="prod"`:
  1. `cloudflare_record.apex` — `name="@"`, `type=A`, `value=var.v01_gce_ip`, `proxied=true`, `ttl=1` (Auto), comment documents T-51-01 assertion
  2. `cloudflare_record.www` — `name="www"`, `type=A`, `value=google_compute_global_address.nlm_prod_lb_ip[0].address`, `proxied=false`, `ttl=300`
  3. `cloudflare_record.legacy` — `name="legacy"`, `type=A`, `value=var.v01_gce_ip`, `proxied=false`, `ttl=300`
- Staging record unchanged (stays in `dns-staging.tf`) — zero drift in staging state.

### Scripts

- `scripts/import-cloudflare-apex.sh` (58 lines):
  - Reads `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ZONE_ID` env vars
  - GETs `/client/v4/zones/<id>/dns_records?type=A&name=nextlevelmock.com` → extracts `.result[0].id`
  - Runs `terraform import -var-file=prod.tfvars 'cloudflare_record.apex[0]' <zone>/<record>`
  - Treats "already managed" as harmless (exits 0 if resource is in state post-attempt)
  - Uses count-indexed address `[0]` because apex is count-gated

- `scripts/verify-dns-records.sh` (97 lines):
  - Reads `v01_gce_ip` from `prod.tfvars` + `prod_lb_ip`/`staging_lb_ip` from `terraform output`
  - **Record 1 (apex, T-51-01):** Queries Cloudflare API directly for `.result[0].content` — asserts it equals `v01_gce_ip` (and does NOT equal `prod_lb_ip`). Exit 2 on trip-wire, exit 1 on other failures.
  - **Record 2 (www):** `dig +short A www.nextlevelmock.com @1.1.1.1` == `prod_lb_ip` with up-to-3-retry × 60s for propagation lag
  - **Record 3 (legacy):** Same pattern, expects `v01_gce_ip`
  - **Record 4 (staging):** Cross-checks against Phase 47's `staging_lb_ip` output; warns if output unavailable

Both executable; both pass `bash -n`.

## Verification Results

| Check | Command | Result |
|-------|---------|--------|
| fmt | `terraform fmt -check dns-prod.tf variables.tf` | PASS |
| validate | `terraform validate` | PASS |
| plan diff | `terraform plan -var-file=prod.tfvars` | **+3 cloudflare_record resources now in diff** (apex, www, legacy, all count=1). Plan shows 20 total resources to add (9 from Plan 01 + 3 DNS + 8 pre-existing P47/48 items). Pre-existing ADMIN_EMAILS data-source error remains (Phase 46 deferred). |
| 3 cloudflare_record | `grep -cE 'resource "cloudflare_record"' dns-prod.tf` | 3 |
| www → nlm_prod_lb_ip | `grep 'nlm_prod_lb_ip\[0\].address' dns-prod.tf` | FOUND |
| apex → v01_gce_ip | apex resource block references `var.v01_gce_ip` | FOUND |
| v01_gce_ip in variables | `grep 'v01_gce_ip' variables.tf` | FOUND (from Plan 01) |
| Scripts syntax | `bash -n` on both | PASS |

Provider deprecation observed: `cloudflare/cloudflare v4.52.7` warns `value is deprecated in favour of content` — v5 migration deferred per Phase 47 D-21.

## v01_gce_ip / prod_lb_ip / Cloudflare Zone

All three are PLACEHOLDERS at commit time. Real values populated by operator at apply:

| Var | Source | Current prod.tfvars value |
|-----|--------|-----|
| `v01_gce_ip` | `dig +short nextlevelmock.com @1.1.1.1` (or Cloudflare API apex `content` if proxied) | `"PLACEHOLDER_V01_GCE_IPV4"` |
| `prod_lb_ip` (from `terraform output`) | Plan 01 applies | Not yet provisioned |
| `cf_zone_id` | `curl .../zones?name=nextlevelmock.com \| jq -r '.result[0].id'` | `"PLACEHOLDER_32_HEX_FROM_CLOUDFLARE_ZONE_LOOKUP"` |

## SSL Cert `managed.domainStatus` (expected post-apply)

Cannot check live — cert not yet provisioned. After operator applies Plan 01 + Plan 02 sequentially:
- `www.nextlevelmock.com` → `PROVISIONING` → `ACTIVE` in 10-60 min (HTTP-01 passes via new www A record pointing at LB IP)
- `nextlevelmock.com` → `PROVISIONING` remains (HTTP-01 cannot pass because apex still points at v0.1 GCE per T-51-01) → flips to `ACTIVE` within 10-60 min after Phase 52 cutover

Plan 04 DEPLOY.md preflight codifies the poll-until-ACTIVE step.

## verify-dns-records.sh Output

**Not executed** — requires live Cloudflare state. After apply, expected stdout (success path):

```
OK:   apex Cloudflare record value = <v01_ip> (v0.1 GCE) — NOT flipped to prod (T-51-01 asserted)
OK:   www.nextlevelmock.com → <prod_lb_ip> (prod Cloud Run LB)
OK:   legacy.nextlevelmock.com → <v01_ip> (v0.1 GCE — 30-day rollback record)
OK:   staging.nextlevelmock.com → <staging_lb_ip> (Phase 47)

All 4 Phase 51 DNS records verified.
```

## Manual-Fallback Notes for `terraform import cloudflare_record.apex`

If live import fails (T-51-05): the script handles "already managed" as harmless via post-import `terraform state show`. Hard-failure fallback documented in Plan 04 DEPLOY.md Section 5.3 — operator can bypass TF for the apex and use a direct Cloudflare API PATCH in Phase 52 while leaving `www`+`legacy` under TF management. Both `www` and `legacy` are new resources (no import needed; plain `terraform apply` creates them).

## Deviations from Plan

### Pattern Alignment

**1. Used count-indexed import address `'cloudflare_record.apex[0]'`**
- **Plan text said:** `terraform import cloudflare_record.apex <zone>/<record>`
- **Actual:** Apex resource is count-gated (`count = var.env == "prod" ? 1 : 0`) to keep staging apply unaffected. Terraform requires `[0]` suffix when importing into count=1 resources.
- **Commit:** 658236d

**2. No `env` variable block added to variables.tf in this plan**
- **Plan text said:** "Step 1 — Add variable to variables.tf" (the v01_gce_ip)
- **Actual:** v01_gce_ip variable was added in Plan 01 (with `default = ""`) because Plan 01 already touched variables.tf for the prod gate. Double-adding would be a no-op at best and a merge conflict at worst.
- **Commit:** 2bdb15e (Plan 01)

**3. `v01_gce_ip` default = `""`**
- **Rationale:** Plan requires it as a required variable. But variables.tf is shared between staging + prod applies, and staging.tfvars does not need it. Using `default = ""` (plus the verify script rejecting the empty / placeholder string) keeps staging apply green while still requiring a real value for prod apply — matching the pattern from `initial_image_digest` (no default, forcing tfvars). Trade-off: plan would not catch a missing value at plan time; verify-dns-records.sh catches it at verify time.
- **Commit:** 2bdb15e

## Operator Checkpoint (HALT)

**Live `terraform import` + `terraform apply` + `verify-dns-records.sh` NOT executed.** Full sequence for operator:

```bash
cd iac/cloudrun
# 1. Fill placeholders in prod.tfvars: v01_gce_ip, cf_zone_id (see Plan 01 SUMMARY)
# 2. Export CLOUDFLARE_API_TOKEN (Zone.DNS.Edit on nextlevelmock.com) + CLOUDFLARE_ZONE_ID
# 3. terraform init (already done for staging; re-init with prod prefix):
terraform init -reconfigure -backend-config="prefix=cloudrun/prod"
# 4. Import the existing apex:
./scripts/import-cloudflare-apex.sh
# 5. Plan — expect +2 resources (www, legacy), 0 changes to apex:
terraform plan -var-file=prod.tfvars
# 6. Apply only the DNS records (scoped):
terraform apply -var-file=prod.tfvars \
  -target='cloudflare_record.apex[0]' \
  -target='cloudflare_record.www[0]' \
  -target='cloudflare_record.legacy[0]'
# 7. Verify:
./scripts/verify-dns-records.sh
```

## Self-Check: PASSED

- Files created:
  - `iac/cloudrun/dns-prod.tf` — FOUND
  - `iac/cloudrun/scripts/import-cloudflare-apex.sh` — FOUND (executable)
  - `iac/cloudrun/scripts/verify-dns-records.sh` — FOUND (executable)
- Commit `658236d` — FOUND in `git log --oneline`.
- `terraform validate` — PASSED.
- `terraform plan -var-file=prod.tfvars` includes 3 cloudflare_record resources.
