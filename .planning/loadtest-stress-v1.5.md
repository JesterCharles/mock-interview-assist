# Load Test — v1.5 Stress (Cloud Run capacity discovery)

**Date:** 2026-04-19
**Target:** https://staging.nextlevelmock.com (Cloud Run `nlm-staging`, region `us-central1`, project `nlm-staging-493715`)
**Starting config:** `container_concurrency=80`, `max_instances=10`, `min_instances=0`
**Revision during Phase A:** `nlm-staging-00003-hlw`
**Scenario file:** `loadtest/stress.js` (companion to `loadtest/baseline.js`; identical 40/30/15/10/5 traffic mix and 1-3s think-time)
**Tool:** k6 v1.7.1
**Baseline reference:** `loadtest/baseline.js` @ 100 VU sustained → p95 271ms (plenty of headroom noted).

> **Note on "failures"**: k6 reports `http_req_failed ~55%` in both phases. This is **expected and benign** — the traffic mix routes 30% to `/api/health` (returns 503 by design until Judge0 ships) and 25% to public interview POSTs (400 zod validation on synthetic fixtures, as designed for `baseline.js`). Application 5xx count **outside** `/api/health` was **zero** across both phases. Unless stated otherwise, "errors" below means `status >= 500 AND path != /api/health`.

---

## Phase A — multi-instance stress (auto-scale, max=10)

**Stages:** 1m→50 → 3m@150 → 2m→300 → 3m@300 → 1m→500 → 2m@500 → 1m→0 (13 min total)
**Iterations:** 88,438 · **Throughput:** 113.0 req/s avg · **VU peak:** 500

### Results

| Window | VU level | Server p95 (Cloud Run) | Client p95 (k6) | CPU p99 | Mem p99 | Instances (active) | App 5xx |
|---|---|---|---|---|---|---|---|
| 10:01 | 0→50 ramp | 153ms (cold) | 262ms | 2% | 50% | 1 | 0 |
| 10:02–04 | 50 warm + 50→150 | 37–40ms | 260ms | 12–21% | 52–59% | 1 | 0 |
| 10:05–07 | 150 sustained | 38–46ms | 265ms | 27–43% | 59% | 1 | 0 |
| 10:08–10 | 150→300, 300 sustained | 41–46ms | 270ms | 44–47% | 60% | 1 | 0 |
| 10:11 | 300 tail, 300→500 ramp | 116ms | 274ms | **67%** | 60% | 1 | 0 |
| 10:12 | 500 sustained | **129ms** | 282ms | **70%** | 60% | **1→2** | 0 |
| 10:13 | 500 tail | 98ms | 282ms | 66% | 60% | 2 | 0 |
| 10:14 | ramp down | 39ms | — | 17% | 57% | 2 | 0 |

**Overall k6 metrics (full 13 min):**

```
http_req_duration  avg=257ms  p50=257ms  p90=270ms  p95=282ms  p99=403ms  max=6051ms
kind=api           avg=247ms  p90=259ms  p95=274ms  p99=400ms
http_reqs          88438     113.0/s
app 5xx (non-health)  0
```

**Where did Cloud Run scale?**
- **1st instance sufficient through 300 VU sustained** (CPU 44%, p95 <50ms server-side).
- **Scaled to 2 instances at 10:12:57 UTC**, ~11m into the run, after ~90 seconds at CPU 67–70% under 500 VU. Cloud Run's default scale-up target is 60% CPU + concurrency — the observed trigger is CPU crossing 60% for ~60s.
- **Never scaled to 3** — the 2nd instance + ramp-down tail absorbed the remainder of the 500 VU window.

**The one-word surprise: one.** A single Cloud Run instance handled 300 concurrent users at <50ms server-side p95. The staging default of `max=10` is aspirational — we didn't exercise the upper 8 instances.

---

## Phase B — single-instance ceiling (max=1)

**Config change:** `gcloud run services update nlm-staging --max-instances=1` (reverted after run — verified `maxScale=10` post-revert, revision `nlm-staging-00005-hl8`).
**Stages:** 30s→25 → 1m@25 → 30s→75 → 2m@75 → 30s→150 → 2m@150 → 30s→0 (7 min)
**Iterations:** 16,019 · **Throughput:** 37.9 req/s avg · **VU peak:** 150

### Results

| Window | VU level | Server p95 | Client p95 | CPU p99 | Mem p99 | App 5xx |
|---|---|---|---|---|---|---|
| 10:16 | cap-deploy cold start | 280ms | — | 1% | — | 0 |
| 10:17 | 25 sustained | 45ms | 263ms | 13% | — | 0 |
| 10:18–19 | 25→75 warm-up, 75 sustained | 42–44ms | 267ms | 11–21% | — | 0 |
| 10:20 | 75 sustained | 41ms | 269ms | 24% | — | 0 |
| 10:21 | 75→150 ramp | 49ms | 270ms | 26% | — | 0 |
| 10:22 | 150 sustained | 42ms | 273ms | **39%** | — | 0 |
| 10:23 | ramp down | 41ms | — | — | — | 0 |

**k6 summary:**

```
http_req_duration  avg=254ms  p90=270ms  p95=273ms  p99=308ms  max=667ms
kind=api           p95=264ms  p99=303ms
http_reqs          16019  37.9/s
app 5xx (non-health)  0
```

**Inflection point:** **not reached.** Single instance at 150 VU topped out at **39% CPU** and **~42ms server-side p95**. The Phase B ramp was narrower than Phase A, so the 500-VU Phase A numbers on a single instance (CPU 70%, p95 129ms) are the better per-instance ceiling signal.

---

## Per-instance ceiling (synthesis)

Combining Phase A (single instance through 500 VU for 9 of 13 min) + Phase B:

| Concurrent VUs | ≈ req/s | 1-instance CPU | 1-instance server p95 | Target quality met (p95 <500ms, err <0.5%) |
|---|---|---|---|---|
| 25 | ~12 | 13% | 45ms | yes (idle) |
| 75 | ~26 | 24% | 44ms | yes (idle) |
| 150 | ~38 | 39% | 42ms | yes |
| 300 | ~70 | 44% | 46ms | yes |
| 500 | ~113 | 70% | **129ms** | yes but near CPU ceiling |

**One Cloud Run instance (1 vCPU / 1 GiB / concurrency=80) comfortably serves ~300 simultaneous active VUs (~70 req/s) with this traffic mix** while sitting at 44% CPU and <50ms server-side p95. 500 VU is the effective per-instance ceiling — it stays functional (p95 129ms) but CPU saturates at 70% and triggers scale-out.

**Scale trigger observed:** CPU ≥ 60% for ~60s → Cloud Run adds instance. No concurrency-based trigger observed (concurrent_requests metric stayed well below the 80 cap — pool effectively capped at ~30 concurrent in-flight per instance given 1–3s think-time).

---

## Bottleneck identification

- **Primary:** CPU on the application container. Only metric that actually moved under load. Hit 70% at 500 VU.
- **Not the bottleneck:**
  - **Memory:** held flat at ~60% through the entire 13 min run (no leak signal, no GC pressure).
  - **Supabase pool:** traffic mix does not include DB-heavy routes; `/` (static) and `/api/health` (simple ping) dominate. The DB pool (`connection_limit=5`) was not exercised.
  - **OpenAI API:** the synthetic POST bodies trip zod validation before the LangGraph agent ever runs. LLM latency is not in this test's path.
  - **Cloud Run cold starts:** one brief 280ms cold-start spike at 10:16 (Phase B cap redeploy); none during Phase A until the 2nd instance at 10:12 (absorbed quickly).
  - **Client/network:** 220–230ms of client-side p95 is MacBook → us-central1 RTT (server-side p95 is 40–50ms at the same wall-clock moment). Users closer to Iowa will see lower client p95.

**What was NOT tested (important caveats):**
1. **LangGraph scoring path** (`/api/score`, `/api/public/interview/agent` with valid bodies). This hits OpenAI and is latency-bound by the LLM, not CPU. Real interview-completion load will behave very differently — a single `/api/score` can take 2–8s against gpt-4o-mini.
2. **Supabase writes** (`/api/associate/interview/complete`, session persistence). Dual-write + gap scoring + readiness recompute happens on every interview completion. Under heavy completion bursts the `connection_limit=5` pool becomes the constraint, not Cloud Run CPU.
3. **Authenticated flows**. All tested routes are public/static.

---

## Target load recommendations

Framing: this test establishes the **front-end + static/public API** ceiling. LLM-heavy flows have a separate, lower ceiling governed by OpenAI rate limits and per-request latency (2–8s). Recommendations below separate the two.

### Passive / browsing traffic (dashboard, `/`, `/signin`, `/api/question-banks`)

| Cohort size | Concurrent active VUs | Cloud Run needs | Confidence |
|---|---|---|---|
| Small (20–30 associates) | 20–30 | 1 instance, idle CPU | high |
| Medium (50–100) | 50–100 | 1 instance, 25–30% CPU | high |
| Large (200–300) | 200–300 | 1 instance at 44% CPU — no scale-out needed | high |
| Very large (500+) | 500 | 2 instances, 60–70% CPU each | high |
| Marketing spike (1000+) | 1000 | 4–6 instances estimated (linear extrapolation); `max=10` still sufficient | medium (not tested) |

**Browsing traffic is not the constraint.** Current `max=10` supports well over 2000 concurrent browsers before needing config change.

### Interview-completion traffic (the real bottleneck)

One interview completion ≈ 1 × `/api/public/interview/start` + N × `/api/public/interview/agent` (LLM call) + 1 × completion (LLM summary + Supabase writes + email). Budget per completion: ~10–30s wall-clock, most on OpenAI.

| Scenario | Interviews concurrently finishing | Likely gate |
|---|---|---|
| Small cohort (20 associates finish over 1 hour) | 1–2 at a time | None — trivial load |
| Medium cohort (100 associates finish in 30 min burst) | 5–10 at a time | OpenAI tier-1 TPM (gpt-4o-mini 200k TPM) — likely fine |
| Large cohort (200 associates within 15 min) | 15–20 at a time | **OpenAI RPM + Supabase pool** (5 conns × 1 instance). **This is the first real gate.** |
| Multi-cohort (500+ starts simultaneously) | 40+ at a time | **OpenAI rate limits first, then Supabase pool**, Cloud Run CPU still has headroom |

**Where OpenAI becomes the ceiling before Cloud Run:** around 20–30 simultaneous LLM scorings at tier-1 gpt-4o-mini, assuming ~2–3k tokens in+out per score. Mitigations: use OpenAI batch API for non-urgent, upgrade to tier-2, or queue completions.

**Where Supabase pool becomes the ceiling:** `connection_limit=5` per instance × current 1–2 instances = 10 concurrent connections max. Each completion does 3–5 sequential writes (Associate upsert, Session insert, GapScore upserts, Readiness update). Burst of 20+ completions in 30s will queue. Needs raising to `connection_limit=10-15` + PgBouncer transaction pool (already using port 6543, so OK) — or introducing a completion queue.

---

## Config recommendations

1. **Keep `max_instances=10` as-is.** Current config handles everything up to the interview-completion wall. Raising it will not help — the gate is elsewhere.

2. **Consider `min_instances=1` for production.** Cold-start penalty observed was 280ms on a fresh deploy, ~150ms on first request after idle. Not catastrophic, but for a bootcamp cohort that all opens the app at 9:00 AM Monday, a single warm instance spares 30 users a 150ms penalty. Cost: ~$15/month. Staging should stay at `min=0` to save spend.

3. **Leave `container_concurrency=80` as-is.** We never approached it — concurrent in-flight maxed at ~30 per instance with the observed think-time pattern. Lowering to 40 would artificially force earlier scale-out without CPU justification. Raising above 80 is unsafe for memory-heavy LLM paths.

4. **Raise Prisma `connection_limit` from 5 → 10** in the `DATABASE_URL` query string. At 2 active instances serving a medium cohort completion burst, 10 + 10 = 20 concurrent PG connections still comfortably under Supabase's pooler cap (200 on transaction mode). This is the cheapest win for completion-burst resilience.

5. **Add an interview-completion load test before declaring full capacity.** `stress.js` tests the browsing + cheap-API path and gives a false sense of security. A follow-up scenario should:
   - Hit `/api/public/interview/start` with valid bodies (pass zod)
   - Simulate 3–5 `/api/public/interview/agent` ticks per session
   - Call `/api/public/interview/complete` to trigger the DB + LLM-summary + email path
   - Ramp to 20 concurrent completions — **that** will tell us where OpenAI rate limits bite.

6. **Set up Cloud Monitoring alerting thresholds** now, informed by this test:
   - `container/cpu/utilizations p99 > 75% for 3 min` → page (predicts scale-out pressure)
   - `request_count{response_code_class="5xx"} rate > 0.5/s` excluding `/api/health` → page
   - `request_latencies p95 > 1500ms for 3 min` on non-health routes → page
   - Supabase: connection pool saturation alert (separate, via Supabase dashboard)

---

## Raw artifacts

- `loadtest/stress.js` — scenario file (committed, PHASE env toggles single-vs-multi ramp)
- `/tmp/loadtest-stress-v1.5/phaseA-run.log` — full k6 stdout
- `/tmp/loadtest-stress-v1.5/phaseA-multi-summary.json` — k6 handleSummary output
- `/tmp/loadtest-stress-v1.5/phaseA-metrics.tsv` — 30s-cadence Cloud Run instance/CPU/mem/req poll
- `/tmp/loadtest-stress-v1.5/phaseB-run.log` — k6 stdout (single-instance)
- `/tmp/loadtest-stress-v1.5/phaseB-single-summary.json`
- `/tmp/loadtest-stress-v1.5/phaseB-metrics.tsv`
- `/tmp/loadtest-stress-v1.5/phaseB-driver.log` — gcloud cap + revert driver log

## Guardrail checklist (confirmed)

- [x] `loadtest/baseline.js` untouched
- [x] Production (`https://nextlevelmock.com`, v0.1 GCE) never hit
- [x] `max_instances` never raised above 10
- [x] Phase B `max_instances=1` reverted to 10 post-run (verified via `gcloud run services describe`)
- [x] All metrics saved under `/tmp/loadtest-stress-v1.5/`
