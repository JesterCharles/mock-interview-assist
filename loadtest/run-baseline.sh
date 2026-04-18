#!/usr/bin/env bash
# loadtest/run-baseline.sh — Phase 49 Plan 01 (LOAD-01)
# Local wrapper around k6; refuses non-staging targets (T-49-05).
set -euo pipefail

TARGET="${TARGET:-http://localhost:3000}"

# T-49-05 staging-only guard:
# If TARGET points at nextlevelmock.com, require the staging. prefix.
if [[ "$TARGET" == *"nextlevelmock.com"* ]] && [[ "$TARGET" != *"staging.nextlevelmock.com"* ]]; then
  echo "refuse: non-staging target $TARGET — use https://staging.nextlevelmock.com" >&2
  exit 3
fi

if ! command -v k6 >/dev/null 2>&1; then
  echo "k6 is not on PATH. Install via:" >&2
  echo "  brew install k6    # macOS" >&2
  echo "  https://k6.io/docs/getting-started/installation/  # other platforms" >&2
  exit 2
fi

echo "[loadtest] target=$TARGET"
k6 run --env TARGET="$TARGET" loadtest/baseline.js

# After a successful k6 run, render the baseline draft. The committed final
# version is produced by Plan 02 in CI with Cloud Run + Supabase metrics.
if [[ -f /tmp/loadtest-result.json ]]; then
  echo "[loadtest] rendering draft report"
  mkdir -p .planning
  npx tsx loadtest/generate-report.ts /tmp/loadtest-result.json > .planning/loadtest-baseline-v1.5.md.draft
  echo "[loadtest] draft: .planning/loadtest-baseline-v1.5.md.draft"
fi
