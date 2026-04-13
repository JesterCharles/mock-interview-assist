# Phase 1: DB Foundation - Research

**Researched:** 2026-04-13
**Domain:** Prisma 7 + Supabase (PostgreSQL) + Next.js 16 standalone Docker
**Confidence:** HIGH (stack versions verified against npm registry; key pitfalls verified via official Prisma docs and community discussions)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01 (Schema Scope):** Define minimal schema — one connectivity-test table plus a session table skeleton (id, timestamps). Full session/associate schema comes in Phases 2-3.
- **D-02 (Health Endpoint):** Create `/api/health` route that queries Supabase and returns `{ status: "ok", db: "connected" }` or error. Update Dockerfile HEALTHCHECK to use this endpoint.
- **D-03 (Migration Strategy):** Migrations run as a separate command (`npx prisma migrate deploy`) — NOT at container startup. Docker build does NOT run migrations. Deployment script / CI runs migrations against the direct URL (port 5432) before deploying.
- **D-04 (Connection Pooling):** Use `@prisma/adapter-pg` with explicit `pg.Pool` config: `max: 5, idleTimeoutMillis: 10000`. Runtime via Supabase Transaction Pooler (port 6543). Migrations via direct URL (port 5432).

### Claude's Discretion
- Prisma schema file location (`prisma/schema.prisma` — standard)
- Singleton implementation pattern (standard Next.js global pattern)
- `outputFileTracingIncludes` configuration specifics for Prisma binaries in Docker

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PERSIST-03 | Prisma singleton pattern prevents connection exhaustion on Supabase free tier | Singleton via `globalThis` pattern verified in official Prisma docs; `pg.Pool` with `max: 5` satisfies free-tier limits |
| PERSIST-06 | Docker production build includes Prisma binary via `outputFileTracingIncludes` | `outputFileTracingIncludes` with 3 paths verified; `prisma generate` in builder stage verified; Prisma 7 Docker-in-runner-stage deps researched |
| PERSIST-07 | Supabase connection uses pooler URL (port 6543) for runtime, direct URL (port 5432) for migrations | `DATABASE_URL` (pooler) vs `DIRECT_URL` (migrations) pattern confirmed; `prisma.config.ts` uses `datasource.url` for CLI |
</phase_requirements>

---

## Summary

Phase 1 establishes the database layer for Next Level Mock: Prisma 7 connects to Supabase Postgres, migrations run cleanly in CI/deployment (not at container startup), and Docker production images include the Prisma client binary. No application data writes occur in this phase — the goal is proving the pipeline works.

The critical technical challenge is **Prisma 7's breaking architecture changes** versus Prisma 6. The database URL moves out of `schema.prisma` into a new `prisma.config.ts` file; the driver adapter (`@prisma/adapter-pg`) becomes mandatory (not optional); the generated client lands outside `node_modules` by default; and the new `prisma-client` provider name has Turbopack compatibility issues with Next.js 16 that require mitigation.

The second major challenge is the **Next.js standalone Docker build**: the `outputFileTracingIncludes` config in `next.config.ts` must explicitly pull Prisma binaries into the standalone output, and `prisma generate` must run in the builder stage before `next build`. Without these, the production container crashes on startup with a missing-binary error.

**Primary recommendation:** Use `prisma-client-js` as the generator provider (not `prisma-client`) to avoid Turbopack/webpack bundling issues. Set `output = "../src/generated/prisma"` for a predictable import path within the existing `src/` structure. Use `--webpack` flag on dev/build scripts as a belt-and-suspenders safety measure until Turbopack + Prisma 7 stabilizes.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| prisma (CLI) | 7.7.0 | Schema migrations, type generation | Latest stable; Node ≥20.19 required — satisfied by node:22-alpine in Dockerfile and local node v24.2.0 |
| @prisma/client | 7.7.0 | Type-safe query builder at runtime | Auto-generated from schema; pairs 1:1 with CLI version |
| @prisma/adapter-pg | 7.7.0 | pg driver adapter | Mandatory in Prisma 7 (Rust-free architecture); enables explicit pool control |
| pg | 8.20.0 | PostgreSQL driver | Required peer for `@prisma/adapter-pg` |

**Version verification:** All four versions confirmed against npm registry on 2026-04-13. [VERIFIED: npm registry]

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @types/pg | 8.20.0 | TypeScript types for pg | Dev dep only; install alongside `pg` |
| dotenv | Bundled with Next.js | Env loading for `prisma.config.ts` | `prisma.config.ts` is executed by Prisma CLI directly (not by Next.js), so it needs explicit env loading |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `prisma-client-js` provider | `prisma-client` provider (new Prisma 7 default) | `prisma-client` breaks with Next.js 16 Turbopack — module resolution errors at runtime; `prisma-client-js` is battle-tested across bundlers [VERIFIED: github.com/prisma/prisma #28627, community reports] |
| Custom output path in `src/generated/prisma` | Default `node_modules/@prisma/client` location | Custom path gives predictable imports, avoids `node_modules` pollution, works better with standalone output; downside is import path must match exactly |

**Installation:**
```bash
npm install @prisma/client@7.7.0 @prisma/adapter-pg@7.7.0 pg@8.20.0
npm install --save-dev prisma@7.7.0 @types/pg@8.20.0
```

---

## Architecture Patterns

### Recommended Project Structure

```
prisma/
├── schema.prisma          # DB schema (no URL — moved to prisma.config.ts)
├── migrations/            # Auto-generated by migrate dev/deploy
└── prisma.config.ts       # NEW in Prisma 7: CLI config + datasource URL

src/
├── generated/
│   └── prisma/            # Prisma-generated client (output = "../src/generated/prisma")
├── lib/
│   └── prisma.ts          # Singleton PrismaClient instance
└── app/
    └── api/
        └── health/
            └── route.ts   # /api/health — DB connectivity check (D-02)
```

### Pattern 1: Prisma 7 Configuration Files

**What:** In Prisma 7, database URLs move out of `schema.prisma` and into a new `prisma.config.ts` at the project root. The schema file keeps `provider` but drops `url`.

**schema.prisma:**
```prisma
// Source: Prisma v7 official migration guide — prisma.io/docs/ai/prompts/prisma-7
generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
  // NOTE: url is intentionally absent — it lives in prisma.config.ts
}
```

**prisma.config.ts (project root):**
```typescript
// Source: Prisma v7 official migration guide — prisma.io/docs/ai/prompts/prisma-7
import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DIRECT_URL'),  // DIRECT_URL = port 5432 for migrate dev/deploy
  },
})
```

**Why `DIRECT_URL` in prisma.config.ts:** Migrations must bypass PgBouncer (Transaction Pooler) and connect directly to Postgres. The `datasource.url` in `prisma.config.ts` is used by the Prisma CLI for all migration commands. [CITED: CLAUDE.md §Supabase Connection Pattern]

**tsconfig.json change required:**
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    "prisma.config.ts"   // ADD: TypeScript sees prisma.config.ts at root
  ]
}
```

The existing `tsconfig.json` uses `"**/*.ts"` in `include` which already covers `prisma.config.ts` at the root — no change may be required. However, explicitly adding it is safer. [VERIFIED: existing tsconfig.json read]

### Pattern 2: Prisma Client Singleton with `@prisma/adapter-pg`

**What:** Single PrismaClient instance per process using `globalThis`, combined with explicit `pg.Pool` for connection control. This is the canonical Prisma + Next.js pattern, adapted for the `@prisma/adapter-pg` requirement in Prisma 7.

```typescript
// src/lib/prisma.ts
// Source: Prisma official docs (prisma.io/docs/orm/more/troubleshooting/nextjs) + adapter-pg pattern
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/generated/prisma'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,  // Transaction Pooler — port 6543
    max: 5,
    idleTimeoutMillis: 10_000,
  })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```

**Key details:**
- `DATABASE_URL` points to the Transaction Pooler (port 6543, `?connection_limit=5&pool_timeout=10` recommended in connection string as belt-and-suspenders)
- `max: 5` on `pg.Pool` + `connection_limit=5` on the URL both cap connections — Supabase free tier allows 60 connections but pooler limits per client
- In production, no `globalThis` assignment is needed — Next.js server process is long-running, so one instance is created once [CITED: prisma.io/docs/orm/more/troubleshooting/nextjs]

### Pattern 3: `outputFileTracingIncludes` for Docker Standalone Build

**What:** Next.js standalone output omits Prisma binaries because they are not explicitly `import`-ed in application code. `outputFileTracingIncludes` forces their inclusion.

```typescript
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingIncludes: {
    '/': [
      './node_modules/prisma/**/*',
      './node_modules/@prisma/**/*',
      './node_modules/.bin/**/*',
    ],
  },
}

export default nextConfig
```

**Why three paths:**
- `./node_modules/prisma/**/*` — Prisma CLI package
- `./node_modules/@prisma/**/*` — Engine binaries and adapter packages
- `./node_modules/.bin/**/*` — Executable symlinks that `npx prisma` needs to discover the binary [CITED: nextjs-forum.com/post/1280550687998083198]

### Pattern 4: Dockerfile Changes for Prisma 7

**What:** The builder stage must run `prisma generate` before `next build`. The runner stage must have access to Prisma runtime deps and the generated client.

```dockerfile
# Stage 2: Builder — add after COPY . .
COPY prisma ./prisma/
RUN npx prisma generate    # Must run before npm run build

# Then: npm run build (standalone output captures generated client via outputFileTracingIncludes)
RUN npm run build

# Stage 3: Runner — no prisma generate needed (client already in .next/standalone)
# But migrate deploy is run OUTSIDE the container (D-03 decision)
```

**Critical Prisma 7 Docker issue:** If `prisma migrate deploy` is ever run inside the runner stage, `prisma.config.ts` needs these additional modules that standalone output excludes:

```dockerfile
# Only needed if running migrate deploy inside runner — NOT needed for this phase (D-03)
COPY --from=builder /app/node_modules/dotenv ./node_modules/dotenv
COPY --from=builder /app/node_modules/effect ./node_modules/effect
COPY --from=builder /app/node_modules/fast-check ./node_modules/fast-check
COPY --from=builder /app/node_modules/pure-rand ./node_modules/pure-rand
```

Since D-03 mandates migrations run outside the container, this is **not required in Phase 1** — but documented here so the planner knows why migrations must stay external. [VERIFIED: github.com/prisma/prisma/discussions/28759]

### Pattern 5: Health Endpoint (D-02)

```typescript
// src/app/api/health/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({ status: 'ok', db: 'connected' })
  } catch (error) {
    return NextResponse.json(
      { status: 'error', db: 'disconnected', detail: String(error) },
      { status: 503 }
    )
  }
}
```

Dockerfile HEALTHCHECK update:
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1
```

### Anti-Patterns to Avoid

- **`new PrismaClient()` inside a route handler or service function:** Creates a new connection pool on every request. In Next.js App Router, route handlers can run many times per minute. Always import the singleton from `src/lib/prisma.ts`.
- **Putting `DATABASE_URL` in `datasource { url }` in schema.prisma:** This is removed in Prisma 7. The CLI reads from `prisma.config.ts` now. Leaving both causes config conflicts.
- **Using `provider = "prisma-client"` (new Prisma 7 name) in Next.js 16:** Breaks with Turbopack's module resolution. Use `prisma-client-js` until official Turbopack support lands. [VERIFIED: community reports, github issues]
- **Running `prisma migrate deploy` inside the Docker container start command:** Blocks startup, can fail if DB is unreachable, and creates a restart loop. D-03 correctly mandates external migration runs.
- **Forgetting `COPY prisma ./prisma/` before `prisma generate` in the builder stage:** The schema must be present before code generation runs.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Connection pooling | Custom connection manager | `pg.Pool` with `@prisma/adapter-pg` | PgBouncer transaction mode + pool sizing handles connection limits; hand-rolled pools miss idle timeouts, error handling, and backpressure |
| Singleton enforcement | Module-level variable | `globalThis` pattern | Module-level vars are re-instantiated on Next.js hot reload; `globalThis` persists across reloads |
| DB health check | TCP ping or custom SQL | `prisma.$queryRaw\`SELECT 1\`` | Tests the full Prisma connection stack (adapter + pool + pg), not just TCP reachability |
| Migration management | Manual SQL files | `prisma migrate deploy` | Tracks migration history, prevents double-applying, handles checksums |

---

## Common Pitfalls

### Pitfall 1: Prisma 7 Provider Name Breaks Next.js 16 Turbopack

**What goes wrong:** Setting `provider = "prisma-client"` (the Prisma 7 default/new name) causes "Cannot find module" errors at Next.js runtime with Turbopack enabled.

**Why it happens:** Prisma 7's new provider generates code with an ESM import structure (`import ... from "./internal/class.js"`) that Turbopack cannot resolve because only `class.ts` exists — Turbopack does not auto-resolve `.js` → `.ts`. [VERIFIED: github.com/prisma/prisma issue #28627]

**How to avoid:** Use `provider = "prisma-client-js"` in `schema.prisma`. Optionally add `--webpack` to dev/build scripts as belt-and-suspenders.

**Warning signs:** Runtime error mentioning `@prisma/client/default` or `Cannot find module '.prisma/client'` in build logs.

### Pitfall 2: Missing Prisma Binaries in Docker Standalone Output

**What goes wrong:** Production container starts, first request hits the DB, crashes with `PrismaClientInitializationError: Unable to require('...') - Prisma binary not found`.

**Why it happens:** Next.js `output: 'standalone'` traces only statically imported modules. Prisma's native binary is loaded dynamically at runtime, so file-tracing misses it.

**How to avoid:** Add `outputFileTracingIncludes` in `next.config.ts` for all three node_modules paths. Run `prisma generate` in the builder stage BEFORE `next build` so the generated client is present when tracing runs. [CITED: nextjs-forum.com/post/1280550687998083198]

**Warning signs:** Build succeeds but container crashes on first DB operation. Check with `docker exec <container> ls .next/standalone/node_modules/@prisma`.

### Pitfall 3: prisma.config.ts TypeScript Errors

**What goes wrong:** TypeScript complains that `prisma.config.ts` is outside `rootDir` or uses unknown imports from `prisma/config`.

**Why it happens:** The existing `tsconfig.json` may have `rootDir: "./src"` (this project currently doesn't — it uses `"**/*.ts"` which is fine). The `prisma/config` module is only available after installing `prisma@7.x`.

**How to avoid:** Confirm `tsconfig.json` does NOT restrict `rootDir` to `./src`. Add `"prisma.config.ts"` to `include` array if TypeScript still complains. The current `tsconfig.json` uses `"**/*.ts"` in include, which already covers the root file. [VERIFIED: existing tsconfig.json in repo]

### Pitfall 4: Connection String Format for Supabase Transaction Pooler

**What goes wrong:** Queries hang or fail with `prepared statement does not exist` when using PgBouncer in transaction mode.

**Why it happens:** PgBouncer transaction mode does not support PostgreSQL named prepared statements. Prisma's default query mode uses prepared statements.

**How to avoid:** The `@prisma/adapter-pg` already handles this correctly — `pg` driver in simple query mode is compatible with transaction pooler. Ensure `DATABASE_URL` points to port 6543 (Transaction Pooler), not 5432 (direct). Add `?connection_limit=5&pool_timeout=10` to the URL as belt-and-suspenders alongside the `pg.Pool` `max: 5` setting. [CITED: CLAUDE.md §Supabase Connection Pattern]

### Pitfall 5: Forgetting `prisma generate` Does Not Run Automatically in Prisma 7

**What goes wrong:** Running `npx prisma migrate dev` (or any migration command) does NOT regenerate the client in Prisma 7 — the client becomes stale.

**Why it happens:** Breaking change in Prisma 7: `migrate dev` and `db push` no longer auto-run `prisma generate`. [VERIFIED: Prisma v7 upgrade guide]

**How to avoid:** Add `"postinstall": "prisma generate"` to `package.json` scripts. In Dockerfile, run `npx prisma generate` explicitly in the builder stage, not relying on migrate hooks.

---

## Code Examples

### Minimal Schema (Phase 1 scope — D-01)

```prisma
// prisma/schema.prisma
// Source: Prisma v7 official docs (prisma.io/docs/ai/prompts/prisma-7)
generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

// Connectivity test table — proves the pipeline works
model HealthCheck {
  id        Int      @id @default(autoincrement())
  createdAt DateTime @default(now())
}

// Session skeleton — expanded in Phase 2
model Session {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Environment Variables

```bash
# .env (local dev)
# Runtime queries — Transaction Pooler (PgBouncer), port 6543
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?connection_limit=5&pool_timeout=10"

# Migrations only — Direct connection, port 5432
DIRECT_URL="postgresql://postgres.[project-ref]:[password]@db.[project-ref].supabase.co:5432/postgres"
```

```bash
# .env.docker (production Docker)
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?connection_limit=5&pool_timeout=10
DIRECT_URL=postgresql://postgres.[project-ref]:[password]@db.[project-ref].supabase.co:5432/postgres
```

### package.json Scripts Addition

```json
{
  "scripts": {
    "dev": "next dev --webpack",
    "build": "next build --webpack",
    "start": "next start",
    "lint": "eslint",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate deploy",
    "postinstall": "prisma generate"
  }
}
```

**Note on `--webpack`:** Disables Turbopack for dev and build. Belt-and-suspenders mitigation for the Prisma 7 + Turbopack module resolution issue documented in Pitfall 1. Remove once Prisma officially supports Turbopack. [MEDIUM confidence — recommended by community, not yet an official Prisma directive]

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `url = env("DATABASE_URL")` in `datasource db {}` in schema.prisma | `prisma.config.ts` at project root with `datasource.url` | Prisma 7.0 (2025) | schema.prisma no longer holds connection config; tsconfig may need update |
| `prisma generate` auto-runs after `migrate dev` | Manual `prisma generate` required | Prisma 7.0 | Must add postinstall hook and explicit Dockerfile step |
| Provider `prisma-client-js` generates to `node_modules/@prisma/client` | Provider `prisma-client` generates to custom `output` path | Prisma 7.0 | Custom output path works BUT breaks Turbopack — use `prisma-client-js` for Next.js 16 |
| Prisma binary bundled automatically in standalone builds | Must use `outputFileTracingIncludes` | Next.js standalone + Prisma 5+ | Without config, binary missing in Docker |

**Deprecated/outdated:**
- `url = env("DATABASE_URL")` in schema.prisma datasource: Deprecated in Prisma 7 (still functional but warning-level; moved to prisma.config.ts)
- `provider = "prisma-client"` with Next.js 16 + Turbopack: Functionally broken in current Prisma 7.7.0 + Next.js 16.1.1 combination — use `prisma-client-js`

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `--webpack` flag on next dev/build is the safest mitigation for Prisma 7 + Turbopack; Turbopack will not be officially supported until a future Prisma release | Standard Stack, Anti-Patterns | Risk LOW: worst case, Turbopack works fine and `--webpack` is unnecessary — it's a regression (slower builds) not a breakage |
| A2 | `"**/*.ts"` in existing tsconfig.json `include` already covers `prisma.config.ts` at root without modification | Architecture Patterns | Risk LOW: if tsconfig errors appear on prisma.config.ts, adding explicit entry to `include` fixes it in minutes |
| A3 | Supabase Transaction Pooler (port 6543) is compatible with `pg` driver in the way `@prisma/adapter-pg` uses it | Standard Stack | Risk MEDIUM: if incompatible, switch to Session Pooler (port 5432 with pgbouncer=true param) — well-documented fallback |

---

## Open Questions

1. **`postinstall` script and Docker build layer caching**
   - What we know: `"postinstall": "prisma generate"` runs after `npm ci` in the deps stage; but `prisma/schema.prisma` is not yet present in the deps stage
   - What's unclear: Does postinstall fail silently (no schema = no generation) or hard-fail in the deps stage?
   - Recommendation: Run `prisma generate` explicitly in the builder stage after `COPY prisma ./prisma/`, separate from postinstall. Keep postinstall for local developer workflow only.

2. **Supabase project credentials**
   - What we know: `DATABASE_URL` and `DIRECT_URL` must be provisioned from the Supabase dashboard
   - What's unclear: Whether the developer has already created the Supabase project and has credentials ready
   - Recommendation: Wave 0 of the plan should include a manual step: "Obtain DATABASE_URL and DIRECT_URL from Supabase dashboard." This is a human-action prerequisite, not code.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Prisma CLI, build scripts | ✓ | v24.2.0 | — |
| npm | Package installation | ✓ | 11.3.0 | — |
| Docker | Production build testing | Not checked | — | Can test without Docker until integration wave |
| Supabase project + credentials | PERSIST-07, health endpoint | Unknown | — | Use local Postgres for dev if Supabase not yet provisioned |

**Missing dependencies with no fallback:**
- Supabase credentials (`DATABASE_URL`, `DIRECT_URL`) — these are human-provisioned prerequisites. The plan must include a Wave 0 prerequisite check for these values.

**Missing dependencies with fallback:**
- Docker: Prisma singleton and health endpoint can be developed and tested locally with `npm run dev`; Docker integration tested separately.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected in codebase — no test files, no jest/vitest/pytest config |
| Config file | None — Wave 0 must establish |
| Quick run command | `npx jest --testPathPattern=health` (after Wave 0 installs Jest) |
| Full suite command | `npx jest` |

**Note:** The project has no test infrastructure. Given the phase is infrastructure-level (DB connection, Docker binary), the most practical validation approach for this phase is:
1. Integration smoke tests (actual DB connection required — can be manual verification)
2. Unit-testable: singleton returns same instance across imports
3. E2E testable: `curl http://localhost:3000/api/health` returns 200

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PERSIST-03 | Singleton returns same PrismaClient instance on repeated import | Unit | `npx jest tests/lib/prisma.test.ts -x` | ❌ Wave 0 |
| PERSIST-06 | Docker image contains Prisma binary at expected path | Smoke (Docker) | `docker exec <container> ls .next/standalone/node_modules/@prisma/engines` | ❌ Manual |
| PERSIST-07 | Runtime URL uses port 6543; migration URL uses port 5432 | Config verification | Environment variable inspection in health endpoint response (dev only) | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx jest tests/lib/prisma.test.ts -x` (once test file exists)
- **Per wave merge:** `npx jest` (full suite)
- **Phase gate:** `curl http://localhost:3000/api/health` returns `{"status":"ok","db":"connected"}` before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] No test runner installed — install jest + ts-jest or vitest: `npm install --save-dev jest ts-jest @types/jest` (or vitest equivalent)
- [ ] `tests/lib/prisma.test.ts` — singleton unit test (PERSIST-03)
- [ ] `tests/api/health.test.ts` — health endpoint mock test (D-02)
- [ ] `jest.config.ts` or `vitest.config.ts` — test runner config

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Not in scope for DB foundation |
| V3 Session Management | No | Not in scope |
| V4 Access Control | No | `/api/health` intentionally public for Docker HEALTHCHECK |
| V5 Input Validation | No | No user-supplied input in this phase |
| V6 Cryptography | No | Connection strings use TLS by default via Supabase |
| V9 Communications | Yes | Supabase enforces TLS — no plaintext connections permitted |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Connection string in env vars exposed via health endpoint | Information Disclosure | Health endpoint must NOT echo the DATABASE_URL — only return `{status, db}` |
| Supabase credentials in `.env` committed to git | Information Disclosure | `.env` and `.env.docker` already (should be) in `.gitignore`; verify during implementation |
| Connection pool exhaustion from repeated health checks | DoS | HEALTHCHECK interval of 30s is safe; health endpoint uses `SELECT 1` (lightweight) |

---

## Sources

### Primary (HIGH confidence)
- [Prisma v7 Upgrade Guide](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7) — Breaking changes, prisma.config.ts requirement, datasource migration, generate behavior change
- [Prisma Next.js Troubleshooting](https://www.prisma.io/docs/orm/more/troubleshooting/nextjs) — Official singleton pattern
- [Prisma v7 Migration Prompt](https://www.prisma.io/docs/ai/prompts/prisma-7) — Full v7 setup instructions, schema format, adapter instantiation
- [npm registry](https://registry.npmjs.org) — prisma@7.7.0, @prisma/client@7.7.0, @prisma/adapter-pg@7.7.0, pg@8.20.0 versions verified 2026-04-13
- Existing codebase: `Dockerfile`, `next.config.ts`, `package.json`, `tsconfig.json`, `docker-compose.yml` — all read directly

### Secondary (MEDIUM confidence)
- [Next.js Forum: Prisma binary in standalone build](https://nextjs-forum.com/post/1280550687998083198) — `outputFileTracingIncludes` three-path solution
- [GitHub Discussion: Prisma 7 Docker runner stage](https://github.com/prisma/prisma/discussions/28759) — `effect`, `fast-check`, `pure-rand` deps required in runner if running migrate deploy inside container
- [Prisma Next.js Guide](https://www.prisma.io/docs/guides/nextjs) — Prisma v7 + Next.js adapter setup
- [DEV: Prisma 7 + Next.js 16 task app](https://dev.to/myogeshchavan97/how-to-build-a-task-management-app-using-nextjs-16-and-prisma-7-4mcf) — Practical full working config (uses SQLite but pattern applies)
- [How I Configured Prisma 7](https://medium.com/@gargdev010300/how-i-configured-prisma-7-new-changes-issues-and-how-i-solved-them-d5ca728c5b9f) — prisma.config.ts practical walkthrough

### Tertiary (LOW confidence)
- [Prisma 7 + Turbopack compatibility fix](https://medium.com/@chakhit.kanchana/fixes-the-issue-where-prisma-7-is-not-compatible-with-nextjs-16-564dc6979636) — `--webpack` flag recommendation (community workaround, not official Prisma guidance)
- [Next.js + Prisma Docker textbook](https://blog.jonrshar.pe/2024/Dec/24/nextjs-prisma-docker.html) — prebuild script pattern (Dec 2024, pre-Prisma 7, pattern still valid)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all four package versions verified against npm registry on 2026-04-13
- Architecture: HIGH — singleton pattern from official Prisma docs; Docker outputFileTracingIncludes verified via Next.js forum; Prisma 7 config changes from official upgrade guide
- Pitfalls: HIGH for Pitfalls 1-4 (multiple verified sources); MEDIUM for Pitfall 5 (Prisma 7 generate change — official docs only, not independently confirmed by reproduction)

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (30 days — Prisma 7 is newly released; ecosystem guidance may improve)
