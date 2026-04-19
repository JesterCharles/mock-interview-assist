# Phase 45 — staging env vars. Apply with: terraform apply -var-file=staging.tfvars
project_id = "nlm-staging-493715"
env        = "staging"
region     = "us-central1"

# Phase 47 additions
#
# PLACEHOLDER VALUES — real values populated when prerequisites are met:
#   - initial_image_digest: set once Phase 48 CI pushes the first image. Capture via:
#       gcloud artifacts docker images list us-central1-docker.pkg.dev/nlm-staging-493715/nlm-app/nlm-app \
#         --include-tags --filter='tags:*' --format='value(DIGEST)' --limit=1
#     Phase 45 Plan 02 smoke push was HALTED (see DOCKER-NOTES.md); no image exists yet.
#   - cf_zone_id: looked up once per-operator via:
#       curl -sf -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
#         "https://api.cloudflare.com/client/v4/zones?name=nextlevelmock.com" | jq -r '.result[0].id'
#
# These placeholder values block `terraform apply` intentionally. Operator must overwrite
# with real values before running the Phase 47 apply sequence (see iac/cloudrun/README.md).
# T-47-05 mitigation: digest-only pull; :latest NEVER appears here.
initial_image_digest = "sha256:daa14e711df0da52dd67b3bc652ab746e17754a47649b3d0437f0ac7075978af"

# Cloudflare zone for nextlevelmock.com. One-time lookup (see README Plan 02 runbook).
cf_zone_id = "f0a9741530073e3d64c20b0e8e3ca629"

# D-16 / D-22 — explicit for clarity even though defaults match.
github_repo_slug = "JesterCharles/mock-interview-assist"
domain_name      = "staging.nextlevelmock.com"

# Phase 48 — uptime check target (defaults already correct)
uptime_host_staging = "staging.nextlevelmock.com"
