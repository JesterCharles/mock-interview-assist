# Requirements: v1.5 — Production Migration (Cloud Run + Supabase Hybrid)

**Milestone:** v1.5
**Defined:** 2026-04-18
**Source:** `.planning/PIPELINE-DISCOVER.md` (discovery brief 2026-04-18, user-approved Approach C — Hybrid)
**Approach:** Migrate NLM app from legacy v0.1 GCE to Cloud Run; keep Supabase (DB + auth) as company-standard, cloud-agnostic. Bake Judge0 integration points for v1.6 drop-in. Estimated 3-4 weeks.
**Core Value carry-over:** Associates get consistent, feedback-rich practice reps that adapt to their weaknesses. v1.5 is the infrastructure milestone that ships four milestones of accumulated capabilities (v1.0-v1.4) to the `nextlevelmock.com` production URL, establishes staging and CI/CD, and produces the load-test baseline that feeds the internal-champion pitch.

---

## Requirements (v1.5 Active)

### Infrastructure — Cloud Run + Networking (INFRA-NN) — Phase 45 / 47

- [x] **INFRA-01**: Terraform module `iac/cloudrun/` provisions two Cloud Run services: `nlm-staging` (in GCP project `nlm-staging-493715`) and `nlm-prod` (in `nlm-prod`) from the same Dockerfile image
- [x] **INFRA-02**: Google Artifact Registry repository per project; GH Actions pushes signed Docker images by digest; Cloud Run pulls by digest only (never `:latest`)
- [x] **INFRA-03**: Google Secret Manager stores all runtime env vars (DATABASE_URL, SUPABASE_*, OPENAI_API_KEY, RESEND_API_KEY, JUDGE0_*, etc.); Cloud Run services mount secrets via env-var binding, not baked into image
- [ ] **INFRA-04**: Cloud Run service config baseline: `min-instances=0` (burn credits, accept cold starts in v1.5), `max-instances=10`, `cpu=1`, `memory=512Mi`, `timeout=300s`, HTTPS-only ingress
- [ ] **INFRA-05**: Google Cloud Load Balancer + managed SSL cert for prod custom domain (`nextlevelmock.com` + `www.nextlevelmock.com` → prod Cloud Run); staging served via `staging.nextlevelmock.com` with its own managed cert
- [x] **INFRA-06**: Terraform state stored in a GCS bucket (versioned, uniform bucket-level access) under a dedicated `nlm-tfstate` project or prefix; no local state
- [x] **INFRA-07**: Dockerfile builds the Next.js standalone output unmodified; no runtime dependencies on host packages beyond Node 22-alpine (Cloud Run base)

### Data — Supabase Env Split + Prisma Migrate (DATA-NN) — Phase 46

- [ ] **DATA-01**: New Supabase staging project provisioned (ref `lzuqbpqmqlvzwebliptj`) with its own anon + service-role keys; recorded in Secret Manager + local `.env.local` for dev; prod Supabase keys live only in prod Secret Manager
- [ ] **DATA-02**: Existing "prod" Supabase (currently holding dirty v1.0-v1.4 dev data) is **wiped** and reserved exclusively for real production users post-cutover; confirmed backup taken before wipe
- [ ] **DATA-03**: Staging Supabase is seeded with demo data via an idempotent seeder script (`scripts/seed-staging.ts`) that can safely re-run; covers associates, cohorts, curriculum weeks, sessions, and coding challenges
- [ ] **DATA-04**: `prisma migrate deploy` runs as a pre-deploy step in both `deploy-staging.yml` and `deploy-prod.yml`; uses `DIRECT_URL` (bypasses pooler) against the target env; fails the deploy on error
- [ ] **DATA-05**: Environment hygiene rule enforced: local `.env` points at staging Supabase only; prod keys live in Secret Manager + are never checked out to developer machines (documented in `CONTRIBUTING.md` or equivalent)
- [ ] **DATA-06**: Supabase Auth redirect URLs updated per env: staging allows `staging.nextlevelmock.com/*` + `localhost:3000/*`; prod allows `nextlevelmock.com/*` only

### CI/CD — GitHub Actions (CI-NN) — Phase 47 / 48 / 51

- [ ] **CI-01**: `pr-checks.yml` runs on pull requests: typecheck (`npx tsc --noEmit`) + lint (`npm run lint`) + unit tests (`npm run test`) + Prisma schema format check; failing gates block merge
- [ ] **CI-02**: `deploy-staging.yml` runs on merges to `main`: build Docker image, push to staging Artifact Registry, run `prisma migrate deploy` against staging Supabase, deploy to staging Cloud Run, run post-deploy smoke check (HTTP 200 on `/api/health`)
- [ ] **CI-03**: `deploy-prod.yml` runs on git tag `v*`: build + push to prod Artifact Registry, run `prisma migrate deploy` against prod Supabase, deploy to prod Cloud Run, run post-deploy smoke check
- [ ] **CI-04**: Workload Identity Federation (OIDC) authenticates GH Actions to GCP — no long-lived service-account JSON keys committed or in secrets
- [ ] **CI-05**: Rollback workflow `rollback-prod.yml` (manual dispatch): pins Cloud Run to the previous revision by digest; documented in runbook
- [ ] **CI-06**: Build cache enabled (Docker layer + npm) so deploy time ≤ 5 minutes under normal conditions

### Observability — Logs + Metrics (OBS-NN) — Phase 48

- [ ] **OBS-01**: Cloud Logging captures structured app logs from Cloud Run; at minimum request logs + error logs are queryable by env
- [ ] **OBS-02**: Cloud Monitoring dashboard `NLM Production` tracks: request count, p50/p95/p99 latency, error rate, instance count, CPU/memory utilization — same dashboard schema deployed for staging
- [ ] **OBS-03**: App exposes a Prometheus-compatible `/api/metrics` endpoint (feature-flagged) so future scrape infrastructure is drop-in; not required to be scraped in v1.5
- [ ] **OBS-04**: Uptime check on `nextlevelmock.com/` (and `/api/health`) posts to email `jestercharles@gmail.com` on failure; configured in Cloud Monitoring

### Load Testing (LOAD-NN) — Phase 49

- [ ] **LOAD-01**: k6 scenario script `loadtest/baseline.js` simulates a mixed interview + public-interview workload at ramp-up 10→50→100 VUs over 10 minutes against staging
- [ ] **LOAD-02**: GH Actions workflow `load-test.yml` (manual dispatch + pre-tag trigger) runs k6 against staging and uploads the JSON report as an artifact
- [ ] **LOAD-03**: Baseline load-test report captures: max concurrent users before p95 > 500ms, cost/1000 requests (from GCP billing extrapolation), CPU+memory ceiling per instance, Supabase query count per user session; committed to `.planning/loadtest-baseline-v1.5.md`

### Hardening — Carried from v1.4 (HARD-NN) — Phase 49

- [ ] **HARD-01**: Live load test (50 concurrent interview sessions) passes against staging with zero 5xx errors and Judge0 facade flag off — subsumed by LOAD-01..03
- [ ] **HARD-02**: Abuse test: unauthenticated + unauthorized access attempts against every `/api/*` route produce 401/403 with no information leakage; documented in `.planning/SECURITY-v1.5.md`
- [ ] **HARD-03**: STRIDE threat model review covers the new Cloud Run deployment + DNS cutover surface; every finding triaged with action or explicit accept; `/cso` skill produces the artifact; `codex adversarial-review` signs off

### DNS + Cutover (DNS-NN) — Phase 51 / 52

- [ ] **DNS-01**: Cloudflare Free Tier on `nextlevelmock.com` manages all DNS; orange-cloud proxy enabled on prod record post-cutover
- [ ] **DNS-02**: DNS records provisioned: `nextlevelmock.com` A/AAAA → prod Cloud Run LB, `staging.nextlevelmock.com` → staging Cloud Run, `legacy.nextlevelmock.com` → v0.1 GCE LB (rollback)
- [ ] **DNS-03**: Cutover runbook `.planning/DEPLOY.md` documents: pre-flight checklist, DNS TTL=300s (5 min) 24h before cutover, step-by-step A-record swap, verification queries (dig, curl, Supabase session), rollback procedure (revert DNS A-record, flush)
- [ ] **DNS-04**: Zero-downtime cutover validated: a session started on v0.1 before the DNS swap completes successfully on the client side with no data loss; acceptable for public-interview users

### Judge0 Integration Points (JUDGE-INTEG-NN) — Phase 50

- [ ] **JUDGE-INTEG-01**: Env vars `JUDGE0_URL`, `JUDGE0_AUTH_TOKEN`, `CODING_CHALLENGES_ENABLED` are plumbed through Secret Manager → Cloud Run; prod default `CODING_CHALLENGES_ENABLED=false` (flag-dark)
- [ ] **JUDGE-INTEG-02**: Every call site of `src/lib/judge0Service.ts` checks the `CODING_CHALLENGES_ENABLED` flag and short-circuits with a user-friendly "coming soon" response when disabled; audit covers `/coding`, `/api/coding/*`, gap-score persistence hooks
- [ ] **JUDGE-INTEG-03**: Terraform stub file `iac/cloudrun/judge0.tf.disabled` documents the v1.6 Judge0 VPC connector + private IP + firewall plan; `.disabled` extension means it is never applied in v1.5 but is ready to enable in v1.6
- [ ] **JUDGE-INTEG-04**: `iac/gce-judge0/` (from v1.4 Phase 43) remains in-tree and is explicitly labeled in its `README.md` as a **v1.6 reference template**, not active infrastructure

### v0.1 Sunset (SUNSET-NN) — Phase 52 / 53

- [ ] **SUNSET-01**: Day 0-14 — v1.5 deployed to `staging.nextlevelmock.com`; end-to-end smoke passes; load-test ran
- [ ] **SUNSET-02**: Day 15-21 — DNS cutover window; `nextlevelmock.com` swaps to prod Cloud Run; v0.1 GCE stays warm behind `legacy.nextlevelmock.com` for 30 days
- [ ] **SUNSET-03**: Day 22-45 — no rollback triggered; v0.1 GCE instances + LB terminated; terraform archived; closing checklist ticked in `.planning/DEPLOY.md`
- [ ] **SUNSET-04**: v0.1 GCE `legacy.nextlevelmock.com` kill switch documented so trainer can revert with a single Cloudflare DNS action if v1.5 prod fails

### Docs + Runbooks (DOCS-NN) — Phase 53

- [ ] **DOCS-01**: `.planning/DEPLOY.md` captures the full deploy flow: GH Actions workflows, secret rotation, rollback, Supabase migration promotion, DNS cutover, v0.1 sunset
- [ ] **DOCS-02**: `CLAUDE.md` updated: deployment section reflects Cloud Run (replaces GCE + Docker Compose), new env vars, new workflow names
- [ ] **DOCS-03**: `README.md` project-overview section updated: "Deployed to Cloud Run on GCP" + link to DEPLOY.md
- [ ] **DOCS-04**: `.planning/SECURITY-v1.5.md` captures STRIDE review findings + mitigations, signed off by codex

### Deferred Reflect + Maintain (META-NN) — Phase 53

- [ ] **META-01**: v1.4 reflect artifact produced (`/pipeline-reflect`) — retro + session notes + seeds saved to second-brain under `projects/nlm/notes/`
- [ ] **META-02**: v1.4 maintain artifact produced (`/pipeline-maintain`) — health 0-10 score + tool updates — before v1.5 ships

---

## Success Criteria (milestone-level)

- [ ] `nextlevelmock.com` serves v1.5 app on Cloud Run in prod; existing public-interview users unaffected by cutover
- [ ] `staging.nextlevelmock.com` serves latest `main` on Cloud Run within 5 minutes of merge
- [ ] Deploy-on-tag pipeline produces signed, immutable Docker images + Cloud Run revisions; rollback possible in one workflow run
- [ ] Single-instance k6 load-test baseline committed: concurrent-user ceiling, p95 latency at ceiling, cost/1000 requests
- [ ] Supabase staging project fully isolated from prod; Prisma migrate deploy promotes schema per env
- [ ] v0.1 GCE decommission runbook in `.planning/DEPLOY.md` with day-45 teardown checklist
- [ ] Judge0 integration points documented + flag-gated off on prod; `judge0.tf.disabled` stub ready for v1.6
- [ ] Pitch-ready walkthrough on prod URL: champion signs in → creates mock interview → completes → sees readiness
- [ ] Zero regression on existing public-interview flow during + after cutover (verified via HARD-01)
- [ ] STRIDE review + abuse test pass against the deployed stack

---

## Future Requirements (Deferred)

- Judge0 self-hosted IaC + `terraform apply` → **v1.6**
- Real Postgres SQL runner (hardened isolated service) → v1.6+
- Modern .NET 8+ runtime (Judge0 ships C# Mono only) → v1.6+ if client demand confirmed
- In-app challenge authoring (PR-based authoring ships faster) → v1.6+
- AWS migration (Supabase stays, Cloud Run → ECS/App Runner later) → post-v1.6 strategic
- Multi-region HA / failover → post-MVP
- Observability stack beyond Cloud Run built-ins (Grafana/Prom self-hosted) → post-MVP
- Backlog 999.1 Staging/Prod Split → **absorbed by v1.5** (split is the milestone)
- Backlog 999.2 Trainer Default Cohort → out of v1.5 scope (feature not infra)

---

## Out of Scope (v1.5 exclusions with reasoning)

- **In-app feature work** — v1.5 is an infra milestone; no product features added. Exception: env-driven flag plumbing for Judge0 integration points.
- **Judge0 execution on Cloud Run** — Judge0 requires privileged container features incompatible with Cloud Run. Deferred to v1.6 on dedicated VMs (isolated GCP project `nlm-judge0-*`).
- **Associate data migration from v0.1** — v0.1 served only public-interview flow (no persistent associate state). Nothing to migrate.
- **Auth migration** — Supabase Auth is already in use in v1.2+; v0.1 had no associate auth to migrate.
- **CDN in front of Cloud Run** — Cloud Run's built-in managed cert + global serving is sufficient at MVP traffic. Cloudflare proxy is "nice to have" but not P0.
- **Preview deployments per PR** — Cloud Run revisions + GH Actions could support this, but adds complexity beyond the 3-4 week target. Defer to post-MVP if demand arises.
- **Monorepo restructure** — app + iac + loadtest live in the existing repo; no split into multiple repos in v1.5.
- **Paid GCP support / SLA** — staying on free-tier credits for the milestone.

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 45 | Complete |
| INFRA-02 | Phase 45 | Complete |
| INFRA-03 | Phase 45 | Complete |
| INFRA-06 | Phase 45 | Complete |
| INFRA-07 | Phase 45 | Complete |
| DATA-01 | Phase 46 | Pending |
| DATA-02 | Phase 46 | Pending |
| DATA-03 | Phase 46 | Pending |
| DATA-04 | Phase 46 | Pending |
| DATA-05 | Phase 46 | Pending |
| DATA-06 | Phase 46 | Pending |
| INFRA-04 | Phase 47 | Pending |
| INFRA-05 | Phase 47 | Pending |
| CI-04 | Phase 47 | Pending |
| CI-01 | Phase 48 | Pending |
| CI-02 | Phase 48 | Pending |
| CI-05 | Phase 48 | Pending |
| CI-06 | Phase 48 | Pending |
| OBS-01 | Phase 48 | Pending |
| OBS-02 | Phase 48 | Pending |
| OBS-03 | Phase 48 | Pending |
| OBS-04 | Phase 48 | Pending |
| LOAD-01 | Phase 49 | Pending |
| LOAD-02 | Phase 49 | Pending |
| LOAD-03 | Phase 49 | Pending |
| HARD-01 | Phase 49 | Pending |
| HARD-02 | Phase 49 | Pending |
| HARD-03 | Phase 49 | Pending |
| JUDGE-INTEG-01 | Phase 50 | Pending |
| JUDGE-INTEG-02 | Phase 50 | Pending |
| JUDGE-INTEG-03 | Phase 50 | Pending |
| JUDGE-INTEG-04 | Phase 50 | Pending |
| CI-03 | Phase 51 | Pending |
| DNS-01 | Phase 51 | Pending |
| DNS-02 | Phase 51 | Pending |
| DNS-03 | Phase 51 | Pending |
| DNS-04 | Phase 52 | Pending |
| SUNSET-01 | Phase 52 | Pending |
| SUNSET-02 | Phase 52 | Pending |
| SUNSET-04 | Phase 52 | Pending |
| META-01 | Phase 53 | Pending |
| META-02 | Phase 53 | Pending |
| DOCS-01 | Phase 53 | Pending |
| DOCS-02 | Phase 53 | Pending |
| DOCS-03 | Phase 53 | Pending |
| DOCS-04 | Phase 53 | Pending |
| SUNSET-03 | Phase 53 | Pending |
