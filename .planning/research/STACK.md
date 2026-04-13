# Technology Stack

**Project:** Next Level Mock — Readiness Engine (Persistence + Gap Tracking + Dashboard milestone)
**Researched:** 2026-04-13
**Scope:** Additions to existing Next.js 16.1.1 / React 19.2.3 / TypeScript 5 / Zustand 5 / LangGraph app

---

## Recommended Stack

### Database + ORM

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Prisma CLI | 7.7.0 | Schema migrations, type generation | Latest stable. Node >=20.19 required — Docker uses node:22-alpine, satisfied. `prisma migrate deploy` works cleanly in CI/Docker build. |
| @prisma/client | 7.7.0 | Type-safe query builder at runtime | Auto-generated from schema. Full TypeScript inference on queries. Pairs 1:1 with CLI version. |
| @prisma/adapter-pg | 7.7.0 | pg driver adapter for Prisma | Enables Prisma to use the native `pg` driver instead of its own binary driver — better connection pool control with Supabase's pgBouncer. |
| pg | 8.20.0 | PostgreSQL driver | Required peer for `@prisma/adapter-pg`. Mature, no breaking changes. |
| @types/pg | 8.20.0 | TypeScript types for pg | Dev dep only. |

**DO NOT use Prisma 5 or 6** — Prisma 7 is current stable with the `postgres` native driver and proper adapter API. Prisma 6 is legacy maintenance mode.

**Confidence:** HIGH — versions verified from npm registry directly.

#### Supabase Connection Pattern for Docker (Persistent Node Server)

This app runs as a persistent Node.js server (Docker + `node server.js`), NOT as serverless functions. This changes the connection pooling recommendation:

- Use the **Transaction Pooler** connection string from Supabase dashboard (port 6543, PgBouncer in transaction mode)
- Add `?connection_limit=5&pool_timeout=10` to the DATABASE_URL
- Do NOT use `?pgbouncer=true` session mode — that's for serverless/edge where each request gets a connection
- Set `@prisma/adapter-pg` for explicit pool control; configure `max: 5` in `pg.Pool`

```
# .env
DATABASE_URL="postgresql://[user]:[pass]@[host]:6543/[db]?pgbouncer=true&connection_limit=5&pool_timeout=10&sslmode=require"
# Also set DIRECT_URL for migrations (bypasses pooler)
DIRECT_URL="postgresql://[user]:[pass]@[host]:5432/[db]?sslmode=require"
```

In `prisma/schema.prisma`:
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

`directUrl` is required so `prisma migrate deploy` bypasses pgBouncer (migrations use DDL statements that fail in transaction pooler mode).

**Confidence:** HIGH — this is the canonical Prisma + Supabase pattern for non-serverless deployments. The `directUrl` field was added precisely for this use case.

---

### Supabase Client (For Future Realtime / Auth Prep)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @supabase/supabase-js | 2.103.0 | Supabase JS client | Use for future Realtime subscriptions (trainer dashboard live updates) and eventual auth migration. Do NOT use for data queries in MVP — Prisma handles that. |
| @supabase/ssr | 0.10.2 | Next.js App Router Supabase helpers | Handles cookie-based auth for server components and route handlers. Only needed when Supabase Auth is adopted. MVP can skip this. |

**MVP install decision:** Install `@supabase/supabase-js` now (small, isomorphic). Skip `@supabase/ssr` until auth migration.

**Confidence:** HIGH — versions verified from npm registry. `@supabase/ssr` 0.10.2 peer requires `@supabase/supabase-js: '^2.102.1'` — confirmed compatible with 2.103.0.

---

### Data Visualization (Trainer Dashboard Charts)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| recharts | 3.8.1 | Score trend lines, skill radar/bar charts | Supports React 19 (`peerDependencies: react '^16.8 || ^17 || ^18 || ^19'`). Composable SVG API. Well-documented. Largest React chart ecosystem with most StackOverflow answers. Ships with `LineChart`, `BarChart`, `RadarChart` — covers all NLM dashboard needs. |

**DO NOT use @tremor/react** — v3.18.7 (latest stable) has `peerDependencies: { react: '^18.0.0' }`. This app runs React 19.2.3. Tremor v4 (beta only, `4.0.0-beta-tremor-v4.4`) supports React 19 but is not stable. Using a beta UI library for a production dashboard adds unacceptable risk for a solo-developer timeline.

**DO NOT use @nivo** — v0.99.0 supports React 19, but brings the full D3 dependency tree (~200KB gzipped additional). Overkill for 3-4 chart types on an internal dashboard.

**DO NOT use victory** — v37.3.6 supports React 19 but has a heavier API surface than recharts for the same use cases. Less commonly used in Next.js App Router apps.

**Confidence:** HIGH — peer dependency compatibility verified directly from npm registry.

---

### Gap Tracking Algorithm (No External Library)

**Recommendation: Custom implementation, no npm package.**

The gap tracking algorithm specified in PROJECT.md is:
- Recency-weighted average per skill/topic: `score_n * 0.8^0 + score_(n-1) * 0.8^1 + ...` normalized
- Readiness signal: 75% weighted avg + 3 sessions + non-negative trend (last 3 sessions slope >= 0)
- Next recommended area: lowest weighted score topic

This is ~50 lines of pure TypeScript math. No library adds value here.

**DO NOT use ts-sm2** (or any SM-2 spaced repetition library) — SM-2 is designed for flashcard recall intervals. It models *when to next review* based on pass/fail. NLM needs *which area is weakest* based on scored assessments. Wrong problem domain.

**Confidence:** HIGH — the algorithm is fully specified in PROJECT.md. Verified `ts-sm2` package scope via npm (`0.99.0`) — it is indeed an SM-2 flashcard scheduler, not a gap scoring algorithm.

**Implementation location:** `src/lib/gapAlgorithm.ts` — pure functions, no side effects, easy to unit test and optimize via autoresearch later.

---

### Validation (Request Payloads)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| zod | 4.3.6 | API route input validation | Already the standard for Next.js App Router. Version 4 (latest stable) works with TypeScript 5. Use to validate incoming session payloads before Prisma writes. Do NOT add as a new dep — install and use. |

**Confidence:** HIGH — version verified from npm registry. No React peer dependency; pure TS.

---

### Data Fetching (Dashboard Pages)

**Recommendation: Native Next.js App Router fetch + React Server Components.**

Do NOT add TanStack Query (`@tanstack/react-query 5.99.0`) or SWR (`2.4.1`) for the trainer dashboard. Rationale:

- Dashboard data (roster, associate history, gap trends) is read-heavy with no real-time requirement in MVP
- Next.js App Router Server Components + route handlers provide sufficient data fetching patterns
- Adding a client-side cache library adds complexity for a solo dev with a 3-5 week timeline
- If Realtime is needed later (live score updates during trainer-led interviews), add Supabase Realtime subscriptions then

Exception: If the trainer roster page needs client-side polling (e.g., live score updates during an interview), use `useSWR` with a narrow scope. Install `swr 2.4.1` at that point only.

**Confidence:** MEDIUM — pragmatic recommendation based on project constraints. The case for React Server Components is well-established for read-heavy dashboards; TanStack Query adds genuine value only with optimistic updates or complex cache invalidation, which is absent here.

---

## Full Installation

```bash
# Database + ORM
npm install prisma@7.7.0 @prisma/client@7.7.0 @prisma/adapter-pg@7.7.0 pg@8.20.0
npm install -D @types/pg@8.20.0

# Supabase client (prep for future realtime/auth)
npm install @supabase/supabase-js@2.103.0

# Charts
npm install recharts@3.8.1

# Validation (if not already present)
npm install zod@4.3.6
```

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Charts | recharts 3.8.1 | @tremor/react 3.18.7 | Tremor v3 requires React ^18, incompatible with React 19.2.3 in this project |
| Charts | recharts 3.8.1 | @nivo (0.99.0) | Full D3 dependency tree (~200KB extra), overkill for 3-4 chart types |
| Charts | recharts 3.8.1 | react-chartjs-2 + chart.js | Canvas-based (not SVG), less composable, harder to theme with Tailwind 4 |
| ORM | Prisma 7.7.0 | Drizzle ORM | Drizzle has excellent DX but Prisma is already in PROJECT.md as a decided choice; consistent with existing decision log |
| ORM version | Prisma 7.7.0 | Prisma 6.14.0 | Prisma 7 is current stable; no reason to pin to 6 for this greenfield addition |
| Gap algorithm | Custom TS | ts-sm2 | SM-2 is for flashcard recall intervals, wrong problem domain |
| Gap algorithm | Custom TS | Any ML library | 50-line weighted average does not need ML infrastructure |
| Data fetching | RSC + fetch | TanStack Query | Unnecessary complexity for read-heavy dashboard with no optimistic updates in MVP |
| Supabase client | @supabase/supabase-js | Direct pg via Prisma only | Prisma handles data; Supabase client needed for future Realtime/auth migration path |

---

## Environment Variables to Add

```bash
DATABASE_URL="postgresql://[user]:[pass]@[host]:6543/[db]?pgbouncer=true&connection_limit=5&pool_timeout=10&sslmode=require"
DIRECT_URL="postgresql://[user]:[pass]@[host]:5432/[db]?sslmode=require"
NEXT_PUBLIC_SUPABASE_URL="https://[project].supabase.co"   # for future use
NEXT_PUBLIC_SUPABASE_ANON_KEY="[anon-key]"                 # for future use
```

`NEXT_PUBLIC_*` Supabase vars can be added to `.env` now but left unused until the Supabase client is actively called. They do not affect the Prisma connection.

---

## Key Risk: Prisma + Next.js Standalone Docker Build

Prisma generates a query engine binary at `npm install` time. With Next.js `output: 'standalone'`, the binary must be explicitly copied into the standalone output. Add to `next.config.ts`:

```typescript
// next.config.ts
const nextConfig = {
  output: 'standalone',
  experimental: {
    outputFileTracingIncludes: {
      '/*': ['./node_modules/.prisma/client/**'],
    },
  },
};
```

Without this, the production Docker container will fail with "PrismaClientInitializationError: Query engine binary not found."

**Confidence:** HIGH — this is a well-documented Next.js standalone + Prisma production issue with a known fix.

---

## Sources

- npm registry (direct version queries): prisma@7.7.0, @prisma/client@7.7.0, @prisma/adapter-pg@7.7.0, recharts@3.8.1, @tremor/react@3.18.7, @supabase/supabase-js@2.103.0, @supabase/ssr@0.10.2, zod@4.3.6, pg@8.20.0
- Peer dependency verification: recharts@3.8.1 React peer confirmed `^19.0.0` compatible; @tremor/react@3.18.7 confirmed React `^18.0.0` only (INCOMPATIBLE)
- Project constraints: Dockerfile (node:22-alpine), PROJECT.md decisions (Prisma + Supabase, 0.8 decay coefficient, dual-write migration)
- Node engine requirement: prisma@7.7.0 requires `^20.19 || ^22.12 || >=24.0` — satisfied by Docker node:22-alpine and local node v24.2.0
