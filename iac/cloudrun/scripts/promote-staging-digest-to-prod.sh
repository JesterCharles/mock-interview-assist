#!/usr/bin/env bash
# Phase 51 Plan 01 — copies the staging-validated image into prod Artifact Registry
# by digest (bit-identical image, no rebuild). This gives prod Cloud Run a validated
# rollback baseline from day 1 (D-05).
#
# Usage:
#   ./promote-staging-digest-to-prod.sh [<digest-hex-no-prefix>]
# If no arg given, invokes ./fetch-latest-staging-digest.sh.
#
# Prereqs: gcloud authenticated, Artifact Registry APIs enabled in both projects (Phase 45).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

DIGEST="${1:-}"
if [ -z "$DIGEST" ]; then
  DIGEST=$("$SCRIPT_DIR/fetch-latest-staging-digest.sh")
fi

# Strip an accidental sha256: prefix if the caller passed one.
DIGEST="${DIGEST#sha256:}"

if [[ ! "$DIGEST" =~ ^[a-f0-9]{64}$ ]]; then
  echo "promote-staging-digest-to-prod: digest must be 64 lowercase hex chars (got: $DIGEST)" >&2
  exit 1
fi

SRC="us-central1-docker.pkg.dev/nlm-staging-493715/nlm-app/nlm-app@sha256:${DIGEST}"
DST_TAG="us-central1-docker.pkg.dev/nlm-prod/nlm-app/nlm-app:v1.5.0-rc1"

echo "promote: $SRC"
echo "     -> $DST_TAG"

# `gcloud artifacts docker tags add` does a cross-registry tag of an EXISTING image by digest.
# This requires the source and destination registries to be reachable with current creds; the
# underlying image layers get replicated automatically the first time.
gcloud artifacts docker tags add "$SRC" "$DST_TAG" --quiet

# Verify: the prod-side tag must now resolve to the same digest we started with.
PROD_DIGEST=$(gcloud artifacts docker images describe "$DST_TAG" \
  --format='value(image_summary.digest)' \
  | sed 's/^sha256://')

if [ "$PROD_DIGEST" != "$DIGEST" ]; then
  echo "promote: digest mismatch after tag add: expected $DIGEST, got $PROD_DIGEST" >&2
  exit 1
fi

echo "$DIGEST"
