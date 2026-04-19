# Phase 45 — prod env vars. Apply with: terraform apply -var-file=prod.tfvars
project_id = "nlm-prod"
env        = "prod"
region     = "us-central1"

# Phase 48 / F-UPTIME-02 — uptime check target.
# Phase 52 cutover flips this back to "nextlevelmock.com" (apex). Until then,
# apex still points at v0.1 GCE which never had /api/health, so the uptime
# check hits Cloud Run directly to reflect real app health.
# On cutover day: set this back to "nextlevelmock.com" and
#   terraform apply -var-file=prod.tfvars -target=google_monitoring_uptime_check_config.health
uptime_host_prod = "nlm-prod-609812564722.us-central1.run.app"

# Phase 51 additions (Plan 01 + Plan 02)
#
# PLACEHOLDER VALUES — operator must overwrite before `terraform apply`:
#
#   - initial_image_digest: the staging-validated digest to seed prod with.
#       Run: cd iac/cloudrun/scripts && ./fetch-latest-staging-digest.sh
#       Then: ./promote-staging-digest-to-prod.sh <digest-hex>
#       Paste the 64-char hex (NO `sha256:` prefix) below.
#
#   - cf_zone_id: Cloudflare zone ID for nextlevelmock.com.
#       Run: curl -sf -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
#              "https://api.cloudflare.com/client/v4/zones?name=nextlevelmock.com" | jq -r '.result[0].id'
#
#   - v01_gce_ip: existing public A-record IP for nextlevelmock.com on v0.1 GCE.
#       Run: dig +short nextlevelmock.com @1.1.1.1 | head -1
#       (If apex is orange-clouded, the dig returns a Cloudflare edge IP — instead fetch the
#       underlying `content` from Cloudflare API: see scripts/import-cloudflare-apex.sh)
#
# T-47-05 / T-51-03 mitigations: digest-only pull; :latest NEVER appears here.
initial_image_digest = "sha256:410461990f9793973098cdd08fb7e4ff403e3120e996a6451297c50a06647f0a"

# Cloudflare zone for nextlevelmock.com (same zone as staging — one-time lookup shared).
cf_zone_id = "f0a9741530073e3d64c20b0e8e3ca629"

# v0.1 GCE LB IP — source of truth for apex + legacy records (Plan 02).
# Static across v1.5; torn down in Phase 53 SUNSET-03.
#
# Phase 52 Plan 02 cutover note (2026-04-18):
#   The apex flip is a HCL edit (dns-prod.tf line 26), NOT a tfvars value swap.
#   Per .planning/DEPLOY.md Section 3.1:
#     -  value = var.v01_gce_ip
#     +  value = google_compute_global_address.nlm_prod_lb_ip[0].address
#   The legacy record keeps `value = var.v01_gce_ip` (SUNSET-02 30-day warm).
#   This variable stays populated with the v0.1 IP through Phase 52 + Phase 53
#   day-45 decommission (scripts/kill-switch.sh revert reads it for rollback).
v01_gce_ip = "34.54.138.253"

# D-16 / D-22 — explicit for clarity even though defaults match.
github_repo_slug = "JesterCharles/mock-interview-assist"
domain_name      = "nextlevelmock.com"
