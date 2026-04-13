# Phase 1: DB Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-13
**Phase:** 01-db-foundation
**Mode:** --auto (all decisions auto-selected)
**Areas discussed:** Schema scope, Health endpoint, Migration strategy, Connection pooling

---

## Schema Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal — test table + session skeleton | Proves connectivity without blocking Phase 2 schema decisions | ✓ |
| Full session/associate tables upfront | Defines complete data model early but risks rework | |
| Test table only (no domain tables) | Maximally minimal but less useful for Phase 2 | |

**User's choice:** [auto] Minimal — test table + session skeleton (recommended default)
**Notes:** Phase 2 owns the full session schema. Phase 1 just proves the pipeline works.

---

## Health Endpoint

| Option | Description | Selected |
|--------|-------------|----------|
| New `/api/health` route with JSON response | Standard pattern, testable by Docker HEALTHCHECK | ✓ |
| Extend existing root-page healthcheck | Less work but doesn't verify DB connectivity | |
| No health endpoint (rely on app pages) | Misses DB connectivity verification entirely | |

**User's choice:** [auto] New `/api/health` route (recommended default)
**Notes:** Docker HEALTHCHECK updated to use this instead of root-page spider.

---

## Migration Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Separate command (prisma migrate deploy) | No startup latency, CI/deploy script handles it | ✓ |
| Container startup script | Adds latency, failure loops on bad migration | |
| Docker build time | Requires DB access during build — breaks CI | |

**User's choice:** [auto] Separate command (recommended default)
**Notes:** Direct URL (port 5432) for migrations, pooler URL (port 6543) for runtime.

---

## Connection Pooling

| Option | Description | Selected |
|--------|-------------|----------|
| max: 5 via @prisma/adapter-pg | Matches CLAUDE.md stack decision, conservative for free tier | ✓ |
| max: 10 (default pg pool) | May exceed Supabase free tier limits | |
| No explicit pool config | Unpredictable connection behavior | |

**User's choice:** [auto] max: 5 via @prisma/adapter-pg (recommended default)
**Notes:** Documented in CLAUDE.md Technology Stack section.

---

## Claude's Discretion

- Schema file location (standard prisma/schema.prisma)
- Singleton implementation pattern
- outputFileTracingIncludes specifics

## Deferred Ideas

None.
