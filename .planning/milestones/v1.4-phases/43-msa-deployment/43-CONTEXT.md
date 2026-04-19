# Phase 43: MSA Deployment (Terraform + CI/CD) - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning
**Mode:** `--auto`

<domain>
## Phase Boundary

Provision dedicated Judge0 GCE host via Terraform (sized per Phase 38 spike), deploy app + Judge0 as independent GitHub Actions workflows on tag push with health checks + auto-rollback, emit Judge0 queue-depth + latency metrics to Logs Explorer, publish the operations runbook.

**In scope:**
- Terraform module under `infra/terraform/` — dedicated Judge0 GCE VM, networking, firewall (Judge0 port reachable only from app VM), IAM service account, persistent disk for Judge0 Postgres data
- Terraform state storage: GCS bucket with versioning (single env: prod; staging split deferred to v1.5 per backlog 999.1)
- GitHub Actions workflows:
  - `.github/workflows/deploy-app.yml` — tag push `app-v*` triggers app-only build + deploy (existing-style SSH + docker compose to the app VM)
  - `.github/workflows/deploy-judge0.yml` — tag push `judge0-v*` triggers Judge0 compose pull + up on the dedicated Judge0 VM
  - `.github/workflows/pr-checks.yml` (if not present) — build + test + lint on PR
- Health check + rollback: both deploy workflows probe `/api/health` post-deploy; on failure, SSH-restore previous image tag; fail workflow loudly
- Metrics: lightweight Node script (or Judge0 Prometheus export) pushes queue depth + submission latency p50/p95 to GCE Logs Explorer every 60 sec via `gcloud logging write`
- Runbook: `docs/runbooks/coding-stack.md` — Judge0 patching cadence, scale-up procedure, abuse response playbook, recovery from queue-death

**Out of scope:**
- Staging/prod split → v1.5 (backlog 999.1)
- Autoscaling → v1.5+
- Multi-region → v2.0
- Kubernetes migration — never planned; VM is the target deployment

</domain>

<decisions>
## Implementation Decisions

### Terraform Topology (locked)
- **D-01:** Two-VM topology: existing app VM (unchanged in this phase) + new dedicated Judge0 VM. Separate boot disks. Separate firewall rules.
- **D-02:** Judge0 VM sizing: driven by Phase 38 spike report (`.planning/phases/38-judge0-infrastructure/38-SPIKE-REPORT.md`). If spike committed `n1-standard-4`, Terraform matches exactly. This phase MUST NOT resize without a follow-up spike.
- **D-03:** Networking: both VMs in same VPC, same subnet. Judge0 port 2358 firewall rule: allow ingress ONLY from app VM's internal IP. No public ingress.
- **D-04:** Judge0 Postgres data: attached persistent disk (100 GB, pd-standard) — survives VM restarts. Redis stays in-memory (ephemeral — queue state rebuilt from Judge0 server).

### Terraform Module Structure (locked)
- **D-05:** `infra/terraform/` layout:
  - `main.tf` — providers, remote state backend
  - `variables.tf` — project id, region, machine types, disk sizes, image tags
  - `vpc.tf` — shared VPC (or reference existing)
  - `app-vm.tf` — IMPORT existing app VM as resource (terraform import; don't destroy-recreate)
  - `judge0-vm.tf` — new Judge0 VM
  - `firewall.tf` — internal-only Judge0 rule
  - `service-accounts.tf` — least-privilege SA for metrics push
  - `outputs.tf` — VM internal IPs exposed to GitHub Actions workflow via secret manager
- **D-06:** State backend: GCS bucket `${PROJECT_ID}-tfstate` with versioning + object retention. Terraform lock via GCS object.

### CI/CD Shape (locked)
- **D-07:** App deploy workflow triggers on tag push matching `app-v*`. Steps: build Docker image → push to `gcr.io/${PROJECT}/app:$TAG` → SSH to app VM → `docker pull` + `docker compose up -d --no-deps interview-assistant` → probe `/api/health` → on fail, SSH rollback (`docker tag app:${PREV} app:latest; docker compose up -d --no-deps interview-assistant`).
- **D-08:** Judge0 deploy workflow triggers on `judge0-v*`. Steps: SSH to Judge0 VM → pull pinned Judge0 image tag → `docker compose up -d` (judge0 compose on that VM) → probe `/system_info` → rollback on fail by re-pinning previous tag.
- **D-09:** Secrets in GitHub Actions: `GCP_SA_KEY` (service account JSON), `APP_VM_SSH_KEY`, `JUDGE0_VM_SSH_KEY`, `JUDGE0_AUTH_TOKEN`. All in repo secrets + optionally rotated via Secret Manager sync script (documented but not automated in v1.4).
- **D-10:** PR checks workflow: `npm ci → npx tsc --noEmit → npm run lint → npm run test → npm run build`. Separate from deploy workflows.

### Monitoring (locked per IAC-04)
- **D-11:** Metrics pusher: small Node script `scripts/push-judge0-metrics.mjs` running via cron on Judge0 VM (every 60 sec). Fetches `/system_info` + queue endpoint, emits structured logs via `gcloud logging write judge0-metrics '{"queueDepth":N,"p50":ms,"p95":ms}'`.
- **D-12:** Alert thresholds documented in runbook (D-13) — queue depth > 50 for 5 min OR p95 > 15 sec for 5 min triggers ops attention. Alerts themselves configured in GCE console (out of Terraform scope for v1.4).

### Runbook (locked per IAC-05)
- **D-13:** `docs/runbooks/coding-stack.md` sections:
  1. Architecture overview (ASCII diagram)
  2. Judge0 patching cadence (check GHSA advisories monthly; patch within 48h of CVE)
  3. Scale-up procedure (edit `variables.tf` → `terraform apply` → confirm no downtime)
  4. Abuse response (rate-limit override via env → if severe, spin down Judge0 VM temporarily)
  5. Recovery from queue-death (restart judge0-workers → if persistent, restart judge0-server → nuclear: recreate VM via Terraform)
  6. Daily/weekly/monthly ops checklist

### Claude's Discretion
- VM image base (Debian 12 vs COS) — Debian 12 recommended (familiar, docker compose works cleanly)
- Whether to use a Docker-Compose-on-VM pattern or COS + systemd unit — stick with docker compose (matches app VM)
- Alert channel integration — PagerDuty vs email vs Slack — out of scope for Terraform, noted in runbook

### Folded Todos
- **DEPLOY-01/02/03 backlog items** — Discovery folded these into Phase 43 IAC-NN scope. Cross-check during planning.

</decisions>

<canonical_refs>
## Canonical References

### Milestone-level
- `.planning/REQUIREMENTS.md` §IAC-01..05
- `.planning/ROADMAP.md` §Phase 43
- `.planning/PIPELINE-DISCOVER.md` §Approach B — MSA rationale; §Distribution Plan
- `.planning/phases/38-judge0-infrastructure/38-SPIKE-REPORT.md` — authoritative VM sizing
- `.planning/PROJECT.md` — v1.4 active; DEPLOY-01/02/03 folded into IAC scope
- `docs/gce-deployment-guide.md` (if exists) — existing manual deploy notes to formalize

### External
- Terraform Google provider: https://registry.terraform.io/providers/hashicorp/google/latest/docs
- GCE `n1-standard-4` pricing & specs (reference for spike output)
- Judge0 production best practices

### Existing code
- `.github/workflows/` — existing workflows (if any) to harmonize or extend
- `Dockerfile` — app image; unchanged
- `docker-compose.yml` — local dev; production uses same compose on app VM

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Existing manual-deploy pattern (SSH + docker compose) — formalize as workflow
- Existing `/api/health` route — deploy probe target

### Established Patterns
- Docker-compose on VM deploy (documented in CLAUDE.md "Docker: `docker compose up`")
- Env files (`.env.docker`) passed through — formalize in workflow via Secret Manager or GitHub secrets

### Integration Points
- Phase 38 spike report → Phase 43 Terraform VM sizing
- Phase 39 `/api/health` probe → deploy workflow rollback trigger
- Phase 44 load test runs AGAINST this deployed stack (not against local)

### Known Constraints
- Single-environment in v1.4 (prod only). Staging split deferred (backlog 999.1)
- No managed instance groups / autoscalers (VM-only)
- Terraform state must be stored remotely (GCS) — local state is a foot-gun

</code_context>

<specifics>
## Specific Ideas

- Discovery §Approach B rationale: "Establishes deploy automation (carryover from DEPLOY-01/02/03 backlog) as part of meaningful product work" — Phase 43 absorbs those.
- IAC-03 "failed health check auto-reverts to previous image" — D-07 + D-08 mechanism
- Discovery §Distribution Plan enumerates what this phase delivers

</specifics>

<deferred>
## Deferred Ideas

- **Staging environment** — backlog 999.1; v1.5
- **Autoscaling Judge0 workers** — v1.5+
- **Canary deployments** — v1.5
- **Multi-region failover** — v2.0
- **Zero-downtime rolling deploys via MIG** — v1.5+ (current pattern is brief `docker compose up -d` blink)

### Reviewed Todos (not folded)
- **DEPLOY-01/02/03** — EXPLICITLY FOLDED into this phase per discovery decision

</deferred>

---

*Phase: 43-msa-deployment*
*Context gathered: 2026-04-18 (auto)*
