#!/usr/bin/env bash
# Phase 51 Plan 02 — bring the existing Cloudflare apex A record under Terraform management.
# MUST run after dns-prod.tf is committed but BEFORE `terraform apply -target=cloudflare_record.apex`.
# Idempotent: re-running is safe (TF import complains "already managed" -> harmless).
#
# Prereqs:
#   - CLOUDFLARE_API_TOKEN    (Zone:DNS:Edit scope on nextlevelmock.com)
#   - CLOUDFLARE_ZONE_ID      (from Cloudflare Dashboard > nextlevelmock.com > Overview API panel)
#   - GOOGLE_OAUTH_ACCESS_TOKEN exported (terraform backend reads from GCS)
#   - cwd = iac/cloudrun (script auto-cds there)
#
# Usage: ./import-cloudflare-apex.sh
set -euo pipefail

: "${CLOUDFLARE_API_TOKEN:?set CLOUDFLARE_API_TOKEN env var (Zone.DNS.Edit on nextlevelmock.com)}"
: "${CLOUDFLARE_ZONE_ID:?set CLOUDFLARE_ZONE_ID env var (from Cloudflare dashboard)}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MODULE_DIR="$(dirname "$SCRIPT_DIR")"

# Resolve apex record ID via Cloudflare API.
RECORD_ID=$(curl -sfS \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records?type=A&name=nextlevelmock.com" \
  | jq -r '.result[0].id // empty')

if [ -z "$RECORD_ID" ]; then
  echo "import-cloudflare-apex: apex A record not found in zone $CLOUDFLARE_ZONE_ID" >&2
  echo "  expected a single A record for name=nextlevelmock.com" >&2
  exit 1
fi

echo "importing cloudflare_record.apex  zone=$CLOUDFLARE_ZONE_ID  record=$RECORD_ID"

cd "$MODULE_DIR"

# count-gated resources use index-suffixed import addresses in newer providers.
# cloudflare/cloudflare v4 supports both "cloudflare_record.apex" and "cloudflare_record.apex[0]".
# Use the bracketed form to match count=1 resource address.
#
# Cloudflare provider import format: <zone-id>/<record-id>
set +e
terraform import \
  -var-file=prod.tfvars \
  'cloudflare_record.apex[0]' "${CLOUDFLARE_ZONE_ID}/${RECORD_ID}"
IMPORT_RC=$?
set -e

if [ $IMPORT_RC -ne 0 ]; then
  echo "import-cloudflare-apex: import returned $IMPORT_RC." >&2
  echo "  If the error is 'resource already managed' or 'already exists in state', that's harmless." >&2
  echo "  Run: terraform state show 'cloudflare_record.apex[0]'  to confirm." >&2
  # exit non-zero ONLY if we can't find the resource in state afterwards
  if ! terraform state show 'cloudflare_record.apex[0]' >/dev/null 2>&1; then
    exit 1
  fi
fi

echo ""
echo "imported OK. Next step:"
echo "  terraform plan -var-file=prod.tfvars"
echo "  expected diff: +2 resources (www, legacy); 0 changes to apex (if value matches v01_gce_ip)"
echo "  If plan shows a CHANGE to apex.value, the v01_gce_ip tfvar does not match the live record — fix it."
