# ARCHITECTURE.md — System Architecture

## Pattern

Next.js 16 App Router monolith with:
- **Server Components** for pages (trainer dashboard, associate profiles)
- **Client Components** for interactive flows (interview, dashboard wizard, review)
- **API Route Handlers** for server-side operations (scoring, history, email, auth)
- **Zustand store** as client-side state machine for interview session lifecycle
- **Prisma ORM** for all database operations (no raw SQL)
- **File-based storage** as backward-compat layer alongside Supabase

## Layers

```
┌─────────────────────────────────────────────────┐
│  Browser (Client Components + Zustand Store)     │
│  ├── Interview Flow (dashboard → interview →     │
│  │   review → completion)                        │
│  ├── Trainer Dashboard (roster, detail, charts)  │
│  └── Public Interview (automated AI mode)        │
├─────────────────────────────────────────────────┤
│  Next.js App Router (Server Components + API)    │
│  ├── Pages: /dashboard, /interview, /review,     │
│  │   /trainer, /trainer/[slug], /associate/[slug] │
│  ├── API Routes: /api/score, /api/history,       │
│  │   /api/trainer, /api/settings, etc.           │
│  └── Middleware: auth guard on protected routes   │
├─────────────────────────────────────────────────┤
│  Service Layer (src/lib/)                        │
│  ├── sessionPersistence.ts — dual-write          │
│  ├── gapService.ts — pure gap scoring algorithm  │
│  ├── gapPersistence.ts — DB bridge for gaps      │
│  ├── readinessService.ts — classification engine │
│  ├── adaptiveSetup.ts — weight pre-population    │
│  ├── settingsService.ts — trainer config         │
│  ├── historyService.ts — file-based history      │
│  ├── rateLimitService.ts — fingerprint rate limits│
│  └── langchain.ts — LLM scoring (simple chain)   │
├─────────────────────────────────────────────────┤
│  Data Layer                                      │
│  ├── Supabase (Postgres via Prisma)              │
│  │   ├── Associate, Session, GapScore, Settings  │
│  │   └── Source of truth for dashboard/readiness │
│  └── File Storage (data/)                        │
│      ├── interview-history.json (72h retention)  │
│      └── rate-limits.json (24h cleanup)          │
└─────────────────────────────────────────────────┘
```

## Core Data Flows

### 1. Interview Setup Flow

```
/dashboard (3-phase wizard)
  Phase 1: Configure GitHub repo (owner/repo/branch)
  Phase 2: Select technologies + set weights (1-5)
    └── If associate has 3+ sessions: fetch gap scores from
        /api/associates/[slug]/gap-scores → adaptiveSetup.ts
        maps gaps to weights (weak=5, strong=1)
  Phase 3: Set question count, candidate info, associate slug
    └── Questions fetched from GitHub via /api/github proxy
    └── Parsed by markdownParser.ts
    └── Selected via selectRandomQuestions() with weight-based
        proportional distribution + difficulty stratification
    └── Session created in Zustand store
```

### 2. Interview Execution Flow

```
/interview
  ├── 2 starter/behavioral questions (random variations)
  ├── N technical questions (weighted random selection)
  ├── Per-question: voice input (SpeechToText), keyword
  │   tracking (toggle hit/missed), soft skills checkboxes,
  │   interviewer notes
  ├── LLM scoring triggered per question:
  │   POST /api/score → LangGraph workflow routes to
  │   evaluateStarter | evaluateTechnical | evaluatePublic
  │   → returns score (1-5) + feedback
  └── Status: pending → processing → ready → validated
```

### 3. Review + Completion Flow

```
/review
  ├── Validate/override LLM scores per question
  ├── Edit final scores and feedback
  ├── Set overall technical + soft skill scores
  └── Generate summary via /api/generate-summary

Completion:
  1. POST /api/history — file write (historyService)
  2. persistSessionToDb() — Supabase upsert (Associate + Session)
  3. saveGapScores(associateId) — compute + persist gap scores
  4. updateAssociateReadiness(associateId, threshold) — classify
  5. PDF generation (client-side @react-pdf/renderer)
  6. POST /api/send-email — deliver report via Resend
```

### 4. Gap Scoring Pipeline

```
saveGapScores(associateId)
  1. Query all completed sessions for associate (newest first)
  2. For each session:
     extractSkillTopicScores() — uses techMap to map weekNumber → skill
     Produces: skill → topic → scores[]
  3. computeGapScores() — recency-weighted average per skill/topic
     Weight formula: score_n * 0.8^0 + score_(n-1) * 0.8^1 + ...
  4. Upsert GapScore records (unique on associateId + skill + topic)
  5. Delete stale GapScore records not in current computation
```

### 5. Readiness Classification

```
computeReadiness(associateId, threshold)
  Gate: < 3 completed sessions → not_ready (no recommendation)

  1. Fetch skill-level GapScores (topic = "")
  2. Compute avg = mean of skill-level weightedScores
  3. Compute trend = linear regression slope over last 3 session
     overall scores (tech + soft avg)

  Classification cascade (ORDER MATTERS):
    ready:     avg >= threshold AND trend >= 0 AND sessions >= 3
    improving: trend > 0 (strictly) AND avg < threshold AND sessions >= 3
    not_ready: everything else

  4. recommendedArea = lowest weighted topic-level gap score
     (falls back to lowest skill-level if no topics)
  5. Persist to Associate record (readinessStatus, recommendedArea, lastComputedAt)
```

### 6. Trainer Dashboard Flow

```
/trainer (Server Component)
  GET /api/trainer → prisma.associate.findMany with session counts
  → RosterTable component (sortable, searchable, readiness badges)

/trainer/[slug] (Server Component)
  GET /api/trainer/[slug] → associate detail + sessions + gap scores
  → SessionHistoryList, GapTrendChart (recharts LineChart),
    SkillFilterDropdown, CalibrationView
```

### 7. Automated Public Interview Flow

```
POST /api/public/interview/start
  → Rate limit check (fingerprint) → increment count → return session config

POST /api/public/interview/agent
  → AI agent processes responses, generates next question

POST /api/public/interview/complete
  → persistSessionToDb() to Supabase (same dual-write pipeline)
```

## Authentication

**Mechanism**: Single-password auth with HttpOnly cookie.
- `POST /api/auth` — validates password against `APP_PASSWORD` env var, sets `nlm_session=authenticated` cookie (24hr expiry)
- `src/middleware.ts` — protects `/dashboard`, `/interview`, `/review`, `/trainer` routes via cookie check
- `src/lib/auth-server.ts` — `isAuthenticatedSession()` for server-side route handlers
- `src/lib/auth-context.tsx` — `AuthProvider` + `useAuth()` hook for client-side

**Protected routes**: dashboard, interview, review, trainer (and sub-paths).
**Unprotected routes**: `/login`, `/associate/[slug]`, `/api/public/*`, `/api/health`.

## Entry Points

| Entry | File | Purpose |
|-------|------|---------|
| App root | `src/app/page.tsx` | Landing page |
| App layout | `src/app/layout.tsx` | Root layout with AuthProvider |
| Client layout | `src/components/ClientLayout.tsx` | Client-side layout wrapper |
| Middleware | `src/middleware.ts` | Auth guard |
| Instrumentation | `src/instrumentation.ts` | Boot-time cleanup job setup |

## Key Abstractions

| Abstraction | File | Purpose |
|-------------|------|---------|
| `InterviewSession` | `src/lib/types.ts` | Core domain type — full session state |
| `QuestionAssessment` | `src/lib/types.ts` | Per-question scoring state machine |
| `useInterviewStore` | `src/store/interviewStore.ts` | Zustand store — central nervous system |
| `GapScoreInput` | `src/lib/gapService.ts` | Pure gap scoring output type |
| `ReadinessResult` | `src/lib/readinessService.ts` | Classification result |
| `RosterAssociate` | `src/lib/trainer-types.ts` | Trainer dashboard row type |
