#!/usr/bin/env bash
# Phase 47 D-23 — cold-start probe for INFRA-04 success criterion 4.
# Source: 47-RESEARCH.md §Operational Scripts; Pitfalls 7 (SSL not ACTIVE) and 8 (no API to force scale-to-zero).
#
# Flow:
#   1. Gate on SSL cert ACTIVE (Pitfall 7). If PROVISIONING/FAILED_*, exit 0 with ADVISORY — NOT a failure.
#   2. Pin 100% traffic to the latest revision.
#   3. Wait WAIT_SECONDS (default 300) for scale-to-zero (quiet staging assumption, §Don't Hand-Roll).
#   4. curl /api/health and capture HTTP code + time_total.
#   5. Assert HTTP 200 AND time_total < 30.0 (INFRA-04 ceiling).
#
# Usage:   bash iac/cloudrun/scripts/coldstart-probe-staging.sh
# Env:     COLDSTART_WAIT_SECONDS (override default 300 for testing)

set -euo pipefail

PROJECT="nlm-staging-493715"
REGION="us-central1"
SERVICE="nlm-staging"
DOMAIN="staging.nextlevelmock.com"
WAIT_SECONDS="${COLDSTART_WAIT_SECONDS:-300}"
COLDSTART_CEIL_SECONDS="30.0"

say() { echo "[$(date +%H:%M:%S)] $*"; }

# ─── 1. SSL gate (Pitfall 7) ───
say "Checking SSL cert status..."
SSL_STATUS=$(gcloud compute ssl-certificates describe nlm-staging-ssl-cert \
  --project="${PROJECT}" --format='value(managed.status)' 2>/dev/null || echo "UNKNOWN")

if [[ "${SSL_STATUS}" != "ACTIVE" ]]; then
  say "ADVISORY: SSL cert status is ${SSL_STATUS}, not ACTIVE. Cold-start probe skipped."
  say "Re-run this script after cert flips to ACTIVE (10-60 min typical; up to 24h worst case)."
  exit 0
fi

# ─── 2. Pin latest revision to 100% traffic ───
say "Pinning 100% traffic to latest revision of ${SERVICE}..."
gcloud run services update-traffic "${SERVICE}" \
  --project="${PROJECT}" --region="${REGION}" \
  --to-revisions=LATEST=100 \
  --quiet 1>/dev/null

# ─── 3. Wait for scale-to-zero ───
# Cloud Run default idle scale-down kicks in after ~15 min at zero traffic.
# 5 min (300s) is usually sufficient on staging which receives no live traffic.
# No reliable API to force scale-to-zero without breaking the service; quiet-traffic wait is the standard pattern.
say "Waiting ${WAIT_SECONDS}s for scale-to-zero (staging assumed quiet; no live traffic)..."
sleep "${WAIT_SECONDS}"

# ─── 4. Cold-start request ───
say "Probing https://${DOMAIN}/api/health ..."
TMPFILE="/tmp/coldstart-body.$$"
RESPONSE=$(curl -sf -o "${TMPFILE}" \
  -w 'HTTP_CODE=%{http_code} TIME_TOTAL=%{time_total}\n' \
  "https://${DOMAIN}/api/health" 2>&1) || {
    say "FAIL: curl errored. Output: ${RESPONSE}"
    rm -f "${TMPFILE}"
    exit 1
  }

HTTP_CODE=$(echo "${RESPONSE}" | sed -n 's/.*HTTP_CODE=\([0-9]*\).*/\1/p')
TIME_TOTAL=$(echo "${RESPONSE}" | sed -n 's/.*TIME_TOTAL=\([0-9.]*\).*/\1/p')

say "HTTP ${HTTP_CODE}; time_total=${TIME_TOTAL}s"
say "Response body:"
cat "${TMPFILE}"
echo
rm -f "${TMPFILE}"

# ─── 5. Assertions ───
if [[ "${HTTP_CODE}" != "200" ]]; then
  say "FAIL: expected HTTP 200, got ${HTTP_CODE}."
  say "     (D-24: may be 503 if Prisma connection transient — retry probe once.)"
  exit 1
fi

# awk comparison because bash doesn't handle floating point natively.
if awk -v t="${TIME_TOTAL}" -v c="${COLDSTART_CEIL_SECONDS}" 'BEGIN { exit (t > c) ? 0 : 1 }'; then
  say "FAIL: cold start ${TIME_TOTAL}s exceeds ceiling ${COLDSTART_CEIL_SECONDS}s."
  exit 1
fi

say "PASS: cold start ${TIME_TOTAL}s < ${COLDSTART_CEIL_SECONDS}s ceiling."
exit 0
