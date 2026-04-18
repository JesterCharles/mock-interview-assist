# Coding Stack Runbook

**Scope:** Next Level Mock coding-challenges deployment (v1.4 MSA).
**Owner:** Solo operator (trainer-developer).
**Last reviewed:** 2026-04-18 (Phase 43 initial publication).
**Read time:** ~10 min end-to-end.

***

## 1. Architecture Overview

Two GCE VMs, same VPC, same subnet:

```
                 Internet
                    │
                    │ (public IP, port 80 → container 3000)
                    ▼
            ┌──────────────────┐
            │  app VM          │  docker compose: interview-assistant
            │  (imported)      │  image: gcr.io/$PROJECT/app:$TAG
            └────────┬─────────┘
                     │ internal IP → 10.x.x.x
                     │ firewall: allow-judge0-from-app
                     │            (source=app IP/32, dst:2358)
                     ▼
            ┌──────────────────┐
            │  judge0 VM       │  docker compose: judge0-server, workers,
            │  (no public IP)  │                  postgres, redis
            │                  │  image: judge0/api:$JUDGE0_IMAGE_TAG (≥1.13.1)
            │                  │  + attached PD: judge0-data (100 GB)
            │                  │  + systemd timer: push-judge0-metrics every 60s
            └──────────────────┘
                     │
                     ▼
           GCE Logs Explorer (log name: judge0-metrics)
                     │
                     ▼
           Alert: queueDepth>50/5min | p95Ms>15000/5min
```

- **App VM** — serves public traffic; speaks to Judge0 over internal VPC only.
- **Judge0 VM** — no public IP; ingress restricted to app VM internal IP via
  firewall `allow-judge0-from-app`; persistent disk survives VM restart.
- **Terraform state** — GCS bucket `${PROJECT_ID}-tfstate` (versioned).
- **CI/CD** — GitHub Actions: `pr-checks.yml` gates merges; `deploy-app.yml`
  on `app-v*`; `deploy-judge0.yml` on `judge0-v*`.

**Why two VMs?** Judge0 workloads are bursty CPU-bound (sandboxed code
execution). Co-locating on the app VM starves the Next.js server. A dedicated
Judge0 host lets the app VM stay responsive during submission spikes. See
`.planning/PIPELINE-DISCOVER.md` §Approach B for full rationale.

**Sizing — committed values (Phase 38 spike):**

| Resource | Variable | Default | Source |
|----------|----------|---------|--------|
| Judge0 VM | `judge0_machine_type` | `n1-standard-2` | Phase 38 spike report (`38-SPIKE-REPORT.md`) — PARTIAL PASS; re-verify on prod VM per §2 checklist |
| Judge0 data disk | `judge0_data_disk_size_gb` | 100 GB | D-04 |
| App VM | `app_vm_machine_type` | matches live (import-only) | — |

***

## 2. Judge0 Patching Cadence

**Purpose:** Keep Judge0 at a CVE-free version. Sandbox escapes in Judge0
historically leak user code + host access (GHSA-q7vg-26pg-v5hr affected
< 1.13.0).

**Cadence:**

- **Monthly:** Review https://github.com/judge0/judge0/security/advisories on
  the first business day of every month. Log review in this file under
  "Review Log" (append-only).
- **Within 48h of a CVE:** Patch Judge0 to the fixed version. Non-negotiable SLA.
- **Quarterly:** Review Judge0 release notes for non-security minor version
  upgrades; test on a local docker-compose before tagging `judge0-v<NEW>`.

**Procedure to upgrade Judge0:**

1. Verify target version ≥ 1.13.1 (floor per JUDGE-01):
   ```bash
   curl -s https://api.github.com/repos/judge0/judge0/releases/latest | jq -r .tag_name
   ```

2. Test locally:
   ```bash
   # Edit docker-compose.yml to point judge0 services at the new tag
   docker compose pull
   docker compose up -d
   curl -H "X-Auth-Token: $JUDGE0_AUTH_TOKEN" http://localhost:2358/system_info
   ```

3. Tag and push:
   ```bash
   git tag judge0-v1.13.2
   git push origin judge0-v1.13.2
   ```

4. GitHub Actions `deploy-judge0.yml` runs: SSH → update `~/judge0/.env`
   `JUDGE0_IMAGE_TAG=1.13.2` → `docker compose pull && up -d` → probe
   `/system_info` → rollback on fail.

5. Confirm:
   ```bash
   gcloud logging read 'logName="projects/${PROJECT}/logs/judge0-metrics"' \
     --limit=3 --format=json
   # Expect jsonPayload.judge0Version == "1.13.2" and status == "ok"
   ```

**Estimated time:** 15 min local test + 10 min workflow run = ~25 min total.

**Phase 38 spike re-verify (MUST complete before first production submission):**

The Phase 38 spike was PARTIAL PASS — sandbox execution could not be verified
on the arm64 dev host. Run the full checklist on the prod Judge0 VM before
declaring v1.4 live:

- [ ] `docker compose up` — all 4 services healthy
- [ ] POST 10 mixed-language submissions concurrently (spike fixtures from
      `.planning/phases/38-judge0-infrastructure/`)
- [ ] 30/30 correct verdicts across 3 runs (D-19)
- [ ] Wall clock ≤ 30 sec per run
- [ ] `docker stats` peak CPU ≤ 80% of limit per container
- [ ] `docker stats` peak RAM ≤ 80% of limit per container
- [ ] Commit final `deploy.resources.limits` values to docker-compose on the VM
- [ ] Update `.planning/PROJECT.md` "Committed Resource Sizing" subsection
- [ ] Append result to Review Log below

**Review Log:**
- _(append monthly entries: `YYYY-MM-DD — advisories reviewed — no action | patched to vX.Y.Z`)_

***

## 3. Scale-Up Procedure

**Purpose:** Increase Judge0 capacity when queue depth or latency alerts fire
sustainably.

**Decision tree:**
- Queue > 50 sustained + p95 > 10 sec → scale up (more CPU)
- Disk > 80% full → resize data disk
- p95 spike without queue buildup → investigate Judge0 workers, not capacity

**Procedure:**

1. Confirm the signal (don't scale on a single spike):
   ```bash
   gcloud logging read 'logName="projects/${PROJECT}/logs/judge0-metrics" AND jsonPayload.queueDepth>50' \
     --freshness=1h --limit=30 \
     --format="value(jsonPayload.timestamp,jsonPayload.queueDepth,jsonPayload.p95Ms)"
   ```
   If ≥ 10 entries in 30 min window, proceed.

2. Edit `infra/terraform/variables.tf`:
   ```hcl
   variable "judge0_machine_type" {
     default = "n1-standard-4"   # was n1-standard-2
   }
   ```
   Or for disk:
   ```hcl
   variable "judge0_data_disk_size_gb" {
     default = 200               # was 100
   }
   ```

3. Plan + apply:
   ```bash
   cd infra/terraform
   terraform plan    # machine_type: in-place update (stop/start). disk: resize only.
   terraform apply
   ```

4. **Machine type change is disruptive** — VM stops/starts (~60 sec downtime).
   During this window, `/api/coding/submit` returns 503. If this is
   unacceptable, coordinate a brief maintenance window.

5. **Disk resize is non-disruptive on GCE** — Terraform resizes the disk; then
   SSH and extend the filesystem:
   ```bash
   gcloud compute ssh $JUDGE0_VM_NAME --zone=$JUDGE0_VM_ZONE \
     --command="sudo resize2fs /dev/disk/by-id/google-judge0-data"
   ```

6. Verify Judge0 still serves:
   ```bash
   gcloud compute ssh $JUDGE0_VM_NAME --zone=$JUDGE0_VM_ZONE \
     --command="curl -s -H 'X-Auth-Token: $JUDGE0_AUTH_TOKEN' http://localhost:2358/system_info | jq .version"
   ```

**Estimated time:** 10 min (disk resize), 15 min (machine type upgrade
including downtime).

**Do NOT** increase Judge0 worker count past `2 × vCPU` without re-running a
Phase 38-style spike. Oversubscribing workers causes queue thrashing, not
capacity.

***

## 4. Abuse Response Playbook

**Purpose:** Contain coordinated submission abuse (fork bombs, crypto-mining
attempts, output flooding, enumeration of hidden tests).

**Triage (first 5 min):**

1. Identify the offender — which associate slug is submitting?
   ```bash
   gcloud logging read 'resource.type="gce_instance" AND logName=~"interview-assistant" AND textPayload=~"POST /api/coding/submit"' \
     --freshness=30m --limit=100 \
     --format="value(timestamp,httpRequest.remoteIp,jsonPayload.associateSlug)"
   ```

2. Check current rate (should be ≤ 30/hr per user per `CODING-API-04`):
   - If the server-side rate limit is holding: no action needed; let it
     reject. Monitor for escalation.
   - If rate limit is being bypassed (e.g. multiple associates colluding):
     proceed to step 3.

**Containment (15 min):**

3. **Tighten rate limit via env override** (no redeploy needed — reads on boot):
   ```bash
   gcloud compute ssh $APP_VM_NAME --zone=$APP_VM_ZONE \
     --command="cd ~/app && sed -i 's/^CODING_RATE_LIMIT_PER_HOUR=.*/CODING_RATE_LIMIT_PER_HOUR=5/' .env.docker && docker compose up -d --no-deps interview-assistant"
   ```

4. **Block a specific associate** — disable their Supabase auth token:
   ```
   Via Supabase dashboard → Auth → Users → find by email → "Ban user"
   ```

5. **Nuclear — spin down Judge0 temporarily:**
   ```bash
   gcloud compute instances stop $JUDGE0_VM_NAME --zone=$JUDGE0_VM_ZONE
   ```
   The app responds 503 on `/api/coding/submit` until restarted. Do this when
   abuse would corrupt other associates' data (hidden test enumeration,
   workspace leakage).

**Recovery:**

6. Restart Judge0:
   ```bash
   gcloud compute instances start $JUDGE0_VM_NAME --zone=$JUDGE0_VM_ZONE
   # Wait ~60 sec for docker compose to come back up
   gcloud compute ssh $JUDGE0_VM_NAME --zone=$JUDGE0_VM_ZONE \
     --command="curl -s -H 'X-Auth-Token: $JUDGE0_AUTH_TOKEN' http://localhost:2358/system_info"
   ```

7. Reset rate limits to defaults; document the incident in
   `.planning/RETROSPECTIVE.md`.

**Estimated time:** 5 min triage + 15 min containment + 10 min recovery =
~30 min for typical incident.

**Sandbox guarantees you rely on (Phase 38):**

- `enable_network=false` — Judge0 submissions cannot egress
- cgroup CPU + memory caps — fork bombs starve without host impact
- `runtime: runc` — no privileged containers

If any of the above is not in effect, STOP abuse response and re-harden per
Phase 38 config.

***

## 5. Queue-Death Recovery

**Purpose:** Recover when Judge0 submissions hang in "In Queue" forever
(status_id=1) without progressing to "Processing" (status_id=2).

**Symptoms:**

- `queueDepth` climbing steadily on Logs Explorer with no drain
- Associate UI shows submissions stuck at "queued"
- `/api/coding/attempts/[id]` returns `pending` past normal verdict window
  (> 60s)

**Tiered recovery (escalate only if lower tier fails):**

**Tier 1 — Worker restart (2 min)**

```bash
gcloud compute ssh $JUDGE0_VM_NAME --zone=$JUDGE0_VM_ZONE \
  --command="cd ~/judge0 && docker compose restart judge0-workers"
```

Wait 30 sec. Check:

```bash
gcloud compute ssh $JUDGE0_VM_NAME --zone=$JUDGE0_VM_ZONE \
  --command="curl -s -H 'X-Auth-Token: $JUDGE0_AUTH_TOKEN' 'http://localhost:2358/submissions?per_page=5&fields=status_id,time' | jq '.submissions[] | .status_id'"
```

Expect status_id values > 2 within 60 sec. If still stuck → Tier 2.

**Tier 2 — Full stack restart (5 min)**

```bash
gcloud compute ssh $JUDGE0_VM_NAME --zone=$JUDGE0_VM_ZONE \
  --command="cd ~/judge0 && docker compose restart"
```

Preserves persistent disk data. Redis queue is rebuilt from Judge0 server
state on restart.

If still stuck → Tier 3.

**Tier 3 — Nuclear: recreate Judge0 VM via Terraform (20 min)**

Persistent disk survives; VM is recreated and re-attaches the disk.

```bash
cd infra/terraform
terraform taint google_compute_instance.judge0
terraform apply
```

After recreation, SSH in and re-bootstrap the Judge0 compose file (should be
baked into the VM image if using an image-based bootstrap; else re-run install
script per `infra/terraform/README.md`).

```bash
gcloud compute ssh $JUDGE0_VM_NAME --zone=$JUDGE0_VM_ZONE \
  --command="cd ~/judge0 && docker compose up -d"
```

Verify `/system_info` responds and queue drains.

**Estimated time:** Tier 1: 2 min. Tier 2: 5 min. Tier 3: 20 min (includes
~3 min VM provision + ~5 min Judge0 startup + verification).

**Post-mortem required if Tier 3 triggered.** Append incident to
`.planning/RETROSPECTIVE.md`.

***

## 6. Ops Checklist

### Daily (5 min)

- [ ] Check Logs Explorer for `jsonPayload.status == "unreachable"` entries in
      last 24h
- [ ] Verify `queueDepth` has been ≤ 10 during business hours
- [ ] Scan `/api/health` response (automated via deploy workflows; manual only
      if no deploy that day)

### Weekly (15 min)

- [ ] Review `p95Ms` trend — should be < 5000 under normal load
- [ ] Check GCR for image tags older than 90 days; delete pre-release/test tags
- [ ] Verify Terraform state bucket still has versioning enabled:
  ```bash
  gcloud storage buckets describe gs://${PROJECT_ID}-tfstate \
    --format='value(versioning.enabled)'
  ```
- [ ] Rotate local `.tfvars` if shared with anyone (shouldn't be — solo dev)

### Monthly (30 min)

- [ ] Review Judge0 GHSA advisories (§2 above)
- [ ] Audit GitHub Actions secrets — confirm each one still needed; rotate SSH
      keys if in doubt
- [ ] Review `AuthEvent` table for auth abuse patterns (v1.2 infrastructure)
- [ ] Run `gcloud compute instances describe` on both VMs — verify no
      unexpected metadata / SSH keys added outside Terraform
- [ ] Snapshot Judge0 persistent disk for disaster recovery:
  ```bash
  gcloud compute disks snapshot ${JUDGE0_VM_NAME}-data \
    --zone=$JUDGE0_VM_ZONE \
    --snapshot-names=judge0-data-$(date +%Y%m%d)
  ```

### Quarterly (1 hour)

- [ ] Review Phase 38 sizing — re-run spike if cohort count has doubled
- [ ] Update `infra/terraform/variables.tf` defaults if spike warrants
- [ ] Review runbook — append to Review Log with date + changes

***

## Appendix A: GitHub Actions Secrets Setup

One-time setup after Plan 43-01 `terraform apply` completes.

Navigate to: repo → Settings → Secrets and variables → Actions → New
repository secret.

| Secret | Source |
|--------|--------|
| `GCP_SA_KEY` | `gcloud iam service-accounts keys create key.json --iam-account=github-deploy@${PROJECT}.iam.gserviceaccount.com` then paste contents |
| `GCP_PROJECT_ID` | Project id |
| `APP_VM_NAME` | `terraform output app_vm_name` (or matches `var.app_vm_name`) |
| `APP_VM_ZONE` | Same zone used in `variables.tf` |
| `APP_VM_SSH_KEY` | Private key whose public half is in OS Login for the app VM |
| `JUDGE0_VM_NAME` | `terraform output -raw judge0_vm_name` (default `nlm-judge0-prod`) |
| `JUDGE0_VM_ZONE` | Same zone as Judge0 VM |
| `JUDGE0_VM_SSH_KEY` | Private key in OS Login for Judge0 VM |
| `JUDGE0_AUTH_TOKEN` | Matches Judge0 server config set in Phase 38 |

**Rotation:** Re-generate the `GCP_SA_KEY` JSON quarterly. Update the secret;
delete the old key.

**Branch protection:** Settings → Branches → Protect `main` → require status
check `checks` (from `pr-checks.yml`) before merge. This is a manual step
outside Terraform.

***

## Appendix B: Metrics Pusher Installation

Installing `scripts/push-judge0-metrics.mjs` on the Judge0 VM.

1. Copy script to VM:
   ```bash
   gcloud compute scp scripts/push-judge0-metrics.mjs \
     $JUDGE0_VM_NAME:/opt/nlm/push-judge0-metrics.mjs \
     --zone=$JUDGE0_VM_ZONE
   ```

2. Create env file `/etc/judge0/metrics.env` (permissions 0600, root-owned):
   ```
   JUDGE0_URL=http://localhost:2358
   JUDGE0_AUTH_TOKEN=<same as Phase 38 server config>
   GCP_LOG_NAME=judge0-metrics
   ```

3. systemd unit `/etc/systemd/system/judge0-metrics.service`:
   ```ini
   [Unit]
   Description=Push Judge0 metrics to GCE Logs Explorer
   After=docker.service

   [Service]
   Type=oneshot
   EnvironmentFile=/etc/judge0/metrics.env
   ExecStart=/usr/bin/node /opt/nlm/push-judge0-metrics.mjs
   ```

4. systemd timer `/etc/systemd/system/judge0-metrics.timer`:
   ```ini
   [Unit]
   Description=Push Judge0 metrics every 60 seconds

   [Timer]
   OnBootSec=30s
   OnUnitActiveSec=60s
   AccuracySec=5s

   [Install]
   WantedBy=timers.target
   ```

5. Enable + start:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable --now judge0-metrics.timer
   ```

6. Verify within 2 min:
   ```bash
   gcloud logging read 'logName="projects/${PROJECT}/logs/judge0-metrics"' \
     --limit=2 --format=json
   ```

**Alert setup** (GCE console — out of Terraform scope, D-12):

Navigate: Logs Explorer → Create Alert.

- Query 1 (queue depth):
  ```
  logName="projects/${PROJECT}/logs/judge0-metrics"
  jsonPayload.queueDepth > 50
  ```
  Trigger: 5+ matches in 5 min.

- Query 2 (p95 latency):
  ```
  logName="projects/${PROJECT}/logs/judge0-metrics"
  jsonPayload.p95Ms > 15000
  ```
  Trigger: 5+ matches in 5 min.

- Query 3 (unreachable):
  ```
  logName="projects/${PROJECT}/logs/judge0-metrics"
  jsonPayload.status = "unreachable"
  ```
  Trigger: 2+ matches in 5 min.

Notify: email + optional Slack/PagerDuty integration (user choice — not in
Terraform scope per D-12 / Claude's Discretion in CONTEXT.md).

***

## Appendix C: Deferred to v1.5

- **Staging/prod split** (backlog 999.1) — this runbook assumes prod-only
- **Canary/rolling deploys** — current pattern is brief `docker compose up -d` blink
- **Multi-region** — single us-central1 deployment
- **Workload Identity Federation** — current auth uses GCP_SA_KEY JSON in
  GitHub secrets

***

*Last modified: 2026-04-18 (Phase 43 initial publication).*
*Owner: NLM operator (solo).*
*Source plans: `.planning/phases/43-msa-deployment/43-0{1,2,3}-PLAN.md`.*
