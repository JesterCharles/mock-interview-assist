# INTEGRATIONS.md — External Services & APIs

## Supabase (PostgreSQL)

**Connection**: Prisma ORM via `@prisma/adapter-pg` with `pg.Pool`.
**Singleton**: `src/lib/prisma.ts` — global singleton, pool max 5 connections.
**Transaction pooler**: Port 6543 (pgBouncer). Direct connection on port 5432 for migrations only.

**Models** (4 tables + 1 health check):
- `Associate` — identity (slug, displayName), readiness fields (status, recommendedArea, lastComputedAt)
- `Session` — full interview data (JSON fields for questions, assessments, techMap), linked to Associate via associateId
- `GapScore` — per-skill recency-weighted scores, unique constraint on (associateId, skill, topic)
- `Settings` — singleton row (id=1), readiness threshold (default 75%)
- `HealthCheck` — connectivity test (autoincrement id, createdAt)

**Health check**: `GET /api/health` runs `prisma.healthCheck.create()` to verify DB connectivity.

## OpenAI (GPT-4o-mini)

**Service**: `src/app/api/score/route.ts` (LangGraph workflow) + `src/lib/langchain.ts` (simple chain).
**Model**: gpt-4o-mini, temperature 0.3.
**Auth**: `OPENAI_API_KEY` from env (server-side only).

**Three scoring paths** (LangGraph conditional routing via `StateGraph`):
1. **Technical questions** — keyword matching + soft skills + model answer comparison
2. **Starter/behavioral questions** — guideline-based evaluation (no keywords)
3. **Public interview questions** — transcript-based evaluation (text only, no soft skills)

**Response parsing**: Multiple regex patterns for extracting SCORE (1-5) and FEEDBACK from LLM output.

**Prompt engineering**: Extensive prompt templates with semantic flexibility, NDA awareness, and anti-hyper-critical scoring guidelines. Prompts are defined in `src/app/api/score/route.ts` (`TECHNICAL_SCORING_PROMPT`, `STARTER_SCORING_PROMPT`, `PUBLIC_SCORING_PROMPT`).

## GitHub API

**Service**: `src/lib/github-service.ts` (client-side class) + `src/app/api/github/route.ts` (server proxy).
**Auth**: `GITHUB_TOKEN` kept server-side, proxied through `/api/github`.
**Purpose**: Fetch question bank markdown files from configurable GitHub repo.
**Default repo**: `Cognizant-Training/Question-Bank` (branch: main).

**Operations**:
- `getContents(path)` — list directory contents via proxy
- `getFileContent(path)` — fetch raw file content via proxy
- `findQuestionBanks(path)` — recursive search for .md files (parallel subdirectory fetch)

## Resend (Email)

**Service**: `src/app/api/send-email/route.ts`.
**Auth**: `RESEND_API_KEY` from env.
**Purpose**: Send PDF interview reports to candidates as email attachments.
**Template**: `src/lib/email-templates.ts` — branded HTML with strengths/improvements sections.

## FingerprintJS (Client-side)

**Library**: `@fingerprintjs/fingerprintjs` ^5.1.0.
**Purpose**: Device fingerprinting for rate limiting public interviews.
**Rate limits**: 2 interviews per 13-hour session, 125/day global.
**Storage**: `data/rate-limits.json` (file-based).
**Service**: `src/lib/rateLimitService.ts` — read/check/increment with midnight and 13-hour reset.

## Web Speech API (Browser-native)

**Component**: `src/components/SpeechToText.tsx`.
**Purpose**: Voice-to-text transcription during trainer-led interviews.
**No external service** — uses browser-native `SpeechRecognition` API.

## File Storage (data/ directory)

**Dual-write migration**: File storage (backward compat) + Supabase (source of truth for dashboard/gap/readiness).

| File | Purpose | Retention |
|------|---------|-----------|
| `data/interview-history.json` | Past sessions | 72 hours |
| `data/rate-limits.json` | Rate limit tracking | 24 hours |

**Cleanup**: `src/lib/cleanupService.ts` runs on boot + every 12 hours via `src/instrumentation.ts` (Node.js runtime only).

## Integration Flow Summary

```
Interview Completion Pipeline:
  1. File write (historyService.ts) ← backward compat
  2. DB write (sessionPersistence.ts) ← dual-write to Supabase
  3. Gap score computation (gapPersistence.ts) ← fire-and-forget
  4. Readiness recompute (readinessService.ts) ← updates Associate record
  5. PDF generation (@react-pdf/renderer) ← client-side
  6. Email delivery (Resend) ← server-side
```
