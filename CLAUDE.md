# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Next Level Mock — an AI-powered platform for simulating developer and technical role job experiences, built with Next.js 16 (App Router). Beyond mock interviews, the platform aims to replicate real-world job scenarios that developers encounter in technical roles. Currently features trainer-led and automated mock interviews scored via LLM (GPT-4o-mini through LangChain/LangGraph), with candidates receiving PDF reports via email.

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build (standalone output for Docker)
npm run start    # Start production server
npm run lint     # ESLint
```

Docker: `docker compose up` (uses `.env.docker`, maps port 80 → 3000).

## Architecture

### Interview Flow

1. **Dashboard** (`/dashboard`) — Setup wizard (3 phases): configure GitHub repo → select technologies with weights → set question count and candidate info
2. **Interview** (`/interview`) — Trainer conducts interview: 2 starter/behavioral questions → N technical questions with voice input (Web Speech API), keyword tracking, soft skills assessment
3. **Review** (`/review`) — Validate/override LLM scores, edit assessments
4. **Completion** — Generate PDF report (`@react-pdf/renderer`), send via Resend email

There is also a public automated interview mode (`/api/public/interview/*`) that uses an AI agent to conduct interviews without a trainer.

### State Management

Zustand store (`src/store/interviewStore.ts`) with `persist` middleware (localStorage). This is the central nervous system — holds the full interview session, setup wizard state, per-question assessments, tech weights, and navigation. Most components read/write through this store.

### Scoring System (LangGraph)

`src/lib/langchain.ts` — LangGraph workflow with conditional routing:
- Starter questions → guideline-based evaluation
- Technical questions → keyword matching + soft skills assessment
- Public interview questions → transcript-based evaluation

Uses `ChatOpenAI` (gpt-4o-mini). Scoring is async per-question with status tracking (`pending` → `processing` → `ready` → `validated`).

### Question Source

Questions are parsed from Markdown files fetched from a configurable GitHub repo via `src/lib/github-service.ts` (proxied through `/api/github` to keep tokens server-side). The parser (`src/lib/markdownParser.ts`) extracts question text, keywords, model answers, and difficulty levels. Questions are selected with weighted randomization based on technology weights and stratified by difficulty according to interview level.

### Rate Limiting

`src/lib/rateLimitService.ts` — Per-user limits via device fingerprinting (`@fingerprintjs/fingerprintjs`). Limits: 2 interviews per 13-hour session, 125/day global. State stored in `data/rate-limits.json`.

### Data Persistence

File-based JSON storage in `data/` directory:
- `data/interview-history.json` — Past sessions (72-hour retention)
- `data/rate-limits.json` — Rate limit tracking (24-hour cleanup)
- Cleanup runs on boot + every 12 hours via `src/lib/instrumentation.ts`

### Authentication

Single-password auth with HttpOnly cookie (`nlm_session`, 24hr expiry). Auth context in `src/lib/auth-context.tsx`, server helpers in `src/lib/auth-server.ts`. Middleware protects `/dashboard`, `/interview`, `/review` routes.

### Key API Routes

| Route | Purpose |
|-------|---------|
| `/api/score` | LLM scoring via LangGraph |
| `/api/github` | GitHub content proxy (hides token) |
| `/api/generate-summary` | AI-generated interview summaries |
| `/api/send-email` | Email delivery via Resend |
| `/api/history` | Interview history CRUD |
| `/api/public/interview/start` | Start public automated interview |
| `/api/public/interview/agent` | Process public interview responses |

## Environment Variables

- `OPENAI_API_KEY` — Required for LLM scoring
- `GITHUB_TOKEN` — GitHub API access for question banks
- `RESEND_API_KEY` — Email delivery
- `APP_PASSWORD` — Authentication password

## Tech Stack

- **Framework**: Next.js 16.1.1 with React 19, TypeScript 5
- **Styling**: Tailwind CSS 4
- **State**: Zustand 5 with persistence
- **LLM**: LangChain/LangGraph with OpenAI
- **PDF**: @react-pdf/renderer
- **Email**: Resend
- **Path alias**: `@/*` maps to `src/*`
