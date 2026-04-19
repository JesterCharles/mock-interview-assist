#!/usr/bin/env bash
# Phase 51 Plan 02 — DNS-02 verification.
# Asserts the 4-record matrix (CONTEXT D-01) resolves correctly against Cloudflare's 1.1.1.1 resolver.
#
# CRITICAL NEGATIVE ASSERTION (T-51-01):
# apex must STILL point at v0.1 GCE IP — if the Cloudflare record value equals
# the prod Cloud Run LB IP, Phase 51 has accidentally performed the Phase 52 cutover.
# Exit code 2 in that case (distinct from exit 1 for other failures).
#
# Prereqs (for negative-assertion API probe):
#   CLOUDFLARE_API_TOKEN + CLOUDFLARE_ZONE_ID exported.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MODULE_DIR="$(dirname "$SCRIPT_DIR")"
cd "$MODULE_DIR"

fail() { echo "FAIL: $*" >&2; exit 1; }
trip() { echo "FAIL(T-51-01 TRIGGERED): $*" >&2; exit 2; }
warn() { echo "WARN: $*" >&2; }
ok()   { echo "OK:   $*"; }

# ─── Resolve expected values from tfvars + terraform outputs ─────────────────
V01_IP=$(grep -E '^v01_gce_ip' prod.tfvars | sed -E 's/.*"([^"]+)".*/\1/')
PROD_LB_IP=$(terraform output -raw prod_lb_ip 2>/dev/null || echo "")
STAGING_LB_IP=$(terraform output -raw staging_lb_ip 2>/dev/null || echo "")

[ -n "$V01_IP" ] || fail "v01_gce_ip not set in prod.tfvars"
[ "$V01_IP" = "PLACEHOLDER_V01_GCE_IPV4" ] && fail "v01_gce_ip is still the placeholder — set it to real v0.1 GCE IP first"
[ -n "$PROD_LB_IP" ] || fail "prod_lb_ip terraform output missing (Plan 01 apply incomplete?)"

: "${CLOUDFLARE_API_TOKEN:?set CLOUDFLARE_API_TOKEN env var}"
: "${CLOUDFLARE_ZONE_ID:?set CLOUDFLARE_ZONE_ID env var}"

# ─── Record 1: apex → v0.1 GCE IP (NEGATIVE ASSERTION) ────────────────────────
# Apex is proxied (orange-cloud), so `dig` returns a Cloudflare edge IP — not the origin.
# Query Cloudflare API directly for the underlying record value.
CF_APEX_VALUE=$(curl -sfS \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records?type=A&name=nextlevelmock.com" \
  | jq -r '.result[0].content // empty')

[ -n "$CF_APEX_VALUE" ] || fail "apex Cloudflare record not found"
if [ "$CF_APEX_VALUE" = "$PROD_LB_IP" ]; then
  trip "apex Cloudflare record value = prod LB IP ($PROD_LB_IP) — cutover happened early!"
fi
[ "$CF_APEX_VALUE" = "$V01_IP" ] || fail "apex Cloudflare record value = $CF_APEX_VALUE, expected $V01_IP (v0.1 GCE)"
ok "apex Cloudflare record value = $V01_IP (v0.1 GCE) — NOT flipped to prod (T-51-01 asserted)"

# ─── Record 2: www → prod Cloud Run LB IP (proxied=false, dig returns origin) ─
# DNS propagation retry: up to 3 × 60s.
WWW_RESOLVED=""
for attempt in 1 2 3; do
  WWW_RESOLVED=$(dig +short A www.nextlevelmock.com @1.1.1.1 | head -1 || true)
  if [ -n "$WWW_RESOLVED" ]; then break; fi
  if [ $attempt -lt 3 ]; then
    warn "www.nextlevelmock.com empty — retry $attempt/3 in 60s"
    sleep 60
  fi
done
[ "$WWW_RESOLVED" = "$PROD_LB_IP" ] || fail "www resolves to '$WWW_RESOLVED', expected $PROD_LB_IP"
ok "www.nextlevelmock.com → $PROD_LB_IP (prod Cloud Run LB)"

# ─── Record 3: legacy → v0.1 GCE IP (proxied=false) ───────────────────────────
LEGACY_RESOLVED=""
for attempt in 1 2 3; do
  LEGACY_RESOLVED=$(dig +short A legacy.nextlevelmock.com @1.1.1.1 | head -1 || true)
  if [ -n "$LEGACY_RESOLVED" ]; then break; fi
  if [ $attempt -lt 3 ]; then
    warn "legacy.nextlevelmock.com empty — retry $attempt/3 in 60s"
    sleep 60
  fi
done
[ "$LEGACY_RESOLVED" = "$V01_IP" ] || fail "legacy resolves to '$LEGACY_RESOLVED', expected $V01_IP"
ok "legacy.nextlevelmock.com → $V01_IP (v0.1 GCE — 30-day rollback record)"

# ─── Record 4: staging → staging Cloud Run LB IP (Phase 47) ───────────────────
STG_RESOLVED=$(dig +short A staging.nextlevelmock.com @1.1.1.1 | head -1 || true)
if [ -n "$STAGING_LB_IP" ]; then
  [ "$STG_RESOLVED" = "$STAGING_LB_IP" ] || fail "staging resolves to '$STG_RESOLVED', expected $STAGING_LB_IP"
  ok "staging.nextlevelmock.com → $STAGING_LB_IP (Phase 47)"
else
  [ -n "$STG_RESOLVED" ] || fail "staging record missing from DNS"
  warn "staging_lb_ip terraform output unavailable — resolved value: $STG_RESOLVED (manual confirmation needed)"
fi

echo ""
echo "All 4 Phase 51 DNS records verified."
