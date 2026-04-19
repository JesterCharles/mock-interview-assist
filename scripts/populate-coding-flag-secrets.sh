#!/usr/bin/env bash
# Phase 50 / JUDGE-INTEG-01 — Populate CODING_CHALLENGES_ENABLED + JUDGE0_* values.
#
# Prereqs: Phase 45 Plan 03 applied (secret shells exist in both projects).
# Rule: values populated out-of-band per Phase 45 D-10 (never in tfstate).
#
# Usage: bash scripts/populate-coding-flag-secrets.sh
# Idempotent — safe to re-run. gcloud auto-increments version numbers.

set -euo pipefail

PROJECTS=("nlm-prod" "nlm-staging-493715")

# Per Phase 50 D-01: prod flag-dark, staging usable.
declare -A FLAG_VALUE
FLAG_VALUE["nlm-prod"]="false"
FLAG_VALUE["nlm-staging-493715"]="true"

# Per Phase 50 D-03: Judge0 placeholders (v1.6 replaces these with real values).
JUDGE0_URL_PLACEHOLDER="http://placeholder.invalid"
JUDGE0_TOKEN_PLACEHOLDER="placeholder-will-be-set-in-v1.6"

for PROJECT in "${PROJECTS[@]}"; do
  echo "==> Project: $PROJECT"

  FLAG="${FLAG_VALUE[$PROJECT]}"
  echo "  CODING_CHALLENGES_ENABLED=$FLAG"
  printf '%s' "$FLAG" | gcloud secrets versions add CODING_CHALLENGES_ENABLED \
    --data-file=- --project="$PROJECT"

  echo "  JUDGE0_URL=$JUDGE0_URL_PLACEHOLDER"
  printf '%s' "$JUDGE0_URL_PLACEHOLDER" | gcloud secrets versions add JUDGE0_URL \
    --data-file=- --project="$PROJECT"

  echo "  JUDGE0_AUTH_TOKEN=***placeholder***"
  printf '%s' "$JUDGE0_TOKEN_PLACEHOLDER" | gcloud secrets versions add JUDGE0_AUTH_TOKEN \
    --data-file=- --project="$PROJECT"
done

echo ""
echo "Verification:"
for PROJECT in "${PROJECTS[@]}"; do
  echo "  $PROJECT CODING_CHALLENGES_ENABLED:"
  gcloud secrets versions access latest --secret=CODING_CHALLENGES_ENABLED --project="$PROJECT"
  echo ""
done
