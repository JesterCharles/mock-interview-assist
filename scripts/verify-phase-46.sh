#!/usr/bin/env bash
# Phase 46 phase-gate aggregator — runs every automatable DATA-0x check.
#
# Required env:
#   PROD_SUPABASE_REF    Supabase prod project ref
#   SUPABASE_ACCESS_TOKEN Supabase PAT with `all` scope
#   STAGING_DIRECT_URL   Direct postgres URL (port 5432) for staging
#   PROD_DIRECT_URL      Direct postgres URL (port 5432) for prod
#
# Exits 0 only if all 6 checks pass. On any failure, exits 1 after listing
# which checks failed.

set -uo pipefail

: "${PROD_SUPABASE_REF:?Set PROD_SUPABASE_REF}"
: "${SUPABASE_ACCESS_TOKEN:?Set SUPABASE_ACCESS_TOKEN (Supabase PAT with all scope)}"
: "${STAGING_DIRECT_URL:?Set STAGING_DIRECT_URL (staging direct postgres url, port 5432)}"
: "${PROD_DIRECT_URL:?Set PROD_DIRECT_URL (prod direct postgres url, port 5432)}"

STAGING_REF="lzuqbpqmqlvzwebliptj"
FAILS=0

echo "== Phase 46 verification =="

# -----------------------------------------------------------------
# [1/6] DATA-05 — env hygiene
# -----------------------------------------------------------------
echo "[1/6] env hygiene"
if PROD_SUPABASE_REF="$PROD_SUPABASE_REF" npx tsx scripts/verify-env-hygiene.ts; then
  echo "  OK"
else
  echo "  FAIL" >&2
  FAILS=$((FAILS+1))
fi

# -----------------------------------------------------------------
# [2/6] DATA-04 — prisma migrate status (staging)
# -----------------------------------------------------------------
echo "[2/6] prisma migrate status (staging)"
if DIRECT_URL="$STAGING_DIRECT_URL" bash scripts/verify-migrations.sh; then
  echo "  OK"
else
  echo "  FAIL" >&2
  FAILS=$((FAILS+1))
fi

# -----------------------------------------------------------------
# [3/6] DATA-04 — prisma migrate status (prod)
# -----------------------------------------------------------------
echo "[3/6] prisma migrate status (prod)"
if DIRECT_URL="$PROD_DIRECT_URL" bash scripts/verify-migrations.sh; then
  echo "  OK"
else
  echo "  FAIL" >&2
  FAILS=$((FAILS+1))
fi

# -----------------------------------------------------------------
# [4/6] DATA-06 — staging uri_allow_list contains staging + localhost
# -----------------------------------------------------------------
echo "[4/6] staging uri_allow_list"
STAGING_ALLOW=$(curl -sH "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  "https://api.supabase.com/v1/projects/${STAGING_REF}/config/auth" \
  | jq -r '.uri_allow_list // ""')
echo "  staging.uri_allow_list = $STAGING_ALLOW"
if echo "$STAGING_ALLOW" | grep -q 'staging.nextlevelmock.com' \
  && echo "$STAGING_ALLOW" | grep -q 'localhost:3000'; then
  echo "  OK"
else
  echo "  FAIL: staging allowlist missing expected entries" >&2
  FAILS=$((FAILS+1))
fi

# -----------------------------------------------------------------
# [5/6] DATA-06 — prod uri_allow_list contains prod, not localhost/staging
# -----------------------------------------------------------------
echo "[5/6] prod uri_allow_list"
PROD_ALLOW=$(curl -sH "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  "https://api.supabase.com/v1/projects/${PROD_SUPABASE_REF}/config/auth" \
  | jq -r '.uri_allow_list // ""')
echo "  prod.uri_allow_list = $PROD_ALLOW"
if echo "$PROD_ALLOW" | grep -q 'nextlevelmock.com' \
  && ! echo "$PROD_ALLOW" | grep -q 'localhost' \
  && ! echo "$PROD_ALLOW" | grep -q 'staging.'; then
  echo "  OK"
else
  echo "  FAIL: prod allowlist contains forbidden entries OR missing prod" >&2
  FAILS=$((FAILS+1))
fi

# -----------------------------------------------------------------
# [6/6] DATA-01 — Secret Manager separation (T-46-06)
# -----------------------------------------------------------------
echo "[6/6] Secret Manager DATABASE_URL separation"
if gcloud secrets versions access latest --secret=DATABASE_URL \
    --project=nlm-staging-493715 \
    | grep -q "$STAGING_REF"; then
  echo "  staging DATABASE_URL OK"
else
  echo "  FAIL: staging DATABASE_URL missing staging ref" >&2
  FAILS=$((FAILS+1))
fi
if gcloud secrets versions access latest --secret=DATABASE_URL \
    --project=nlm-prod \
    | grep -q "$STAGING_REF"; then
  echo "  FAIL: prod DATABASE_URL contains staging ref (WRONG SECRET IN PROD)" >&2
  FAILS=$((FAILS+1))
else
  echo "  prod DATABASE_URL OK (no staging ref)"
fi

echo
if [ "$FAILS" -eq 0 ]; then
  echo "== Phase 46: ALL CHECKS GREEN =="
  exit 0
fi
echo "== Phase 46: $FAILS check(s) failed ==" >&2
exit 1
