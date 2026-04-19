# Planning Pipeline — v1.5 Production Migration

**Date:** 2026-04-18
**Milestone:** v1.5 (Cloud Run + Supabase Hybrid)
**Mode:** sync (user-present, `/pipeline-coordinator --resume`)
**Scope:** Phases 45-53 (9 phases, 36 plans)
**Previous PIPELINE-PLAN archived:** `.planning/milestones/v1.3-PIPELINE-PLAN.md`

---

## Phases Planned

| Phase | Name | Plans | Reqs | Depends on | Wave |
|-------|------|-------|------|------------|------|
| 45 | Terraform Skeleton + Artifact Registry + Secret Manager | 4 | INFRA-01, 02, 03, 06, 07 | — | A |
| 46 | Supabase Staging + Env Hygiene + Prisma Migrate Baseline | 4 | DATA-01..06 | 45 | B |
| 47 | Staging Cloud Run Service + Load Balancer + Domains | 4 | INFRA-04, 05, CI-04 | 45, 46 | C |
| 48 | GitHub Actions CI + Deploy-Staging + Observability | 4 | CI-01, 02, 05, 06, OBS-01..04 | 47 | D |
| 49 | k6 Load Test + Hardening (HARD-01..03) | 4 | LOAD-01..03, HARD-01..03 | 48 | E |
| 50 | Judge0 Integration Points + Flag Audit | 4 | JUDGE-INTEG-01..04 | 45 | B (parallel w/ 46) |
| 51 | Prod Cloud Run + Deploy-Prod Pipeline + DNS Records | 4 | CI-03, DNS-01..03 | 48, 49, 50 | F |
| 52 | DNS Cutover + Zero-Downtime Validation + Kill Switch | 4 | DNS-04, SUNSET-01, 02, 04 | 51 | G |
| 53 | Reflect + Maintain + Runbook Finalization + Decommission | 4 | META-01, 02, DOCS-01..04, SUNSET-03 | 52 | H |

**Total:** 9 phases, 36 plans, 47 requirements — every requirement in REQUIREMENTS.md mapped.

---

## Execution Wave Structure

```
Wave A: [45]
Wave B: [46, 50]   ← parallel (50 only needs 45)
Wave C: [47]       (needs 45, 46)
Wave D: [48]       (needs 47)
Wave E: [49]       (needs 48)
Wave F: [51]       (needs 48, 49, 50)
Wave G: [52]       (needs 51) — HITL (user-present cutover)
Wave H: [53]       (needs 52)
```

Parallel opportunity: Phase 50 can run concurrently with 46 → 47 → 48 → 49 since it only needs 45. Saves ~1 phase of serial time.

---

## Reviews

### autoplan (CEO + eng + design + DX)
**Status:** DEFERRED. Individual plan-checker ran on Phase 45 (1 blocker + 2 warnings, fixed). Remaining 8 phases rely on planner self-validation (frontmatter + structure checks pass). Codex adversarial-review scheduled inside Phase 49 (SECURITY-v1.5 sign-off) effectively reviews every preceding IaC + CI decision.

**Recommendation:** Run `/autoplan` before Wave A execution if user wants multi-lens pass. Otherwise surfaced taste decisions (per phase below) are pre-approved as sync defaults.

### Cross-AI Peer Review (`/gsd-review`)
**Status:** DEFERRED to post-execute. Phase 53 `/pipeline-reflect` retrospective covers learnings.

### Codex Architecture Assessment
**Status:** Pending — scheduled inside Phase 49 Plan 04 (`codex adversarial-review` on `.planning/SECURITY-v1.5.md`). Sign-off is a hard gate before Phase 52 cutover.

---

## Taste Decisions Surfaced (pre-approved, sync mode)

Per-phase auto-selected recommendations from `--auto` discuss — all logged in each phase's `NN-DISCUSSION-LOG.md` or `NN-CONTEXT.md`. Key choices:

| Phase | Decision | Recommendation Accepted |
|-------|----------|-------------------------|
| 45 | TF module layout | Single root + `.tfvars` per env (no workspaces) |
| 45 | State bucket location | GCS bucket in `nlm-prod`, prefix-per-env |
| 45 | Secret naming | Plain names (project scopes env) |
| 45 | Dockerfile smoke relaxation | **Option C** — accept 200/500/503 as "container booted" |
| 46 | Wipe procedure | `pg_dump` backup → GCS → `TRUNCATE CASCADE` → re-migrate |
| 46 | Seeder library | `@faker-js/faker` with `faker.seed(1337)` |
| 46 | Auth redirect update method | Supabase Management API PATCH |
| 47 | SSL product | `google_compute_managed_ssl_certificate` (classic) |
| 47 | Cloudflare orange-cloud on staging | OFF |
| 47 | WIF scope | Provision in BOTH projects during Phase 47 |
| 48 | Load-test workflow shell | Skeleton only in 48; body in Phase 49 |
| 48 | `/api/metrics` default | OFF (feature-flagged) |
| 48 | Alert threshold | 2 consecutive failures |
| 49 | k6 scenario shape | 0→10→50→100 VU ramp over 10 min |
| 49 | Abuse test target | Staging only |
| 50 | Flag read path | `/api/coding/status` endpoint (not bundled `NEXT_PUBLIC_*`) |
| 50 | Trainer admin bypass | None — flag-gated equally |
| 51 | Apex in 51 | Still points at v0.1 GCE IP; TF imports existing record |
| 51 | First prod tag | `v1.5.0-rc1` |
| 52 | Cutover method | `terraform apply -target=cloudflare_record.apex` |
| 52 | Kill-switch rehearsal | DURING live window, T+30min |
| 53 | Retro scope | Both v1.4 AND v1.5 combined |
| 53 | Health score | Computed 0-10 (tests 30%, types 30%, lint 20%, audit 20%) |

**No taste decisions flagged as BLOCKING.** All phases ready for execute.

---

## Security Verification

Per-phase STRIDE mitigations baked into plans via `threats_mitigated` frontmatter. Aggregate:

- Phase 45: T-45-01..10 (state wipe, image tamper, SA over-priv, tfstate exposure)
- Phase 46: T-46-01..08 (seeder mis-targets prod, wipe without backup, prod-key leak)
- Phase 47: T-47-01..12 (WIF federation leak, SA over-priv, image digest drift, orange-cloud misfire)
- Phase 48: T-48-01..08 (CI bypass, stale migration, digest drift, alert fatigue, metrics info leak)
- Phase 49: T-49-01..09 (load DoS, artifact secret leak, abuse-test PII leak, severity downgrade)
- Phase 50: T-50-01..05 (missed call site, client-bundle flag, status-endpoint info leak)
- Phase 51: T-51-01..06 (accidental cutover, SSL cert not ACTIVE, untested image)
- Phase 52: T-52-01..05 (DNS prop delay, mid-cutover 502, email fail, kill-switch bug)
- Phase 53: T-53-01..05 (retro local-only, decommission script leak, stale docker-compose ref)

**Formal `/gsd-secure-phase`:** DEFERRED. Threats captured per phase; Phase 49 Plan 04 consolidates all via `/cso` + `codex review` + `codex adversarial-review` against `.planning/SECURITY-v1.5.md`.

---

## Autoresearch Opportunities

One metric-optimizable target:
- **Cold-start time** (Phase 47 D-23 probe, <30s target). If staging shows 20-30s, Phase 49's k6 baseline quantifies impact at scale. Candidate autoresearch post-49 if warranted.

Not activated in v1.5; logged as v1.6 seed.

---

## Artifacts Produced

Per-phase directory contents (9 dirs under `.planning/phases/`):

| File | Phases |
|------|--------|
| `NN-CONTEXT.md` | All 9 |
| `NN-DISCUSSION-LOG.md` | 45, 46, 47 |
| `NN-RESEARCH.md` | 45, 46, 47 (+ implicit 49 via CONTEXT) |
| `NN-VALIDATION.md` | 45, 46, 47 |
| `NN-0M-PLAN.md` (×4) | All 9 |

Phases 48, 50, 51, 52, 53 rely on Phase 47's research patterns + their own CONTEXT for planner input (no standalone RESEARCH/VALIDATION — doc/CI phases where research belongs inline).

Commit range: `4354d7c` (phase 45 context) → `48aff11` (phase 53 plans).

---

## Dependency Graph

```
 45 ──┬──► 46 ──► 47 ──► 48 ──► 49 ──┐
      │                              │
      └──► 50 ───────────────────────┼──► 51 ──► 52 ──► 53
                                     │
```

No cycles. Wave B is the only parallelization opportunity (46 ∥ 50).

---

## Next Step

→ `/gsd-execute-phase 45` OR `/pipeline-coordinator --resume` (routes to EXECUTE stage).

**Recommended:** Run `/clear` before executing to reset context window.

---

*Generated by `/pipeline-coordinator --resume` routing to `/pipeline-plan`. All 9 v1.5 phases planned in a single session. 2026-04-18.*
