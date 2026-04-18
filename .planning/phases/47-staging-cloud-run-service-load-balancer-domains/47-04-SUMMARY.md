---
phase: 47-staging-cloud-run-service-load-balancer-domains
plan: 04
subsystem: phase-gate
one_liner: "Cold-start probe (SSL-gated, 30s ceiling) + verify-phase-47.sh phase-gate aggregator + Plan 04 runbook shipped; NEXT_PUBLIC_SITE_URL secret population + script invocation HALTED"
tags: [phase-gate, scripts, observability, runbook, halt]
requires: [47-01, 47-02, 47-03]
provides:
  - iac/cloudrun/scripts/coldstart-probe-staging.sh (chmod 0755, SSL-gated, awk float ceiling)
  - iac/cloudrun/scripts/verify-phase-47.sh (chmod 0755, 15 PASS gates + cold-start)
  - iac/cloudrun/README.md "### Plan 04 — NEXT_PUBLIC_SITE_URL secret + cold-start probe" section
affects:
  - Ready for /gsd-verify-work once operator completes apply + SSL wait + secret population
tech_stack:
  added: []
  patterns:
    - "awk float compare for sub-second timing (bash doesn't do floats)"
    - "SSL ACTIVE gate with advisory exit-0 (no false-red before 10-60 min cert provisioning)"
    - "jq -e + |@csv for exact-baseline assertion"
    - "paste -sd ',' + string compare for exact project-role matrix (order-insensitive)"
key_files:
  created:
    - iac/cloudrun/scripts/coldstart-probe-staging.sh
    - iac/cloudrun/scripts/verify-phase-47.sh
    - .planning/phases/47-staging-cloud-run-service-load-balancer-domains/47-04-SUMMARY.md
  modified:
    - iac/cloudrun/README.md (appended Plan 04 H3 section + rotation notes)
decisions:
  - "Unattended mode: scripts shipped + syntax-validated (bash -n). DID NOT execute — nothing live yet to verify."
  - "Cold-start script tolerant of SSL=PROVISIONING (advisory exit 0 per Pitfall 7) so operator can run anytime during apply sequence without false reds."
  - "verify-phase-47.sh intentionally fails fast on first missing resource — its job is to be the single green/red gate the orchestrator reads."
metrics:
  tasks_completed: 3
  tasks_halted: 1
  commits: 1
  duration_minutes: 5
  completed_date: 2026-04-18
---

# Phase 47 Plan 04: Phase-Gate + Cold-Start Probe Summary

## What Was Built

1. **`iac/cloudrun/scripts/coldstart-probe-staging.sh`** (executable):
   - SSL gate: `gcloud compute ssl-certificates describe ... --format='value(managed.status)'` — if not `ACTIVE`, print ADVISORY and exit 0 (Pitfall 7 tolerance).
   - Pin traffic to LATEST via `gcloud run services update-traffic --to-revisions=LATEST=100`.
   - Sleep `${COLDSTART_WAIT_SECONDS:-300}` for scale-to-zero.
   - `curl -sf -w 'HTTP_CODE=%{http_code} TIME_TOTAL=%{time_total}\n'` against `https://staging.nextlevelmock.com/api/health`.
   - Assert HTTP 200 AND `time_total < 30.0` via awk float compare.

2. **`iac/cloudrun/scripts/verify-phase-47.sh`** (executable) — 15 PASS gates + cold-start:
   - **INFRA-04 (7 gates):** digest-pinned image, baseline CSV `0,10,"1","512Mi","300s"`, 13 env vars, runtime SA = `nlm-cloudrun-sa`, public invoker `allUsers`, `lifecycle.ignore_changes` grep, `NEXT_PUBLIC_SITE_URL` secret value
   - **INFRA-05 (5 gates):** SSL cert ACTIVE, HTTPS 200, DNS==LB_IP, no `cf-ray` header, forwarding rule port 443
   - **CI-04 (5 gates):** WIF pool ACTIVE in both projects, attribute_condition contains repo slug, exact project-role matrix = `roles/artifactregistry.writer,roles/run.admin`, SA-scoped `iam.serviceAccountUser` on `nlm-cloudrun-sa`, zero USER_MANAGED keys, `wif-smoke.yml` last-run = `success`
   - Final: delegates to coldstart probe; on success, final line is exactly `All Phase 47 assertions PASSED.`

3. **`iac/cloudrun/README.md`** — Appended "### Plan 04" H3 section with:
   - `gcloud secrets versions add NEXT_PUBLIC_SITE_URL` + `gcloud run services update --update-secrets=...:latest` runbook
   - Invocation for cold-start probe and phase-gate
   - T-47-10 rotation notes (add secret version → update-secrets to force re-read)

**Syntax evidence:**

```
$ bash -n iac/cloudrun/scripts/coldstart-probe-staging.sh && echo OK
OK
$ bash -n iac/cloudrun/scripts/verify-phase-47.sh && echo OK
OK
$ test -x iac/cloudrun/scripts/coldstart-probe-staging.sh && echo EXEC
EXEC
$ test -x iac/cloudrun/scripts/verify-phase-47.sh && echo EXEC
EXEC
```

## What Was NOT Built (HALT)

**Task 1 live secret population + Task 2 script execution + Task 3 script execution — HALTED per unattended mode.**

Running any of these today fails: the Cloud Run service doesn't exist, SSL cert doesn't exist, NEXT_PUBLIC_SITE_URL secret is empty. All three scripts are phase-gate tools intended for operator invocation after the full Phase 47 apply sequence.

## Verification

```
$ ls -la iac/cloudrun/scripts/
...
-rwxr-xr-x  coldstart-probe-staging.sh
-rwxr-xr-x  verify-phase-47.sh
...

$ head -1 iac/cloudrun/scripts/coldstart-probe-staging.sh
#!/usr/bin/env bash
$ head -1 iac/cloudrun/scripts/verify-phase-47.sh
#!/usr/bin/env bash

$ grep -c 'COLDSTART_CEIL_SECONDS="30.0"' iac/cloudrun/scripts/coldstart-probe-staging.sh
1
$ grep -c 'All Phase 47 assertions PASSED' iac/cloudrun/scripts/verify-phase-47.sh
1
$ grep -q "Plan 04 — NEXT_PUBLIC_SITE_URL secret" iac/cloudrun/README.md && echo RUNBOOK
RUNBOOK
$ grep -q 'update-secrets=NEXT_PUBLIC_SITE_URL' iac/cloudrun/README.md && echo ROTATION
ROTATION
```

## Deviations from Plan

### HALT (Unattended Mode)

**HALT: needs operator** — Task 1 live `gcloud secrets versions add NEXT_PUBLIC_SITE_URL` + Task 2 probe run + Task 3 phase-gate run.

All three are post-apply operator actions. Cannot execute in headless mode because:
- Secret add requires live Secret Manager write to `nlm-staging-493715`
- Probe requires LB + SSL + DNS + Cloud Run live (all Phase 47 apply steps HALTED)
- Phase-gate fails fast on first missing resource

### Auto-fixes

None.

## Commits

| Task | Subject | Hash |
|------|---------|------|
| 1+2+3 | feat(47-04): add coldstart-probe-staging.sh + verify-phase-47.sh phase-gate + Plan 04 runbook | `f139123` |

## Self-Check: PASSED

- Files:
  - FOUND: iac/cloudrun/scripts/coldstart-probe-staging.sh (executable)
  - FOUND: iac/cloudrun/scripts/verify-phase-47.sh (executable)
  - FOUND: iac/cloudrun/README.md (Plan 04 section present)
- Commits: f139123 present.
- Syntax: `bash -n` on both scripts exits 0.
- HALT documented; scripts are phase-gate tools for post-apply operator run.
