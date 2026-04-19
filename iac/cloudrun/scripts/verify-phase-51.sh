#!/usr/bin/env bash
# Phase 51 verification — aggregates all 12 must-have assertions across Plans 01/02/03/04.
# Invoked by /gsd-verify-work and by Plan 04's done-check.
#
# Prereqs (live checks):
#   - gcloud auth + project nlm-prod accessible
#   - CLOUDFLARE_API_TOKEN + CLOUDFLARE_ZONE_ID exported
#   - terraform state available (gs://nlm-tfstate/cloudrun/prod/)
#   - gh CLI authenticated
#
# Usage:
#   ./verify-phase-51.sh
#
# Exit codes:
#   0 — all 12 must-haves pass
#   1 — a must-have failed
#   2 — T-51-01 TRIPPED (apex flipped to prod LB IP mid-Phase-51)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MODULE_DIR="$(dirname "$SCRIPT_DIR")"
cd "$MODULE_DIR"

pass() { echo "PASS: $*"; }
fail() { echo "FAIL: $*" >&2; exit 1; }
trip() { echo "FAIL: $*" >&2; exit 2; }

# ─── MH1: prod image digest-pinned ────────────────────────────────────────────
IMG=$(gcloud run services describe nlm-prod --region=us-central1 --project=nlm-prod \
  --format='value(template.containers[0].image)' 2>/dev/null || echo "")
if [ -z "$IMG" ]; then
  fail "MH1: nlm-prod Cloud Run service not reachable / not yet applied"
fi
echo "$IMG" | grep -q '@sha256:' || fail "MH1: prod image not digest-pinned ($IMG)"
pass "MH1: prod image digest-pinned"

# ─── MH2: config baseline ─────────────────────────────────────────────────────
CSV=$(gcloud run services describe nlm-prod --region=us-central1 --project=nlm-prod \
  --format=json \
  | jq -r '[.template.scaling.minInstanceCount // 0, .template.scaling.maxInstanceCount, .template.containers[0].resources.limits.cpu, .template.containers[0].resources.limits.memory, .template.timeout] | @csv')
[ "$CSV" = '0,10,"1","512Mi","300s"' ] || fail "MH2: config baseline mismatch ($CSV)"
pass "MH2: config baseline = 0,10,\"1\",\"512Mi\",\"300s\""

# ─── MH3: SSL cert lists both apex + www ──────────────────────────────────────
DOMAINS=$(gcloud compute ssl-certificates describe nlm-prod-ssl-cert --global --project=nlm-prod \
  --format='value(managed.domains)')
echo "$DOMAINS" | grep -q 'nextlevelmock.com' || fail "MH3a: apex not in cert managed.domains"
echo "$DOMAINS" | grep -q 'www.nextlevelmock.com' || fail "MH3b: www not in cert managed.domains"
pass "MH3: SSL cert covers apex + www"

# ─── MH4: deploy-prod.yml exists ──────────────────────────────────────────────
gh workflow list --json path 2>/dev/null \
  | jq -e '.[] | select(.path == ".github/workflows/deploy-prod.yml")' >/dev/null \
  || fail "MH4: deploy-prod.yml missing from gh workflow list (workflow not merged to main yet?)"
pass "MH4: deploy-prod.yml registered"

# ─── MH5: last deploy-prod.yml run succeeded ──────────────────────────────────
LAST_CONCLUSION=$(gh run list --workflow=deploy-prod.yml --limit 1 --json conclusion -q '.[0].conclusion' 2>/dev/null || echo "")
[ -n "$LAST_CONCLUSION" ] || fail "MH5: no deploy-prod.yml runs found (v1.5.0-rc1 tag not pushed yet?)"
[ "$LAST_CONCLUSION" = "success" ] || fail "MH5: deploy-prod.yml last run conclusion = $LAST_CONCLUSION, expected success"
pass "MH5: deploy-prod.yml last run = success"

# ─── MH6: health check via *.run.app URL ──────────────────────────────────────
URL=$(gcloud run services describe nlm-prod --format='value(status.url)' --project=nlm-prod)
HTTP=$(curl -sf -o /dev/null -w '%{http_code}' --max-time 30 "$URL/api/health" || echo "000")
case "$HTTP" in
  200|503) pass "MH6: *.run.app /api/health = $HTTP" ;;
  *)       fail "MH6: *.run.app smoke = $HTTP (expected 200 or 503 per INFRA-07)" ;;
esac

# ─── MH7: apex still points at v0.1 GCE (T-51-01 NEGATIVE ASSERTION) ──────────
V01_IP=$(grep -E '^v01_gce_ip' prod.tfvars | sed -E 's/.*"([^"]+)".*/\1/')
PROD_LB_IP=$(terraform output -raw prod_lb_ip 2>/dev/null || echo "")

if [ -z "$V01_IP" ] || [ "$V01_IP" = "PLACEHOLDER_V01_GCE_IPV4" ]; then
  fail "MH7: v01_gce_ip not populated in prod.tfvars (still placeholder)"
fi
[ -n "$PROD_LB_IP" ] || fail "MH7: prod_lb_ip terraform output missing"

: "${CLOUDFLARE_API_TOKEN:?MH7 requires CLOUDFLARE_API_TOKEN env var}"
: "${CLOUDFLARE_ZONE_ID:?MH7 requires CLOUDFLARE_ZONE_ID env var}"

APEX_VAL=$(curl -sfS -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records?type=A&name=nextlevelmock.com" \
  | jq -r '.result[0].content // empty')
[ -n "$APEX_VAL" ] || fail "MH7: apex Cloudflare record not found"

if [ "$APEX_VAL" = "$PROD_LB_IP" ]; then
  trip "MH7 (T-51-01 TRIGGERED): apex flipped to prod LB IP ($PROD_LB_IP) — Phase 52 cutover happened during Phase 51!"
fi
[ "$APEX_VAL" = "$V01_IP" ] || fail "MH7: apex value = $APEX_VAL, expected v0.1 GCE IP $V01_IP"
pass "MH7: apex=$V01_IP (v0.1 GCE) — NOT flipped to prod (T-51-01 asserted)"

# ─── MH8: www → prod LB IP ────────────────────────────────────────────────────
WWW=$(dig +short A www.nextlevelmock.com @1.1.1.1 | head -1)
[ "$WWW" = "$PROD_LB_IP" ] || fail "MH8: www resolves '$WWW', expected $PROD_LB_IP"
pass "MH8: www.nextlevelmock.com → $PROD_LB_IP"

# ─── MH9: legacy → v0.1 GCE IP ────────────────────────────────────────────────
LEG=$(dig +short A legacy.nextlevelmock.com @1.1.1.1 | head -1)
[ "$LEG" = "$V01_IP" ] || fail "MH9: legacy resolves '$LEG', expected $V01_IP"
pass "MH9: legacy.nextlevelmock.com → $V01_IP"

# ─── MH10: staging → staging LB IP (Phase 47, unchanged) ──────────────────────
STG_LB=$(terraform output -raw staging_lb_ip 2>/dev/null || echo "")
STG=$(dig +short A staging.nextlevelmock.com @1.1.1.1 | head -1)
if [ -n "$STG_LB" ]; then
  [ "$STG" = "$STG_LB" ] || fail "MH10: staging resolves '$STG', expected $STG_LB"
  pass "MH10: staging.nextlevelmock.com → $STG_LB"
else
  [ -n "$STG" ] || fail "MH10: staging record missing from DNS"
  pass "MH10: staging.nextlevelmock.com → $STG (staging_lb_ip output unavailable; manual cross-check advised)"
fi

# ─── MH11: DEPLOY.md has all 6 sections ───────────────────────────────────────
for SECTION in "Section 1: Preflight" "Section 2: T-24h" "Section 3: Cutover" "Section 4: Verification" "Section 5: Rollback" "Section 6: Zero-Downtime"; do
  grep -q "$SECTION" ../../.planning/DEPLOY.md 2>/dev/null \
    || grep -q "$SECTION" ../.planning/DEPLOY.md 2>/dev/null \
    || grep -q "$SECTION" .planning/DEPLOY.md 2>/dev/null \
    || fail "MH11: DEPLOY.md missing '$SECTION'"
done
pass "MH11: DEPLOY.md has all 6 sections"

# ─── MH12: prod traffic on LATEST revision (T-51-04 rehearsal did not leave rolled back) ─
TRAFFIC_REV=$(gcloud run services describe nlm-prod --format='value(status.traffic[0].revisionName)' --project=nlm-prod)
LATEST_READY=$(gcloud run services describe nlm-prod --format='value(status.latestReadyRevisionName)' --project=nlm-prod)
[ -n "$TRAFFIC_REV" ] || fail "MH12: could not read status.traffic[0].revisionName"
[ -n "$LATEST_READY" ] || fail "MH12: could not read status.latestReadyRevisionName"
[ "$TRAFFIC_REV" = "$LATEST_READY" ] \
  || fail "MH12 (T-51-04 TRIGGERED): traffic on $TRAFFIC_REV, latest is $LATEST_READY — prod is in rolled-back state"
pass "MH12: prod traffic on LATEST revision ($TRAFFIC_REV)"

echo ""
echo "All 12 Phase 51 must-haves verified."
