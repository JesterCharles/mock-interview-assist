#!/usr/bin/env bash
# loadtest/scripts/fetch-supabase-query-count.sh — Phase 49 Plan 02 (D-08)
#
# Post-run helper: groups Cloud Run access logs by the X-Session-ID request
# header (set per iteration by loadtest/baseline.js) and reports queries/session
# p50 / p95 / max.
#
# CAVEAT (D-08): the app currently does NOT correlate Prisma queries back to
# the X-Session-ID header — that correlation is v1.6 observability polish work.
# When instrumentation is pending this script emits queries_per_session: null
# and the baseline doc keeps the "TBD — instrumented in v1.6" note.
#
# Soft-fails to { error } JSON so the workflow still publishes all artifacts.
set -euo pipefail

GCP_PROJECT="${GCP_PROJECT:-nlm-staging-493715}"
SERVICE_NAME="${SERVICE_NAME:-nlm-staging}"
WINDOW="${WINDOW:-15m}"
LIMIT="${LIMIT:-5000}"

soft_fail() {
  local reason="$1"
  # shellcheck disable=SC2016
  jq -n --arg reason "$reason" --arg source 'cloud logging' --arg window "$WINDOW" \
    '{ error: $reason, source: $source, window: $window, queries_per_session: null }'
  exit 0
}

command -v gcloud >/dev/null 2>&1 || soft_fail 'gcloud not on PATH'
command -v jq >/dev/null 2>&1 || soft_fail 'jq not on PATH'

FILTER="resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${SERVICE_NAME}\" AND jsonPayload.headers.\"x-session-id\" != \"\""

if ! LOG_JSON=$(gcloud logging read "$FILTER" \
      --project="$GCP_PROJECT" \
      --freshness="$WINDOW" \
      --format=json \
      --limit="$LIMIT" 2>/dev/null); then
  soft_fail 'gcloud logging read failed'
fi

# Empty array = instrumentation pending.
COUNT=$(echo "$LOG_JSON" | jq 'length')
if [[ "$COUNT" == "0" ]]; then
  jq -n --arg source 'cloud logging' --arg window "$WINDOW" --arg note 'TBD — instrumentation pending (v1.6 observability polish); no x-session-id log entries in window' \
    '{
      sessions_observed: 0,
      queries_per_session: null,
      source: $source,
      window: $window,
      note: $note
    }'
  exit 0
fi

# Group log entries by X-Session-ID, compute count-per-session, then p50/p95/max.
COUNTS=$(echo "$LOG_JSON" \
  | jq 'group_by(.jsonPayload.headers."x-session-id") | map(length) | sort')

jq -n --argjson counts "$COUNTS" --arg source 'cloud logging' --arg window "$WINDOW" '
  ($counts | length) as $n
  | ($counts | min) as $min
  | ($counts | max) as $max
  | (($n - 1) * 0.5 | floor | . + 0) as $p50idx
  | (($n - 1) * 0.95 | floor | . + 0) as $p95idx
  | {
      sessions_observed: $n,
      queries_per_session: {
        p50: $counts[$p50idx],
        p95: $counts[$p95idx],
        max: $max,
        min: $min
      },
      source: $source,
      window: $window
    }
'
