# Phase 45 — prod env vars. Apply with: terraform apply -var-file=prod.tfvars
project_id = "nlm-prod"
env        = "prod"
region     = "us-central1"

# Phase 48 — uptime check target (defaults already correct)
uptime_host_prod = "nextlevelmock.com"

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
initial_image_digest = "sha256:PHASE51_CI_WILL_POPULATE_000000000000000000000000000000000000"

# Cloudflare zone for nextlevelmock.com (same zone as staging — one-time lookup shared).
cf_zone_id = "PLACEHOLDER_32_HEX_FROM_CLOUDFLARE_ZONE_LOOKUP"

# v0.1 GCE LB IP — source of truth for apex + legacy records (Plan 02).
# Static across v1.5; torn down in Phase 53 SUNSET-03.
v01_gce_ip = "PLACEHOLDER_V01_GCE_IPV4"

# D-16 / D-22 — explicit for clarity even though defaults match.
github_repo_slug = "JesterCharles/mock-interview-assist"
domain_name      = "nextlevelmock.com"
