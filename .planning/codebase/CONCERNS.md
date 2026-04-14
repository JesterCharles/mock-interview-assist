# CONCERNS.md — Technical Debt, Risks & Areas of Concern

## Technical Debt

### Dual-Write Migration (Medium Priority)
File storage (`data/interview-history.json`) and Supabase run in parallel. File layer remains source of truth for the existing interview flow; Supabase is source of truth for trainer dashboard, gaps, and readiness. This creates two sources of truth that can drift.

**Files**: `src/app/api/history/route.ts`, `src/lib/historyService.ts`, `src/lib/sessionPersistence.ts`
**Risk**: Session exists in file but not DB (or vice versa) if one write fails.
**Mitigation**: `/api/sync-check` route exists for parity checking. DB failures are logged but do not block file writes.

### LLM Scoring Duplication (Low Priority)
Two separate LLM integration points:
1. `src/app/api/score/route.ts` — full LangGraph workflow with conditional routing (primary)
2. `src/lib/langchain.ts` — simpler chain with `ScoringQueue` class

The `langchain.ts` file appears to be an earlier implementation kept for backward compatibility. The API route is the active scoring path.

**Risk**: Drift between the two implementations' prompt templates and scoring logic.

### JSON Fields in Prisma Schema (Accepted)
`Session` model stores `questions`, `starterQuestions`, `assessments`, `techMap`, and `selectedWeeks` as `Json` columns. Type safety is lost at the DB boundary — requires manual casting (`as unknown as InterviewSession['questions']`) on read.

**Files**: `prisma/schema.prisma`, `src/lib/gapPersistence.ts` (lines 46-63)

### File-Based Rate Limiting (Accepted for MVP)
Rate limits stored in `data/rate-limits.json`. Not suitable for multi-instance deployment. The file is cleaned up every 24 hours by `cleanupService.ts`.

**File**: `src/lib/rateLimitService.ts`

## Security Considerations

### Single-Password Auth
Authentication uses a single shared password (`APP_PASSWORD` env var) with an HttpOnly cookie (`nlm_session=authenticated`, 24hr expiry). No per-user accounts, no RBAC, no session IDs.

**Files**: `src/app/api/auth/route.ts`, `src/middleware.ts`, `src/lib/auth-server.ts`, `src/lib/auth-context.tsx`
**Risk**: Cookie value is a static string ("authenticated"), not a signed token. Anyone who knows the cookie value can forge auth. Acceptable for single-trainer MVP.

### Client-Side Auth State
`auth-context.tsx` stores auth state in localStorage (`interview-app-auth`). This is a convenience mirror — the real auth check happens server-side via cookie in middleware and route handlers. But client-side state can be manipulated.

### API Key Exposure Prevention
`OPENAI_API_KEY` and `GITHUB_TOKEN` are server-side only. GitHub API calls are proxied through `/api/github` to keep the token off the client.

### Slug Validation
Associate slugs are validated with Zod (`src/lib/slug-validation.ts`): lowercase alphanumeric + hyphens, 2-64 chars. Applied before DB operations.

## Performance Considerations

### Synchronous Bulk Readiness Recompute
`recomputeAllReadiness()` in `src/lib/readinessService.ts` iterates all associates sequentially. Comment notes this is safe for MVP (<200 associates) but would need background processing at scale.

### Fire-and-Forget Gap Pipeline
Gap score computation and readiness classification run as fire-and-forget after session save. If the process crashes mid-pipeline, gap scores may be stale until next session save.

**File**: `src/app/api/history/route.ts` (lines 56-72)

### No Caching Layer
All trainer dashboard reads hit Prisma/Supabase directly. No Redis, no ISR, no client-side cache library. Acceptable for current scale.

### PDF Generation Client-Side
`@react-pdf/renderer` (340-line template in `PDFReport.tsx`) renders in the browser. Large reports could be slow on low-powered devices.

## Fragile Areas

### Score Response Parsing
LLM response parsing in `src/app/api/score/route.ts` uses multiple regex patterns to extract SCORE and FEEDBACK. If the LLM changes its output format, parsing fails silently to default values (score=3, generic feedback).

**Lines**: 302-352 in `src/app/api/score/route.ts`

### Markdown Parser
`src/lib/markdownParser.ts` parses question bank files using regex. Depends on specific markdown formatting conventions (`### Q#:`, `**Keywords:**`, `<details>` blocks). Non-conforming question files will be silently skipped.

### techMap Dependency
Gap scoring depends on `session.techMap` being present and correctly mapping weekNumbers to skill names. Sessions without techMap (pre-migration) produce no gap scores.

### Classification Cascade Ordering
In `readinessService.ts`, the classification cascade is order-dependent: `ready` must be checked before `improving`. If the order changes, above-threshold associates with positive trends would be misclassified as "improving" instead of "ready".

**File**: `src/lib/readinessService.ts` (lines 143-153)

## Missing Capabilities

- **No per-user auth**: Single shared password, no individual accounts
- **No E2E tests**: No Playwright/Cypress test suite
- **No API route tests**: Route handlers untested
- **No component tests**: No React Testing Library
- **No monitoring/observability**: No structured logging, no APM, no error tracking (Sentry, etc.)
- **No rate limiting on authenticated routes**: Only public interview routes are rate-limited
- **No database migrations CI**: Prisma migrations run manually or during Docker build
- **No CI/CD pipeline**: No GitHub Actions or equivalent
