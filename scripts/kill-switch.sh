#!/usr/bin/env bash
# scripts/kill-switch.sh — Fast DNS cutover / rollback for nextlevelmock.com apex.
#
# Phase 52 Plan 03 deliverable (SUNSET-04). Bypasses terraform state round-trip
# (~30s+) in favor of a direct Cloudflare API PATCH (~2s). The faster path
# matters when a production incident is in progress and every second counts.
#
# Usage:
#   scripts/kill-switch.sh status     # Print current apex A record value + proxied/ttl.
#   scripts/kill-switch.sh revert     # Flip apex A to V01_GCE_IP (emergency rollback to v0.1).
#   scripts/kill-switch.sh restore    # Flip apex A to PROD_CLOUDRUN_LB_IP (forward to prod Cloud Run).
#
# Required environment (all four MUST be set before invocation):
#   CLOUDFLARE_API_TOKEN      Zone.DNS:Edit token (same token used by Phase 47/51 terraform).
#   CLOUDFLARE_ZONE_ID        Zone ID for nextlevelmock.com (from CF dashboard Overview).
#   V01_GCE_IP                Static public IPv4 of v0.1 GCE LB (from iac/cloudrun/prod.tfvars).
#   PROD_CLOUDRUN_LB_IP       `gcloud compute addresses describe nlm-prod-lb-ip --global --project=nlm-prod --format='value(address)'`
#
# Side effects:
#   - Mutates the Cloudflare apex A record `content` field via PATCH.
#   - Preserves proxied=true (orange-cloud ON) across both revert + restore.
#   - Does NOT touch terraform state. Operator MUST run
#       `terraform -chdir=iac/cloudrun refresh -var-file=prod.tfvars`
#     after any revert/restore to reconcile iac/cloudrun with Cloudflare reality.
#
# Related:
#   - Phase 52 Plan 02 performed the initial cutover via `terraform apply -target=cloudflare_record.apex[0]`.
#   - Phase 52 Plan 03 rehearses this script at T+30min then restores prod as end state (T-52-05).
#   - .planning/DEPLOY.md §Sunset Window references this script as the canonical SUNSET-04 kill switch.
#   - Phase 53 decommission tears down the v0.1 GCE stack; after that, `revert` becomes inoperative
#     (V01_GCE_IP no longer backed by a running LB) and operators must use Cloud Run traffic rollback
#     via .github/workflows/rollback-prod.yml instead.

set -euo pipefail

CF_API="https://api.cloudflare.com/client/v4"
APEX_NAME="nextlevelmock.com"

# Guard envs are checked inside each subcommand (not at top-level) so
# `kill-switch.sh` with no args (or -h) still prints usage cleanly.
require_cf_auth() {
  : "${CLOUDFLARE_API_TOKEN:?kill-switch: CLOUDFLARE_API_TOKEN env var is required}"
  : "${CLOUDFLARE_ZONE_ID:?kill-switch: CLOUDFLARE_ZONE_ID env var is required}"
  AUTH_HEADER="Authorization: Bearer $CLOUDFLARE_API_TOKEN"
}

require_jq() {
  if ! command -v jq >/dev/null 2>&1; then
    echo "kill-switch: 'jq' is required but not installed." >&2
    exit 1
  fi
}

# Look up apex A-record ID (zone may have multiple A records for other hosts; filter by name).
get_apex_record_id() {
  curl -sfS -H "$AUTH_HEADER" \
    "$CF_API/zones/$CLOUDFLARE_ZONE_ID/dns_records?type=A&name=$APEX_NAME" \
    | jq -r '.result[0].id // empty'
}

cmd_status() {
  require_jq
  require_cf_auth
  curl -sfS -H "$AUTH_HEADER" \
    "$CF_API/zones/$CLOUDFLARE_ZONE_ID/dns_records?type=A&name=$APEX_NAME" \
    | jq '.result[0] | {name, content, proxied, ttl, modified_on}'
}

set_apex_value() {
  local new_ip="$1"
  local record_id
  require_jq
  require_cf_auth

  record_id=$(get_apex_record_id)
  if [ -z "$record_id" ]; then
    echo "kill-switch: could not find apex A record for $APEX_NAME in zone $CLOUDFLARE_ZONE_ID" >&2
    exit 2
  fi

  local payload
  payload=$(jq -cn --arg ip "$new_ip" --arg name "$APEX_NAME" \
    '{content:$ip, type:"A", name:$name, proxied:true}')

  curl -sfS -X PATCH -H "$AUTH_HEADER" -H 'Content-Type: application/json' \
    "$CF_API/zones/$CLOUDFLARE_ZONE_ID/dns_records/$record_id" \
    -d "$payload" \
    | jq '.result | {name, content, proxied, ttl, modified_on}'
}

cmd_revert() {
  : "${V01_GCE_IP:?kill-switch revert: V01_GCE_IP env var is required}"
  set_apex_value "$V01_GCE_IP"
  echo "kill-switch: apex reverted to v0.1 GCE ($V01_GCE_IP). DNS propagation ~30-60s."
  echo "kill-switch: after reconciling, run 'terraform -chdir=iac/cloudrun refresh -var-file=prod.tfvars'."
}

cmd_restore() {
  : "${PROD_CLOUDRUN_LB_IP:?kill-switch restore: PROD_CLOUDRUN_LB_IP env var is required}"
  set_apex_value "$PROD_CLOUDRUN_LB_IP"
  echo "kill-switch: apex restored to prod Cloud Run LB ($PROD_CLOUDRUN_LB_IP). DNS propagation ~30-60s."
  echo "kill-switch: after reconciling, run 'terraform -chdir=iac/cloudrun refresh -var-file=prod.tfvars'."
}

usage() {
  cat >&2 <<EOF
usage: $0 {status|revert|restore}

  status   Print current apex A record (JSON).
  revert   Flip apex A to V01_GCE_IP (rollback to v0.1 GCE).
  restore  Flip apex A to PROD_CLOUDRUN_LB_IP (forward to prod Cloud Run).

Required env: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ZONE_ID,
              V01_GCE_IP (for revert), PROD_CLOUDRUN_LB_IP (for restore).
EOF
  exit 2
}

case "${1:-}" in
  status)  cmd_status  ;;
  revert)  cmd_revert  ;;
  restore) cmd_restore ;;
  -h|--help|help|"") usage ;;
  *) echo "kill-switch: unknown subcommand '$1'" >&2; usage ;;
esac
