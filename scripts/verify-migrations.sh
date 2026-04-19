#!/usr/bin/env bash
# Phase 46 Plan 03 Task 2 — DATA-04 verification.
# Runs `prisma migrate status` against the given DIRECT_URL and asserts the
# output contains "Database schema is up to date".
#
# Exit codes:
#   0 — up to date (success)
#   1 — status output does not contain the expected phrase
#   2 — DIRECT_URL env var not set
#   3 — DIRECT_URL appears to be the pooler (port 6543) — RESEARCH Pitfall 1
#
# Usage:
#   DIRECT_URL="postgresql://..." bash scripts/verify-migrations.sh

set -euo pipefail

if [ -z "${DIRECT_URL:-}" ]; then
  echo "[verify-migrations] FAIL: DIRECT_URL env var not set" >&2
  echo "[verify-migrations]   usage: DIRECT_URL=<postgres-direct-url> bash scripts/verify-migrations.sh" >&2
  exit 2
fi

if echo "$DIRECT_URL" | grep -q ':6543'; then
  echo "[verify-migrations] FAIL: DIRECT_URL appears to be the pooler (port 6543)." >&2
  echo "[verify-migrations]   Use the direct connection on port 5432 (RESEARCH Pitfall 1)." >&2
  exit 3
fi

OUTPUT=$(DATABASE_URL="$DIRECT_URL" npx prisma migrate status 2>&1 || true)
echo "$OUTPUT"

if echo "$OUTPUT" | grep -q "Database schema is up to date"; then
  echo "[verify-migrations] OK"
  exit 0
fi
echo "[verify-migrations] FAIL: migrate status output does not contain 'Database schema is up to date'" >&2
exit 1
