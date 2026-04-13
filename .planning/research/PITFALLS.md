# Domain Pitfalls

**Domain:** Adaptive skills assessment platform — adding Supabase persistence, gap tracking, and trainer dashboard to existing Next.js 16 Docker app
**Researched:** 2026-04-13
**Confidence:** MEDIUM (codebase-verified patterns + established migration domain knowledge; no live web sources available)

---

## Critical Pitfalls

Mistakes that cause rewrites, data loss, or broken existing flows.

---

### Pitfall 1: Prisma + Supabase Connection Exhaustion in Docker

**What goes wrong:** Prisma's default connection pool creates a new pool per Next.js hot-reload or per serverless invocation. In a Docker-deployed Next.js app (standalone mode), each request handler can open connections that never get released. Supabase free tier allows only 60 direct connections. Under load — or during a coding session with frequent `npm run dev` restarts — the pool fills up silently, and new DB calls hang or throw `P1001: Can't reach database server` or `too many connections`.

**Why it happens:** Next.js App Router runs API routes in separate module contexts. Without a global singleton for `PrismaClient`, each module instantiation creates a fresh pool. The `data/` file system backend has no concept of connections, so the existing code has no guard against this.

**Consequences:** DB calls silently fail mid-interview. If the write to Supabase fails and the file-based fallback also fails (or isn't wired), the session is lost. Extremely hard to reproduce locally (connections look fine with 1-2 users).

**Prevention:**
- Use Supabase's **Transaction Mode connection pooler** (port 6543, not 5432) as the `DATABASE_URL` for Prisma. This routes through PgBouncer and caps each transaction's connection use.
- Use port 5432 (Session Mode) only for `DIRECT_URL` in Prisma's `schema.prisma` (needed for migrations only).
- Implement the standard singleton pattern:
  ```typescript
  // src/lib/db.ts
  import { PrismaClient } from '@prisma/client'
  const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
  export const prisma = globalForPrisma.prisma ?? new PrismaClient()
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
  ```
- Never import `new PrismaClient()` directly in route handlers.

**Warning signs:** `P1001` errors in logs, Supabase dashboard showing connection count near 60, slow queries that time out only when multiple tabs are open.

**Phase:** PERSIST-01 (first DB write introduced)

---

### Pitfall 2: Dual-Write Silently Diverging — File Succeeds, DB Fails

**What goes wrong:** The dual-write strategy (`data/interview-history.json` + Supabase) is intended as a safety net. In practice, the DB write is async and the file write is synchronous. If the DB insert throws (connection error, schema mismatch, constraint violation), the error is swallowed or logged but not surfaced to the caller. The session appears saved (file succeeded), but gap tracking data is never written. After disabling file writes, historical data in Supabase is incomplete and the gap algorithm produces misleading results.

**Why it happens:** The natural implementation is `try { await db.save() } catch { log }` alongside the existing file write. The catch branch looks safe because the file write worked. But the DB divergence accumulates silently.

**Consequences:** Gap algorithm trains on a partial dataset. Associates who had sessions before the bug was noticed appear to have fewer sessions than they did, distorting their readiness signal downward. Requires manual reconciliation.

**Prevention:**
- Treat the dual-write as a **circuit breaker**, not fire-and-forget. Log every DB failure with session ID and timestamp to a dedicated error table or structured log line so divergence is detectable.
- Add a `/api/admin/sync-check` endpoint (internal, auth-gated) that compares file session IDs against DB session IDs during the migration window.
- Define a "migration complete" condition: DB write must succeed for N consecutive sessions before file writes are disabled.
- Never disable file writes without running the sync check first.

**Warning signs:** DB session count diverges from file session count. Gap data shows fewer sessions than trainers remember conducting.

**Phase:** PERSIST-01 / PERSIST-02 transition

---

### Pitfall 3: Prisma Migrations Failing in Docker Because `DIRECT_URL` Is Missing

**What goes wrong:** Supabase requires `DIRECT_URL` (direct Postgres connection, port 5432) for `prisma migrate deploy`, because PgBouncer (transaction mode) does not support the advisory locks that migrations use. If only `DATABASE_URL` (pooler) is set in `.env.docker`, `prisma migrate deploy` hangs indefinitely or throws a cryptic lock timeout error.

**Why it happens:** The existing `.env.docker` has no DB variables at all. Setting up Supabase for the first time, it's natural to add only one `DATABASE_URL` and use the connection string copied from the Supabase dashboard (which may default to the pooler URL).

**Consequences:** Migrations never apply in production. Schema is out of sync with production DB. First deploy appears to succeed (Next.js starts), but all DB calls fail because tables don't exist.

**Prevention:**
- Always configure two env vars in `.env.docker`:
  ```
  DATABASE_URL="postgres://[user]:[password]@[project].supabase.com:6543/postgres?pgbouncer=true"
  DIRECT_URL="postgres://[user]:[password]@[project].supabase.com:5432/postgres"
  ```
- In `schema.prisma`:
  ```
  datasource db {
    provider  = "postgresql"
    url       = env("DATABASE_URL")
    directUrl = env("DIRECT_URL")
  }
  ```
- Run `prisma migrate deploy` (not `prisma migrate dev`) in the Docker entrypoint or CI step before starting the app server.

**Warning signs:** Migration commands hang > 30 seconds. `prisma db push` works but `migrate deploy` does not (they use different lock mechanisms).

**Phase:** PERSIST-01 (infrastructure setup)

---

### Pitfall 4: Gap Algorithm Producing Misleading Scores on Cold Start (< 3 Sessions)

**What goes wrong:** The recency-weighted gap score formula (`score * 0.8^age`) is designed for associates with multiple sessions. With 1 session, the weight is 1.0 regardless of decay, so a single bad session produces a gap score of 1/5 for a topic and triggers the "priority weakness" flag — even though one data point is statistically meaningless. This produces false urgency in the trainer dashboard during the first 1-2 sessions.

**Why it happens:** The algorithm assumes a prior population of sessions. The formula has no lower bound on sample size before producing actionable signals.

**Consequences:** Trainers see alarming readiness badges ("Not Ready") for every new associate before they've had enough reps to establish a baseline. Trust in the dashboard erodes immediately on first use.

**Prevention:**
- Add a **minimum sessions gate** before computing readiness signals. Per PROJECT.md, the threshold is already defined as 3 sessions for the readiness signal. Apply the same gate to gap scores: display "Insufficient data (N/3 sessions)" instead of a gap score until the threshold is met.
- For technology weights in adaptive setup (GAP-02), default to equal weights if fewer than 3 sessions exist for that associate. Only shift weights toward gaps after the baseline is established.
- Store `session_count` per associate on the profile row so the gate check is O(1).

**Warning signs:** Dashboard shows "Priority Gap: React Hooks" after a single session where the associate scored 2/5. Trainers start dismissing dashboard recommendations as noise.

**Phase:** GAP-01 / GAP-02 / DASH-01

---

### Pitfall 5: N+1 Query Pattern in Trainer Dashboard Roster View

**What goes wrong:** The roster view (DASH-01) shows all associates with their readiness status badge. The natural implementation fetches all associate profiles, then for each associate fetches their sessions, then for each session fetches the question assessments. This is 1 + N + N*M queries. With 20 associates averaging 10 sessions each, the page triggers 200+ queries on every load.

**Why it happens:** Prisma's `findMany` is easy and explicit. It's tempting to `prisma.associate.findMany()` then loop and `prisma.session.findMany({ where: { associateId } })` inside the loop. The N+1 is invisible in development with 2-3 test associates.

**Consequences:** Dashboard page loads in 800ms-2s in production with real data. Adding more associates makes it progressively worse. On the Supabase free tier with connection limits, each query consumes a connection slot for its duration.

**Prevention:**
- Use Prisma's `include` to eager-load in a single query:
  ```typescript
  prisma.associate.findMany({
    include: {
      sessions: {
        orderBy: { date: 'desc' },
        take: 10, // Only recent sessions for badge computation
        include: { assessments: true }
      }
    }
  })
  ```
- For the roster view specifically, compute readiness signals server-side during session save (write the computed value to the `associate` row) rather than recomputing on every dashboard load. This is a **pre-computed badge pattern**: update `associate.readiness_status` and `associate.last_session_date` whenever a session completes.
- Defer the per-associate detail query to the drill-down page (DASH-02), not the roster.

**Warning signs:** Dashboard page takes > 500ms. Adding a `console.time()` around the data fetch reveals hundreds of DB calls. Supabase dashboard shows query count spikes on dashboard page loads.

**Phase:** DASH-01

---

### Pitfall 6: Zustand `persist` Stale State Blocking DB-Sourced Data

**What goes wrong:** The existing Zustand store persists `session` and `repoConfig` to `localStorage` with `partialize`. When the app adds DB-sourced associate profiles (PERSIST-02) and gap history (GAP-01), there will be pressure to also persist these in Zustand for performance. If stale gap data from a previous page load persists in localStorage, a trainer opening the dashboard sees last session's data rather than current DB state. The persist middleware has no TTL by default.

**Why it happens:** The localStorage persist pattern is deeply embedded in the codebase. It's natural to extend `partialize` to include `gapHistory` and `associateProfile` when those are added to the store. The bug only surfaces when data is stale by > 1 session.

**Consequences:** Trainer dashboard shows incorrect gap trends. Adaptive setup (GAP-02) pre-selects wrong technology weights because it reads stale gap data. Extremely hard to debug ("it works on my machine") because the cache state depends on the user's localStorage contents.

**Prevention:**
- Keep Zustand persist strictly for **in-progress interview state only** (as it currently is). Database-sourced data (associate profiles, gap history, session history) must never go into localStorage.
- Use React Query / SWR or server components for DB-sourced data. These have built-in cache invalidation and are trivially revalidated on page focus.
- If using server components for the dashboard, gap data is fetched fresh on every navigation — no cache layer to go stale.
- Add a version key to the persist config so schema changes force a cache clear:
  ```typescript
  persist({ name: 'interview-session-storage', version: 2, ... })
  ```

**Warning signs:** Trainer sees data from a previous session after a completed interview. Gap scores don't update after a new session completes.

**Phase:** PERSIST-02 / GAP-01

---

## Moderate Pitfalls

---

### Pitfall 7: Associate Identity Collision — Trainer-Assigned Slugs Are Not Unique Across Time

**What goes wrong:** PROJECT.md specifies trainer-assigned slugs/IDs for associate identity (no login). If two associates are named "John Smith" and both get slug `john-smith`, or if an associate leaves and a new associate is given the same slug, sessions from different people are aggregated into the same gap history. The recency-weighted algorithm would produce a nonsensical trend that mixes two people's data.

**Why it happens:** Simple slug generation is case-insensitive and non-unique. Trainers don't think of slugs as globally unique identifiers.

**Prevention:**
- Enforce slug uniqueness at the DB level with a `UNIQUE` constraint on the `associates.slug` column.
- Return a clear API error on duplicate slug creation (409 Conflict) with a suggestion (e.g., "john-smith-2").
- Store `created_at` on associate profiles so the trainer can see if a slug is new or existing.
- Never auto-generate slugs from names — require trainer to explicitly confirm the slug.

**Warning signs:** Gap charts show implausible variance (score goes from 1 to 5 randomly across sessions).

**Phase:** PERSIST-02

---

### Pitfall 8: Recency Decay Parameter Hardcoded at 0.8 — No Observability

**What goes wrong:** The 0.8 decay factor is noted in PROJECT.md as "a simple starting point, autoresearch optimizes later." If it's hardcoded inline in the gap computation function, autoresearch cannot iterate on it without modifying application code. The decay factor needs to be configurable without a deploy.

**Why it happens:** It's tempting to inline the constant during initial implementation: `const score = rawScore * Math.pow(0.8, sessionAge)`.

**Consequences:** Autoresearch cannot run experiments on decay parameter without code changes. The optimization loop PROJECT.md envisions for gap algorithm tuning is blocked.

**Prevention:**
- Store the decay parameter as a named constant in a `config/gap-algorithm.ts` file separate from the implementation, or as a DB-stored config row.
- For autoresearch compatibility: the function signature should accept decay as a parameter with a default value sourced from config.
- Document the parameter and its expected range (0.5–0.95) so autoresearch has a search space.

**Warning signs:** The decay factor appears as a bare magic number (`0.8`) inside a computation function rather than a named constant.

**Phase:** GAP-01

---

### Pitfall 9: Dashboard Charts Re-Rendering on Every Keystroke

**What goes wrong:** Recharts (or any charting library) renders SVG. When a trainer views the per-associate detail (DASH-02) and types in notes or interacts with filter controls on the same page, React re-renders the chart on every keystroke. With 10+ data series and 20+ sessions per associate, this causes dropped frames and jank.

**Why it happens:** Chart components placed in the same component tree as interactive inputs share the render cycle. No memoization is applied because the dev machine is fast and the issue is invisible during development.

**Prevention:**
- Wrap chart components in `React.memo` and ensure the data prop is referentially stable (created once, not inline `{ data: sessions.map(...) }` on every render).
- Separate chart data computation into a `useMemo` hook keyed on the session array reference.
- Consider placing the chart in a sub-component with its own isolated state scope.

**Warning signs:** Profiler shows chart re-renders on text input events. Page feels sluggish on filter interactions.

**Phase:** DASH-02

---

### Pitfall 10: Rate Limit Service Breaking Under Dual-Write (File vs. DB)

**What goes wrong:** The existing `rateLimitService.ts` is entirely file-based (`data/rate-limits.json`). When Supabase persistence is added, there is a temptation to also migrate rate limits to Supabase for consistency. However, rate limit checks happen on every `/api/public/interview/*` request and need sub-10ms response time. A DB round-trip adds 20-80ms latency per check, doubling or tripling the response time for the public interview agent calls that are already doing LLM inference.

**Why it happens:** "Let's put everything in the DB" thinking during a persistence migration.

**Prevention:**
- Keep rate limits in the file system (or Redis if available) — they are ephemeral, high-frequency, and do not need relational querying.
- If migrating rate limits to DB later, use Supabase's edge functions or a Redis layer (Upstash), not Prisma queries in the critical path.
- Do not migrate rate limits in the same phase as session persistence.

**Warning signs:** Public interview agent API response times increase by 50+ ms after the DB migration. Profiling shows DB queries in the rate limit check path.

**Phase:** PERSIST-01 — explicitly scope out rate limit migration

---

## Minor Pitfalls

---

### Pitfall 11: Prisma Schema Out of Sync with `InterviewSession` TypeScript Type

**What goes wrong:** The existing `InterviewSession` type in `src/lib/types.ts` contains nested structures: `assessments: Record<string, QuestionAssessment>`, `starterQuestions: StarterQuestion[]`, `questions: ParsedQuestion[]`. If the Prisma schema stores these as a single `JSONB` column, Prisma returns `JsonValue` (not typed), requiring unsafe casts everywhere. If instead the schema fully normalizes into separate tables (`sessions`, `questions`, `assessments`), the TypeScript types need to be restructured — breaking every existing consumer of `InterviewSession`.

**Prevention:**
- Decide the normalization strategy upfront and communicate it in the schema design phase. Recommendation: Store `assessments` as `JSONB` (it's a write-once blob), but normalize `sessions`, `associates`, and `gap_snapshots` into proper tables. This limits the cast surface to one field.
- Create a `DbInterviewSession` type that mirrors the Prisma return shape and a mapping function `toInterviewSession(db: DbInterviewSession): InterviewSession` so the Zustand store and existing components are not aware of the DB shape.

**Phase:** PERSIST-01

---

### Pitfall 12: Gap Trend Direction Computed Inconsistently

**What goes wrong:** The readiness signal requires a "non-negative trend" (PROJECT.md). If trend is computed as `lastScore - firstScore` in some places and as a linear regression slope in others, the badge can show "Ready" on the dashboard but "Declining trend" in the detail view.

**Prevention:**
- Define trend computation as a single utility function in `src/lib/gap-algorithm.ts`. All consumers call the same function. Never inline trend logic.
- Document the definition: "trend = average score of most recent 3 sessions minus average score of 3 sessions before that."

**Phase:** GAP-01 / READY-01

---

### Pitfall 13: `data/` Directory Not Persisted in Docker Volume During Migration

**What goes wrong:** The dual-write strategy writes to `data/interview-history.json` as the fallback. In Docker on GCE, if the container is restarted without a volume mount for the `data/` directory, the JSON files are wiped. During the migration window, if the DB write fails (and it may, due to pitfall #1 or #3) and the file backup is also lost on restart, sessions are gone permanently.

**Prevention:**
- Verify `docker-compose.yml` has a volume mount for `./data:/app/data` before starting the migration phase.
- Confirm this is already configured before the first dual-write code lands.

**Warning signs:** History disappears after `docker compose down && docker compose up`.

**Phase:** PERSIST-01 — verify before any code is written

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| PERSIST-01: First Supabase write | Connection exhaustion (Pitfall 1), migration lock hang (Pitfall 3), Docker volume loss (Pitfall 13) | Singleton DB client, dual URL config, verify volume mount |
| PERSIST-01: Dual-write wiring | Silent DB failure divergence (Pitfall 2) | Structured error logging + sync check endpoint |
| PERSIST-02: Associate profiles | Slug uniqueness collision (Pitfall 7) | DB UNIQUE constraint + 409 error on collision |
| GAP-01: Gap algorithm | Cold start false alarms (Pitfall 4), hardcoded decay (Pitfall 8) | Minimum sessions gate, named constant in config file |
| GAP-02: Adaptive setup | Stale Zustand cache (Pitfall 6) | Never persist DB-sourced data in localStorage |
| DASH-01: Roster view | N+1 queries (Pitfall 5) | Eager-load with Prisma `include`, pre-compute badges on session save |
| DASH-02: Per-associate detail | Chart re-render jank (Pitfall 9), type mismatch (Pitfall 11) | `React.memo` + `useMemo`, mapping layer between DB and component types |
| READY-01/02: Readiness signals | Inconsistent trend computation (Pitfall 12) | Single utility function, documented formula |
| Rate limit migration | Latency regression (Pitfall 10) | Explicitly out-of-scope for this milestone |

---

## Sources

- Codebase analysis: `src/lib/rateLimitService.ts`, `src/lib/types.ts`, `src/store/interviewStore.ts`, `src/app/api/history/route.ts`, `src/lib/langchain.ts` — all read directly
- Project specification: `.planning/PROJECT.md` — read directly
- Confidence note: Web fetch and web search were unavailable during this research session. All Prisma/Supabase specifics (connection modes, pooler ports, migration lock behavior) are based on well-established documentation patterns from training data (confidence: MEDIUM). The Prisma singleton pattern and Supabase connection string format are stable and broadly documented. Verify current Supabase free tier connection limit (was 60 as of 2024) before implementation.
