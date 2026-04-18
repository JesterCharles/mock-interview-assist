#!/usr/bin/env bash
# Phase 51 Plan 01 — outputs the digest (with `sha256:` prefix stripped) of the
# latest successful deploy-staging.yml run. Used by runbook + prod.tfvars seeding.
#
# Downstream consumer: iac/cloudrun/scripts/promote-staging-digest-to-prod.sh
#
# Usage:
#   ./fetch-latest-staging-digest.sh               # hex digest to stdout
#   DIGEST=$(./fetch-latest-staging-digest.sh)
#
# Prereqs: gh CLI authenticated to JesterCharles/mock-interview-assist with read:packages.
set -euo pipefail

REPO="${REPO:-JesterCharles/mock-interview-assist}"

# Resolve the most recent successful deploy-staging run.
RUN_ID=$(gh run list \
  --repo "$REPO" \
  --workflow=deploy-staging.yml \
  --status=success \
  --limit 1 \
  --json databaseId \
  -q '.[0].databaseId')

if [ -z "$RUN_ID" ] || [ "$RUN_ID" = "null" ]; then
  echo "fetch-latest-staging-digest: no successful deploy-staging.yml run found in $REPO" >&2
  exit 1
fi

# Digest is emitted by docker/build-push-action in the workflow log.
DIGEST=$(gh run view "$RUN_ID" --repo "$REPO" --log 2>/dev/null \
  | grep -oE 'sha256:[a-f0-9]{64}' \
  | head -1 \
  | sed 's/^sha256://')

if [ -z "$DIGEST" ]; then
  echo "fetch-latest-staging-digest: could not extract sha256 digest from run $RUN_ID" >&2
  exit 1
fi

echo "$DIGEST"
