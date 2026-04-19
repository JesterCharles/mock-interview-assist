# v1.5 Cutover Log

**Status:** TEMPLATE — populated by human operator during live cutover execution.
**Phase:** 52 — DNS Cutover + Zero-Downtime Validation + Kill Switch
**Cutover operator:** jestercharles@gmail.com
**T-0 timestamp (UTC):** `<fill at cutover start>`
**Pre-cutover apex A (v0.1 GCE IP):** `<V01_GCE_IP — from iac/cloudrun/prod.tfvars>`
**Post-cutover apex A (prod Cloud Run LB IP):** `<PROD_CLOUDRUN_LB_IP — from gcloud compute addresses describe nlm-prod-lb-ip>`

> **Unattended-mode note (2026-04-18):** This file was seeded by Phase 52 Plan 01 under `--unattended` rules.
> The four sections below are pre-structured placeholders. Every live command in Phase 52 is human-only;
> the operator fills each section by pasting raw stdout as it runs. No DNS mutations, no terraform applies,
> and no API calls occurred during the Phase 52 code-complete commits.

## §1 Preflight Checklist (T-24h to T-5min)

**Source of truth:** `.planning/DEPLOY.md` Section 1 (9 subchecks + team-notify).

Append each command's stdout here with an ISO-8601 timestamp prefix: `[YYYY-MM-DDTHH:MM:SSZ] $ <command>`.
If any check fails, STOP and mark **PREFLIGHT FAIL** — Phase 52 does not proceed.

### 1.1 SSL cert ACTIVE for apex + www

```
[<timestamp>] $ gcloud compute ssl-certificates describe nlm-prod-ssl-cert --global --project=nlm-prod --format='json(managed.domainStatus)'
<paste JSON — expect both nextlevelmock.com AND www.nextlevelmock.com report ACTIVE>
```

### 1.2 Uptime check green 24h

```
[<timestamp>] $ gcloud monitoring uptime list-configs --project=nlm-prod --format='json(displayName,httpCheck)' | jq '.[] | select(.displayName | contains("nextlevelmock"))'
<paste JSON — confirm no fired alerts in last 24h via Cloud Console Monitoring>
```

### 1.3 Staging load-test signed off (Phase 49)

```
[<timestamp>] $ test -f .planning/loadtest-baseline-v1.5.md && grep -q 'sign-off' .planning/loadtest-baseline-v1.5.md && echo OK
<expect: OK>
```

### 1.4 SECURITY-v1.5.md signed off by codex adversarial-review

```
[<timestamp>] $ test -f .planning/SECURITY-v1.5.md && grep -qi 'codex adversarial-review' .planning/SECURITY-v1.5.md && echo OK
<expect: OK>
```

### 1.5 Prod Cloud Run revision matches latest staging digest

```
[<timestamp>] $ PROD_DIGEST=$(gcloud run services describe nlm-prod --region=us-central1 --project=nlm-prod --format='value(template.containers[0].image)' | grep -oE 'sha256:[a-f0-9]{64}')
[<timestamp>] $ STAGING_DIGEST=$(gcloud run services describe nlm-staging --region=us-central1 --project=nlm-staging-493715 --format='value(template.containers[0].image)' | grep -oE 'sha256:[a-f0-9]{64}')
prod:    <paste>
staging: <paste>
<expect: both are 64-hex sha256 digests; identical OR prod is a freshly CI-built rc1 digest>
```

### 1.6 ADMIN_EMAILS mailbox reached in last 7 days

```
[<timestamp>] Operator confirms visually in jestercharles@gmail.com inbox: received at least one GCP Monitoring or Resend email in last 7 days.
Result: <PASS | FAIL>
```

### 1.7 Supabase prod reachable from prod Cloud Run

```
[<timestamp>] $ URL=$(gcloud run services describe nlm-prod --region=us-central1 --project=nlm-prod --format='value(status.url)')
[<timestamp>] $ curl -sf "$URL/api/health" | jq .
<expect: JSON body includes "db": "ok" (or 503 transient — retry 3x with 30s sleep)>
```

### 1.8 Cloudflare API token valid + zone access

```
[<timestamp>] $ curl -sfS -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID" | jq '.result.name'
<expect: "nextlevelmock.com">
```

### 1.9 Apex still points at v0.1 GCE IP (T-51-01 safety)

```
[<timestamp>] $ cd iac/cloudrun && ./scripts/verify-dns-records.sh
<expect: exit 0. If exit 2 — cutover already happened (or attempted); ABORT preflight.>
```

### 1.10 TTL lowered to 300s (T-24h action)

```
[<timestamp>] $ dig nextlevelmock.com | awk '/^nextlevelmock.com/ {print $2}'
<expect: 300 (not 3600 or default)>
```

### 1.11 Team notified (24h prior + T-0)

```
[<timestamp>] Operator confirms stakeholders notified of cutover window start.
Result: <PASS>
```

**Preflight outcome:** `<ALL GREEN | PREFLIGHT FAIL at §1.N>`

## Pre-Cutover Baseline (T-0)

Captured immediately before the Plan 02 `terraform apply` flips the apex.

### Pre-cutover session start (D-04)

```
[<timestamp>] $ START_RESPONSE=$(curl -sf -X POST https://nextlevelmock.com/api/public/interview/start \
    -H 'Content-Type: application/json' \
    -d '{"repo":"nextlevelmock/question-banks","techs":[{"name":"JavaScript","weight":3}],"questionCount":3}')
[<timestamp>] $ echo "$START_RESPONSE" | jq .
<paste JSON response — records sessionId + firstQuestion>
PRE_CUTOVER_SESSION_ID=<paste sessionId here — Plan 04 reads this back>
```

**Session state:** OPEN — do NOT complete. Plan 04 observes its fate post-cutover (D-06/D-07).

### T-0 notification email

```
[<timestamp>] $ curl -sf -X POST https://nextlevelmock.com/api/send-email \
    -H 'Content-Type: application/json' \
    -d "{\"to\":\"jestercharles@gmail.com\",\"subject\":\"[NLM] v1.5 cutover starting\",\"body\":\"T-0 at <UTC timestamp>. Pre-cutover session: <SESSION_ID>. Apex will flip nextlevelmock.com A -> prod Cloud Run LB IP in Plan 02.\"}"
<paste response — SUCCESS or "EMAIL FAILED" per T-52-04 non-blocking disposition>
```

### Baseline dig (all 4 records)

```
[<timestamp>] $ dig @1.1.1.1 +short nextlevelmock.com A
<expect: v0.1 GCE IP — or a Cloudflare edge IP since apex is proxied; cross-check CF API content field>

[<timestamp>] $ dig @1.1.1.1 +short www.nextlevelmock.com A
<expect: prod Cloud Run LB IP — Phase 51 D-02; UNCHANGED at cutover>

[<timestamp>] $ dig @1.1.1.1 +short staging.nextlevelmock.com A
<expect: staging Cloud Run LB IP — Phase 47; UNCHANGED>

[<timestamp>] $ dig @1.1.1.1 +short legacy.nextlevelmock.com A
<expect: v0.1 GCE IP — UNCHANGED for 30-day rollback window>
```

### Cloudflare API content cross-check (apex is proxied, dig returns CF edge IP)

```
[<timestamp>] $ curl -sfS -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/dns_records?type=A&name=nextlevelmock.com" | jq -r '.result[0].content'
<expect: v01_gce_ip value from prod.tfvars>
```

### Baseline curl (health endpoints)

```
[<timestamp>] $ curl -sfI https://nextlevelmock.com/api/health | head -5
<expect: HTTP/2 200 — served by v0.1 (apex still pointed at v0.1)>

[<timestamp>] $ curl -sfI https://staging.nextlevelmock.com/api/health | head -5
<expect: HTTP/2 200 — Google Frontend (staging Cloud Run)>

[<timestamp>] $ curl -sfI https://legacy.nextlevelmock.com/api/health | head -5
<expect: HTTP/2 200 — served by v0.1 via direct legacy LB>
```

**Baseline complete — commit this file before proceeding to Plan 02.**

<!-- ─────────────────────────────────────────────────────────────────────── -->
<!-- Plan 02 writes below: ## Cutover Execution (T-0 to T+5min) -->
<!-- ─────────────────────────────────────────────────────────────────────── -->

## Cutover Execution (T-0 to T+5min)

Written during Plan 02 `terraform apply -target='cloudflare_record.apex[0]' -var-file=prod.tfvars`.

### Terraform plan (dry run)

```
[<timestamp>] $ terraform plan -var-file=prod.tfvars -target='cloudflare_record.apex[0]' -out=cutover.tfplan
<paste plan output — expect EXACTLY 1 resource change:
  ~ cloudflare_record.apex[0]
      value: "<V01_GCE_IP>" -> "<PROD_CLOUDRUN_LB_IP>"
If any other resource change appears — ABORT, something drifted.>
```

### Terraform apply (T-0)

```
[<timestamp>] T-0: $ terraform apply cutover.tfplan
<paste apply output — expect "Apply complete! Resources: 0 added, 1 changed, 0 destroyed.">
```

### Commit prod.tfvars flip

```
[<timestamp>] $ git add iac/cloudrun/prod.tfvars iac/cloudrun/dns-prod.tf
[<timestamp>] $ git commit -m "chore(phase-52): flip apex nextlevelmock.com from v0.1 GCE to prod Cloud Run LB (cutover T-0)"
<paste commit hash>
```

### 10-iteration polling loop (every 30s for 5 min)

For i in 0..9, paste dig + curl + status code block.

#### Poll 0 (T+0s) — `<timestamp>`
```
[<timestamp>] $ dig @1.1.1.1 +short nextlevelmock.com A
<paste>
[<timestamp>] $ curl -sI -o /dev/null -w 'HTTP %{http_code} via IP=%{remote_ip}\n' https://nextlevelmock.com/api/health
<paste>
[<timestamp>] status=<code>
```

#### Poll 1 (T+30s) — `<timestamp>` — <paste block>
#### Poll 2 (T+60s) — `<timestamp>` — <paste block>
#### Poll 3 (T+90s) — `<timestamp>` — <paste block>
#### Poll 4 (T+120s) — `<timestamp>` — <paste block>
#### Poll 5 (T+150s) — `<timestamp>` — <paste block>
#### Poll 6 (T+180s) — `<timestamp>` — <paste block>
#### Poll 7 (T+210s) — `<timestamp>` — <paste block>
#### Poll 8 (T+240s) — `<timestamp>` — <paste block>
#### Poll 9 (T+270s) — `<timestamp>` — <paste block>

**HARD FAIL trigger:** If any poll status is `502` or `503`, operator immediately runs Plan 03 Task 1 `bash scripts/kill-switch.sh revert` and records `[<timestamp>] !!! HARD FAIL — <code> observed. TRIGGERING ROLLBACK via kill switch. !!!` — Phase 52 stops.

### T+5min verification

```
[<timestamp>] $ dig @1.1.1.1 +short nextlevelmock.com A
<paste — expect stable Cloudflare edge IP (apex is proxied)>

[<timestamp>] $ curl -sfI https://nextlevelmock.com/api/health | head -5
<expect: HTTP/2 200 + "server: Google Frontend" (prod Cloud Run), NOT v0.1 nginx signature>

[<timestamp>] $ curl -sfS -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/dns_records?type=A&name=nextlevelmock.com" | jq -r '.result[0].content'
<expect: PROD_CLOUDRUN_LB_IP>

[<timestamp>] $ dig @1.1.1.1 +short www.nextlevelmock.com A
<expect: UNCHANGED from baseline — prod LB IP>

[<timestamp>] $ dig @1.1.1.1 +short legacy.nextlevelmock.com A
<expect: UNCHANGED from baseline — v0.1 GCE IP>
```

**Cutover outcome:** `<CUTOVER GREEN | ROLLBACK TRIGGERED at poll N>`

<!-- ─────────────────────────────────────────────────────────────────────── -->
<!-- Plan 03 writes below: ## Kill Switch Rehearsal (T+30min) + ## Legacy Uptime Check Provisioning -->
<!-- ─────────────────────────────────────────────────────────────────────── -->

## Kill Switch Rehearsal (T+30min)

**Rationale (D-10):** Rehearsal during live window is intentional — users hitting `nextlevelmock.com` during the 60s revert window land on v0.1, which is still serving correctly. No data loss.

### Pre-rehearsal snapshot

```
[<timestamp>] $ bash scripts/kill-switch.sh status
<paste JSON — expect content=PROD_CLOUDRUN_LB_IP>
```

### REVERT to v0.1

```
[<timestamp>] $ bash scripts/kill-switch.sh revert
<paste — expect "reverted to v0.1" + JSON with content=V01_GCE_IP>
```

### Wait 60s + verify revert propagated

```
[<timestamp>] $ sleep 60
[<timestamp>] $ dig @1.1.1.1 +short nextlevelmock.com A
<paste — Cloudflare edge IP, but cross-check via CF API content>

[<timestamp>] $ curl -sI https://nextlevelmock.com/api/health | head -5
<expect: v0.1 server signature (nginx/Docker), NOT Google Frontend>
```

### RESTORE to prod Cloud Run (T-52-05 — MUST leave prod as end state)

```
[<timestamp>] $ bash scripts/kill-switch.sh restore
<paste — expect "restored to prod Cloud Run" + JSON with content=PROD_CLOUDRUN_LB_IP>
```

### Wait 60s + verify restore

```
[<timestamp>] $ sleep 60
[<timestamp>] $ dig @1.1.1.1 +short nextlevelmock.com A
<paste>

[<timestamp>] $ curl -sI https://nextlevelmock.com/api/health | head -5
<expect: Google Frontend — prod Cloud Run>
```

### Reconcile Terraform state

```
[<timestamp>] $ terraform -chdir=iac/cloudrun refresh -var-file=prod.tfvars
<paste output>

[<timestamp>] $ terraform -chdir=iac/cloudrun state show cloudflare_record.apex[0] | grep value
<expect: value = "<PROD_CLOUDRUN_LB_IP>">
```

**Rehearsal outcome:** `<REHEARSAL GREEN | FAILED — escalate>`
**End state:** apex A → `<PROD_CLOUDRUN_LB_IP>` (T-52-05 mitigation confirmed).

## Legacy Uptime Check Provisioning

```
[<timestamp>] $ cd iac/cloudrun && terraform plan -var-file=prod.tfvars \
    -target=google_monitoring_uptime_check_config.legacy \
    -target=google_monitoring_alert_policy.legacy_uptime \
    -out=legacy-uptime.tfplan
<expect: Plan: 2 to add, 0 to change, 0 to destroy>

[<timestamp>] $ terraform apply legacy-uptime.tfplan
<paste — expect "Apply complete! Resources: 2 added, 0 changed, 0 destroyed.">

[<timestamp>] $ gcloud monitoring uptime list --project=nlm-prod --format='table(displayName,monitoredResource.labels.host)'
<paste — expect row for legacy.nextlevelmock.com>
```

<!-- ─────────────────────────────────────────────────────────────────────── -->
<!-- Plan 04 writes below: ## Post-Cutover Smokes (T+60min) + ### Pre-Cutover Session Continuity -->
<!-- ─────────────────────────────────────────────────────────────────────── -->

## Post-Cutover Smokes (T+60min)

### D-15 Abuse Test (prod)

```
[<timestamp>] $ BASE_URL=https://nextlevelmock.com npx tsx scripts/abuse-test-all.ts
<paste full output — PASS criterion: zero 200s on unauthenticated protected routes; same denylist as Phase 49 HARD-02>
```

### D-16 k6 Light Probe (10 VU / 2 min)

```
[<timestamp>] $ k6 run -e TARGET=https://nextlevelmock.com -e VUS=10 -e DURATION=2m \
    --summary-export=/tmp/k6-prod-light.json loadtest/baseline.js
<paste k6 summary>

[<timestamp>] $ jq '{http_req_failed: .metrics.http_req_failed.values.rate, p95: .metrics.http_req_duration.values["p(95)"]}' /tmp/k6-prod-light.json
<expect: http_req_failed < 0.01 (1%); p95 within Phase 49 baseline envelope (baseline p95 * 1.20 ceiling)>
```

### D-17a Trainer Login Smoke

```
[<timestamp>] Operator manual browser test:
  1. Navigate to https://nextlevelmock.com/signin
  2. Trainer tab → login with seeded trainer account
  3. Land on /trainer
  4. Confirm roster table renders (empty expected per D-17 — Supabase prod wiped in Phase 46)

Result: <pass (empty roster) | pass (N rows) | fail: <reason>>
```

### D-17b Public Interview End-to-End

```
[<timestamp>] $ START=$(curl -sf -X POST https://nextlevelmock.com/api/public/interview/start \
    -H 'Content-Type: application/json' \
    -d '{"repo":"nextlevelmock/question-banks","techs":[{"name":"JavaScript","weight":3}],"questionCount":2}')
[<timestamp>] $ SMOKE_SID=$(echo "$START" | jq -r .sessionId)
[<timestamp>] start -> sessionId=<paste>
<paste full JSON>

[<timestamp>] $ # tick agent q1
<paste agent q1 response>

[<timestamp>] $ # tick agent q2
<paste agent q2 response>

[<timestamp>] $ # complete
<paste complete response — expect 200 + report object>
```

### Pre-Cutover Session Continuity (D-06/D-07)

```
[<timestamp>] pre-cutover session ID: <pull from "## Pre-Cutover Baseline" above>

[<timestamp>] $ curl -s -o /tmp/pre.body -w '%{http_code}' -X POST \
    https://nextlevelmock.com/api/public/interview/complete \
    -H 'Content-Type: application/json' \
    -d "{\"sessionId\":\"<PRE_SID>\"}"
<paste status code>
<paste response body>
```

**Outcome classification (per D-07):**
- `2xx` → pre-cutover session completed successfully — **SUNSET-01 continuity bonus proof** (documented SUCCESS).
- `4xx` → pre-cutover session 4xx — expected per D-07 (DNS propagation captured client before session end; NOT a failure).
- `5xx` → **HARD FAIL** per success criterion (a) "no 502/503 during cutover window". ESCALATE.

**Classification:** `<2xx | 4xx | 5xx>` → `<OUTCOME disposition>`

## Sunset Window Tracker

Per `.planning/DEPLOY.md` §Sunset Window (added Phase 52 D-12):

| Window | Days | Gate | Status |
|--------|------|------|--------|
| Build | Day 0-14 | Phases 47-49 complete (SUNSET-01) | `<OPEN | CLOSED>` |
| Cutover | Day 15-21 | Phase 52 complete + cutover log committed (SUNSET-02) | `<OPEN | CLOSED>` |
| Warm | Day 22-45 | v0.1 untouched + legacy uptime green | `<OPEN | CLOSED>` |
| Decommission gate | Day 45 | Phase 53 triggers teardown (SUNSET-03) | `<OPEN | CLOSED>` |

---

**Final cutover log outcome (populate at phase close):**
- Preflight: `<ALL GREEN | FAIL>`
- Cutover window (T-0 to T+5min): `<GREEN | ROLLBACK>`
- Kill-switch rehearsal: `<GREEN | FAILED>`
- Post-cutover smokes: `<ALL 4 PASS | N FAIL>`
- Pre-cutover session outcome: `<2xx | 4xx | 5xx>`
- Phase 52 gate (`bash scripts/verify-phase-52.sh`): `<PASS | FAIL>`
