#!/usr/bin/env bash
# loadtest/scripts/fetch-cloud-run-metrics.sh — Phase 49 Plan 02 (D-07)
#
# Post-run helper: reads Cloud Run container CPU + memory utilization samples
# for the last 15 minutes via `gcloud monitoring time-series list`, aggregates
# them into:
#   - peak_cpu_pct      (max CPU utilization across window, 0-100)
#   - peak_mem_pct      (max memory utilization across window, 0-100)
#   - total_vcpu_seconds (approx: integral of cpu_utilization * instance_seconds)
#   - total_gb_seconds   (approx: integral of mem_utilization * GB_per_instance)
#
# Outputs a single JSON blob to stdout. Soft-fails to { error } so the workflow
# still publishes all other artifacts.
set -euo pipefail

GCP_PROJECT="${GCP_PROJECT:-nlm-staging-493715}"
SERVICE_NAME="${SERVICE_NAME:-nlm-staging}"
WINDOW="${WINDOW:-15m}"
# Default Cloud Run container allocations — matches INFRA-04 staging.
# Override if the service changes its resource floor.
CPU_ALLOCATION="${CPU_ALLOCATION:-1}"
MEM_GB_PER_INSTANCE="${MEM_GB_PER_INSTANCE:-0.5}"

soft_fail() {
  local reason="$1"
  # shellcheck disable=SC2016
  jq -n --arg reason "$reason" --arg source 'gcloud monitoring' \
    '{ error: $reason, source: $source }'
  exit 0
}

command -v gcloud >/dev/null 2>&1 || soft_fail 'gcloud not on PATH'
command -v jq >/dev/null 2>&1 || soft_fail 'jq not on PATH'

read_metric() {
  local mtype="$1"
  local filter
  filter="metric.type=\"${mtype}\" AND resource.label.service_name=\"${SERVICE_NAME}\""
  # --window provides the duration looking back from now.
  if ! gcloud monitoring time-series list \
      --project="$GCP_PROJECT" \
      --filter="$filter" \
      --window="$WINDOW" \
      --format=json 2>/dev/null; then
    echo '[]'
  fi
}

CPU_JSON=$(read_metric 'run.googleapis.com/container/cpu/utilizations')
MEM_JSON=$(read_metric 'run.googleapis.com/container/memory/utilizations')

if [[ "$CPU_JSON" == "[]" && "$MEM_JSON" == "[]" ]]; then
  soft_fail 'no cpu/memory samples returned (check service name + project)'
fi

# Aggregate peaks + integrate seconds. Cloud Monitoring samples are typically
# 60s apart for Cloud Run utilization.
PEAK_CPU=$(echo "$CPU_JSON" | jq '[.[].points[]?.value.distributionValue?.mean // .[].points[]?.value.doubleValue // 0] | max // 0')
PEAK_MEM=$(echo "$MEM_JSON" | jq '[.[].points[]?.value.distributionValue?.mean // .[].points[]?.value.doubleValue // 0] | max // 0')

# Approximation: each sample represents ~60s; cpu_sample * 60 * CPU_ALLOCATION gives vCPU-seconds for that window.
TOTAL_VCPU=$(echo "$CPU_JSON" | jq --argjson alloc "$CPU_ALLOCATION" \
  '[.[].points[]? | (.value.distributionValue?.mean // .value.doubleValue // 0)] | add * 60 * $alloc // 0')
TOTAL_GB=$(echo "$MEM_JSON" | jq --argjson gb "$MEM_GB_PER_INSTANCE" \
  '[.[].points[]? | (.value.distributionValue?.mean // .value.doubleValue // 0)] | add * 60 * $gb // 0')

# Convert utilization (0..1) to pct (0..100).
PEAK_CPU_PCT=$(echo "$PEAK_CPU * 100" | bc -l)
PEAK_MEM_PCT=$(echo "$PEAK_MEM * 100" | bc -l)

jq -n \
  --argjson peak_cpu_pct "$PEAK_CPU_PCT" \
  --argjson peak_mem_pct "$PEAK_MEM_PCT" \
  --argjson total_vcpu_seconds "$TOTAL_VCPU" \
  --argjson total_gb_seconds "$TOTAL_GB" \
  --arg source 'gcloud monitoring' \
  --arg window "$WINDOW" \
  --arg service "$SERVICE_NAME" \
  --arg window_end "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  '{
    peak_cpu_pct: $peak_cpu_pct,
    peak_mem_pct: $peak_mem_pct,
    total_vcpu_seconds: $total_vcpu_seconds,
    total_gb_seconds: $total_gb_seconds,
    source: $source,
    window: $window,
    service: $service,
    window_end: $window_end
  }'
