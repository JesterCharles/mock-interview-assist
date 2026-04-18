# v1.5 Discovery Brief — DevOps Migration to Production

**Generated:** 2026-04-18 via `/pipeline-coordinator` → `pipeline-discover` → adapted `/office-hours` forcing questions
**Prior brief (v1.4):** `.planning/milestones/v1.4-PIPELINE-DISCOVER.md`
**Status:** DRAFT → pipeline-init

## TL;DR

v1.5 migrates the Next.js app from legacy **v0.1 GCE** (currently serving `nextlevelmock.com` public interview users) to **Cloud Run + Supabase (hybrid)**, establishes a **staging environment**, matures **CI/CD to deploy-on-tag**, and produces a **single-instance load-test baseline** that feeds scaling math for the champion pitch. Judge0 self-hosted IaC deferred to v1.6 but integration points (env vars, service boundary, feature flag) are baked in now. Estimated 3-4 weeks.

## Context Reframe (from session)

**Before this session I believed:** NLM had zero live prod users, v1.4 coding-challenge work was the first real deploy target, Phase 43 terraform was sunk-cost scaffold.

**Actual state uncovered in Q2:**
- `nextlevelmock.com` has been live on **v0.1 GCE** (load balancer + HTTPS) since before the v1.0 readiness loop work began.
- The live site serves **public interview users right now**. It has ZERO of the v1.0-v1.4 code (readiness dashboard, cohorts, auth overhaul, coding challenges, shell unification).
- 4 milestones / 35 phases / 175+ features were built in dev but NEVER shipped to prod.
- User quote: *"Currently it just runs on GCE with load balancing for HTTPS and quick deploy, but that arch won't survive production."*

**Implication:** v1.5 is a **migration + architecture upgrade**, not a greenfield deploy. Phase 43 terraform is not sunk cost — it's a **reference template for v1.6 Judge0** and can be partially reused.

## Forcing Questions — Answers

### Q1 Demand Reality
Internal-champion pitch pending (no hard date) + load-testing need (benchmark concurrent-user ceiling before piling on features) + pipeline-ship maturity (staging/prod DB split, rollout plans) + existing live users on v0.1 public interview must stay unaffected + future STT/agent-explainability features gate on coding challenges being prod-proven.

### Q2 Status Quo
`nextlevelmock.com` = v0.1 on GCE with LB+HTTPS. No staging. No CI/CD beyond "quick deploy." v1.0-v1.4 unshipped. Arch "won't survive production" at scale.

### Q3 Desperate Specificity
Internal champion, flexible timeline (>4 weeks), no hard date. **Maturity over speed.** Full flow must demonstrate real production-grade infra (staging, CI/CD, observability hooks), not just a demo URL.

### Q4 Narrowest Wedge
**App + DB + CI/CD + load-test baseline + staging.** Judge0 IaC deferred to v1.6. Coding challenges stay flag-dark on prod in v1.5. Architecture includes Judge0 integration points so v1.6 is a drop-in.

### Q5 Platform
**Cloud Run (app) + Supabase (DB + auth, stays indefinitely)**, burning GCP free-tier credits for MVP runway. Company-standard: Supabase is already in use for other company projects, so the Supabase investment is a long-term alignment, not a compromise. Company's eventual app cloud is AWS — keep the app layer **Docker-native** so the future AWS migration is config, not rewrite. **Supabase stays through AWS migration** (Supabase is cloud-agnostic).

## Premises (all agreed)

- **P1 Migration not greenfield.** v0.1 GCE coexists with v1.5 Cloud Run during cutover. Extended outage unacceptable. Phase 43 terraform kept as v1.6 Judge0 reference.
- **P2 Cloud Run + Supabase hybrid on GCP credits.** Docker-native, Postgres-compatible. Cost target: ~$0 during credits, ≤$30/mo post-credit at MVP traffic.
- **P3 Judge0 deferred to v1.6.** Integration points (env vars, service boundary, feature flag) baked into v1.5. Coding challenges flag-dark on prod.
- **P4 Staging + load test are P0.** Staging Cloud Run + Supabase branch before prod cutover. CI/CD promotes staging→prod on tag. Single-instance k6 load test produces concurrent-user ceiling + cost-per-user math.

## Approaches Considered

### A) Lean Lift — minimal IaC (rejected)
Cloud Run + Supabase branches, zero terraform, gcloud in GH Actions. 2-3 weeks. Lowest IaC discipline — regrets later when AWS migration or team grows.

### B) IaC-First — Cloud SQL migration (rejected)
Full terraform, Supabase → Cloud SQL migration for data + auth. 4-6 weeks. Maximum AWS portability but migration risk + throws away working Supabase RLS/auth work from v1.2.

### C) Hybrid — Cloud Run app, Supabase stays ✅ CHOSEN
Cloud Run replaces GCE. Supabase stays as DB + auth **indefinitely** — this is company-standard (other company projects use Supabase), not a v1.5 compromise. Terraform for Cloud Run + Secret Manager + LB/domain only. Staging = separate Cloud Run service + Supabase branch. k6 load test in GH Actions. 3-4 weeks. Supabase is cloud-agnostic → survives eventual AWS migration unchanged.

## Recommended Approach — Detail (Approach C)

### Infra surface

| Component | Stack | Notes |
|-----------|-------|-------|
| App runtime | Cloud Run (2 services: `nlm-staging`, `nlm-prod`) | Docker-native. Existing Dockerfile (standalone Next.js) drops in. |
| Database | Supabase (existing prod project; add `staging` branch) | Auth, RLS, magic links, all working. No migration. |
| Domain | `nextlevelmock.com` → prod Cloud Run LB; `staging.nextlevelmock.com` → staging | Cutover via DNS A/AAAA swap. v0.1 GCE retained 30 days as rollback. |
| Secrets | Google Secret Manager | Env var injection via Cloud Run secret mount. |
| CI/CD | GitHub Actions | `pr-checks.yml` (typecheck+lint+test on PR) + `deploy-staging.yml` (on merge to main) + `deploy-prod.yml` (on tag `v*`). |
| IaC | Terraform (`iac/cloudrun/`) | Separate from `iac/gce-judge0/` (Phase 43 reference, inactive). |
| Observability | Cloud Run built-in logs + Cloud Monitoring dashboards | Prometheus-compatible metrics endpoint on app for future scrape. |
| Load test | k6 scenario checked into `loadtest/` | GH Actions workflow runs against staging on demand + pre-tag. |

### Judge0 integration points (architected, not applied)

- Env vars: `JUDGE0_URL`, `JUDGE0_AUTH_TOKEN`, `CODING_CHALLENGES_ENABLED` (feature flag default false on prod in v1.5).
- Service boundary: single `src/lib/judge0Service.ts` facade (exists from v1.4). Ensure flag check gates all call sites.
- Terraform placeholder: `iac/cloudrun/judge0.tf.disabled` stub documenting the v1.6 plan (VPC connector, private IP, firewall rule to Judge0 GCE).

### v0.1 GCE sunset plan

- **Day 0-14:** Deploy v1.5 to `staging.nextlevelmock.com`. Load-test. Verify public-interview flow still works.
- **Day 15-21:** Cutover window. DNS points `nextlevelmock.com` at prod Cloud Run. v0.1 GCE stays warm behind `legacy.nextlevelmock.com` as rollback (30-day retention).
- **Day 22-45:** Monitor. If no rollback by day 45, terminate v0.1 GCE instances + LB. Keep terraform archived.

### Out of scope (v1.6+)

- Judge0 self-hosted IaC + apply.
- AWS migration.
- Observability stack beyond Cloud Run built-ins (Grafana/Prom self-hosted).
- Multi-region.

## Decisions Resolved (post-discover, 2026-04-18)

1. **Supabase: two separate free-tier projects.** Free tier does not support branching. Staging = brand new Supabase project (separate from prod). Prisma `migrate deploy` promotes schema per-env. Keep both projects in same Supabase org if possible for billing continuity when upgrading later.
2. **DNS: Cloudflare Free Tier controls `nextlevelmock.com`.** Cutover = Cloudflare DNS record swap + orange-cloud proxy toggle. Zero registrar hops. Rollback = revert DNS record (TTL=300).
3. **GCP projects: `nlm-prod` + `nlm-staging`, fully isolated from v0.1 GCE.** Two-project split for clean billing visibility. Timeless naming (no version suffix) — future services (e.g., Judge0 in v1.6) get their own project like `nlm-judge0-prod`. v0.1 stays in its current project untouched. DNS does NOT cut over until v1.5 is fully functional on `nlm-prod` (end-to-end smoke + load-test pass).

## Open Questions (carry into pipeline-init)

1. **GCP project name convention** — e.g., `nlm-v15-prod` / `nlm-v15-staging` OR single project with namespaced service names. User decision at init.
2. **GCP free-tier credit balance** — how much credit is left + remaining days. Feeds the "burn rate" side of load-test economics. User action: `gcloud billing accounts list` + check console.
3. **Cloud Run cold-start tolerance:** Next.js 16 cold starts on Cloud Run vs `min-instances=1` cost delta. Benchmark in staging — resolved during execute, not init.
4. **Pitch demo data:** Does pitch need seeded demo users + cohorts + sessions on prod, or is staging URL acceptable for the champion walk-through? Resolved in plan/execute phase via Seed 8 (demo seeder) if needed.
5. **gcloud CLI auth — defer to execute phase.** Not needed for init/plan. When execute begins, user runs `! gcloud auth login` + `! gcloud config set project <new-project-id>` in this session so Claude can create resources. Safety: gcloud auth = destructive capability, defer until the scope is clearly bounded.

## Success Criteria

- [ ] `nextlevelmock.com` serves v1.5 app on Cloud Run in prod
- [ ] `staging.nextlevelmock.com` serves latest main on Cloud Run
- [ ] Deploy-on-tag pipeline produces signed, immutable Docker images + Cloud Run revisions
- [ ] Single-instance k6 load test produces report: `{max concurrent users before p95 latency > 500ms, cost per 1000 requests, CPU/mem at ceiling}`
- [ ] Supabase staging branch / project separate from prod, promoted via Prisma migrate deploy on tag
- [ ] v0.1 GCE decommission runbook in `.planning/DEPLOY.md`
- [ ] Judge0 integration points documented + flag-gated off on prod
- [ ] Zero regression on existing public-interview flow during + after cutover
- [ ] Pitch-ready walkthrough: champion signs in → creates mock → completes interview → sees readiness on prod URL

## Distribution Plan

Deploy artifact = Docker image built from `Dockerfile` (standalone Next.js output). Published to Google Artifact Registry. Cloud Run pulls by digest. GH Actions workflow signs + pushes on tag. No external user-install surface (SaaS only).

## Dependencies / Blockers

- GCP billing account + free-tier credits — user confirmed active.
- Cloudflare Free Tier controls `nextlevelmock.com` DNS — **resolved**.
- Two separate Supabase free-tier projects (staging + prod, not branches) — **resolved**.
- New isolated GCP project for v1.5 (v0.1 GCE untouched) — **resolved**.

## The Assignment (v1.5 milestone kickoff) — ALL RESOLVED

All discover-stage decisions captured. Before execute begins, user will need to:
1. Create the Supabase **staging** project (new free-tier project in existing org). Record project ref + anon/publishable key + secret key — execute will template into env config.
2. Create GCP projects `nlm-prod` and `nlm-staging` via console (before gcloud auth) or defer until execute phase (Claude can create via gcloud once authed).
3. At execute phase kickoff, run `! gcloud auth login` in Claude session + `! gcloud config set project nlm-staging`. Claude will provision terraform + workflows from there.

Nothing left blocking `/gsd-new-milestone v1.5`. Proceed to init.

## What I noticed about how you think

- You caught yourself surfacing a hidden live production (v0.1 on nextlevelmock.com) that my context didn't have. Rather than hand-wave, you explained the history in one paragraph: "It was a for fun project I'm trying to convert into a production quality system." That instinct — correcting upstream assumptions when you notice them — is what prevents wrong plans.
- When I offered Cloud Run, you didn't just pick it. You asked: *"wouldn't there still be costs, is it much cheaper than fly.io and railway?"* + flagged AWS as the company's long-term cloud. Cost-aware + vendor-aware at the same time. That's the tension most solo devs ignore until bill day.
- You rejected the tightest option (lean lift) and the heaviest (Cloud SQL migration) in favor of the middle path that preserves Supabase investment. Not because it's the cheapest, but because it honors sunk work (RLS, auth, branching) that already works. That's the right reading of cost — code already written is cheaper than code rewritten.
- You defaulted to architecting Judge0 integration points in v1.5 even though Judge0 ships in v1.6. "It still fits into the plan but won't have to necessarily restructure everything to fit judge0 in." Forward-compatible design without premature implementation. Rare discipline.

## Seeds Planted

See `.planning/seeds/v1.5-discovery-seeds.md` for forward-looking captures.

## Next Step

→ `/gsd-new-milestone v1.5` (via `pipeline-init`)
