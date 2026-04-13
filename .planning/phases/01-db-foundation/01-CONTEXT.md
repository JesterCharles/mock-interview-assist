# Phase 1: DB Foundation - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Stand up the database layer: Prisma connects to Supabase, migrations run cleanly, and Docker production builds include Prisma binaries. No application-level data writes — that's Phase 2.

</domain>

<decisions>
## Implementation Decisions

### Schema Scope
- **D-01:** Define minimal schema in Phase 1 — one connectivity-test table plus a session table skeleton (id, timestamps). Full session/associate schema comes in Phases 2-3. Goal is proving the pipeline works, not modeling the domain.

### Health Endpoint
- **D-02:** Create a new `/api/health` route that queries Supabase and returns JSON `{ status: "ok", db: "connected" }` or appropriate error. Update Dockerfile HEALTHCHECK to use this endpoint instead of the current root-page spider.

### Migration Strategy
- **D-03:** Migrations run as a separate command (`npx prisma migrate deploy`) — NOT at container startup. This avoids startup latency and failure loops. Docker build does NOT run migrations. Deployment script or CI runs migrations against the direct URL (port 5432) before deploying the new container.

### Connection Pooling
- **D-04:** Use `@prisma/adapter-pg` with explicit `pg.Pool` config: `max: 5, idleTimeoutMillis: 10000`. Connect via Supabase Transaction Pooler (port 6543) for runtime queries. Direct URL (port 5432) for migrations only. Matches CLAUDE.md documented stack decision.

### Claude's Discretion
- Prisma schema file location (`prisma/schema.prisma` — standard)
- Singleton implementation pattern (standard Next.js global pattern)
- `outputFileTracingIncludes` configuration specifics for Prisma binaries in Docker

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Stack Decisions
- `CLAUDE.md` §Technology Stack — Prisma 7.7.0, @prisma/client 7.7.0, @prisma/adapter-pg 7.7.0, pg 8.20.0 versions locked
- `CLAUDE.md` §Supabase Connection Pattern for Docker — Transaction Pooler, connection_limit=5, pool_timeout=10
- `CLAUDE.md` §Key Risk: Prisma + Next.js Standalone Docker Build — outputFileTracingIncludes guidance

### Project Context
- `.planning/PROJECT.md` — Constraints: solo dev, backwards compatible, Docker deployment on GCE
- `.planning/REQUIREMENTS.md` — PERSIST-03, PERSIST-06, PERSIST-07 are this phase's requirements

### Existing Infrastructure
- `Dockerfile` — Multi-stage build, node:22-alpine, standalone output
- `docker-compose.yml` — Port 80→3000, ./data volume, .env.docker
- `next.config.ts` — `output: 'standalone'` already configured
- `src/lib/types.ts` — Existing TypeScript types that Prisma schema should align with (InterviewSession, QuestionAssessment, etc.)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None directly — no DB code exists yet. This is greenfield for Phase 1.

### Established Patterns
- `src/lib/*.ts` — Service modules export functions, no class patterns
- `src/lib/auth-server.ts` — Server-side utility pattern (likely similar for DB client)
- File-based JSON storage in `data/` — the pattern being supplemented (not replaced) by Supabase
- `src/lib/cleanupService.ts` + `src/lib/instrumentation.ts` — Existing lifecycle hooks (cleanup on boot + interval)

### Integration Points
- `next.config.ts` — Needs `outputFileTracingIncludes` for Prisma binary in Docker standalone
- `Dockerfile` — Needs `prisma generate` in builder stage, binary copy in runner stage
- `.env` / `.env.docker` — Needs DATABASE_URL and DIRECT_URL environment variables
- `docker-compose.yml` — May need DATABASE_URL in env_file reference
- `package.json` — Needs prisma, @prisma/client, @prisma/adapter-pg, pg dependencies

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for Prisma + Supabase + Docker integration.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-db-foundation*
*Context gathered: 2026-04-13*
