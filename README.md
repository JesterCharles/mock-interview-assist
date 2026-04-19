# Next Level Mock

An adaptive technical skills development platform that gives associates repeated mock experiences with AI-scored feedback, tracks improvement over time, and surfaces readiness signals to trainers.

Deployed to Cloud Run on GCP. See [DEPLOY.md](.planning/DEPLOY.md).

## Features

- **Trainer-led interviews** — Setup wizard (`/interview/new`) configures GitHub-sourced question banks with weighted technologies, voice input via Web Speech API, keyword tracking, soft skills assessment, LLM scoring (GPT-4o-mini via LangGraph)
- **AI-automated interviews** — Public mode where an AI agent conducts the interview without a trainer
- **PDF reports** — Generated via `@react-pdf/renderer` and emailed via Resend
- **Associate profiles** — Persistent identity via slug, session history, readiness status, optional PIN-auth gated flow (v1.2)
- **Cohort management** — Group associates by cohort, define per-week curriculum (skill slug + topic tags) for targeted practice
- **Curriculum-aware setup** — Setup wizard filters tech list to skills the associate's cohort has actually taught
- **Gap tracking** — Recency-weighted scoring per skill (0.8 decay factor), computed after each session
- **Readiness signals** — Three-state classification (ready / improving / not_ready) based on threshold, trend, and session count; background sweep keeps stale classifications fresh
- **Trainer dashboard** — Roster at `/trainer` with readiness badges, associate detail with gap trend charts, skill filtering, score calibration, cohort + curriculum management under `/trainer/cohorts`
- **Adaptive setup** — Tech weights pre-populated from gap scores for returning associates (3+ sessions)
- **Unified design system** — Warm editorial aesthetic (see `DESIGN.md`). Dark mode toggle. Unified `Navbar` is role-aware (anonymous / trainer / associate), unified `/signin` exposes Trainer and Associate tabs

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

Copy `.env.example` and configure:

- `DATABASE_URL` — Supabase Transaction Pooler connection string (port 6543, `?connection_limit=5&pool_timeout=10`)
- `DIRECT_URL` — Direct Supabase connection for Prisma migrations (port 5432)
- `OPENAI_API_KEY` — Required for LLM scoring
- `GITHUB_TOKEN` — GitHub API access for question banks
- `RESEND_API_KEY` — Email delivery
- `APP_PASSWORD` — Trainer authentication password
- `ASSOCIATE_SESSION_SECRET` — HMAC secret for associate_session cookies (generate with `openssl rand -hex 32`). Required in production; intentionally decoupled from `APP_PASSWORD`.
- `ENABLE_ASSOCIATE_AUTH` — Feature flag for the PIN-based associate flow. Defaults to `false` in v1.1; flip to `true` for v1.2. When `false`, all PIN endpoints return 404 and the associate-auth UI surfaces are hidden.
- `NLM_TRUSTED_PROXY` — Set to `true` when the app is deployed behind a trusted edge proxy (e.g., GCE load balancer). Opts the PIN verify limiter into parsing `x-forwarded-for` for IP-keyed brute-force protection. Leave unset locally.

### Database Setup

```bash
npx prisma migrate deploy   # Apply migrations (idempotent baseline)
npx prisma generate         # Generate Prisma client
```

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build (standalone output for Docker)
npm run start        # Start production server
npm run lint         # ESLint
npm run test         # Run Vitest tests
npm run test:watch   # Vitest in watch mode
```

Playwright E2E specs live under `tests/e2e/` and `tests/visual/phase-*/`; run via `npx playwright test --config <config>`.

## Docker (Local Dev Only)

For local development against Dockerized Judge0 (see "Coding Challenges — Local Dev" below). Production runs on Cloud Run; see [DEPLOY.md](.planning/DEPLOY.md).

```bash
docker compose up    # Uses .env.docker, maps port 80 -> 3000
```

## Coding Challenges — Local Dev

Run the full v1.4 coding-challenge pipeline locally against Dockerized Judge0.

1. Start Judge0 + the app:
   ```bash
   docker compose up -d judge0-db judge0-redis judge0-server judge0-workers
   docker compose up -d interview-assistant
   ```

2. Confirm Judge0 is healthy:
   ```bash
   curl http://localhost:3000/api/health | jq .checks.judge0
   # Expected: "ok"
   ```

3. Seed a sample challenge into your local cohort. (Bulk seeding is trainer-run
   through the public GitHub repo; for local development, follow
   [docs/trainer-authoring.md](./docs/trainer-authoring.md) §Local Validation
   to copy a challenge directory under `challenges/` and point your repo env
   vars at the local clone.)

4. Validate a new challenge directory before opening a PR:
   ```bash
   npm run validate-challenge ./challenges/my-new-challenge
   ```

5. Open the UI: http://localhost:3000/coding

See [docs/trainer-authoring.md](./docs/trainer-authoring.md) for the full
authoring workflow and [ARCHITECTURE.md](./ARCHITECTURE.md) for the stack
diagram.

## Tech Stack

- **Framework**: Next.js 16, React 19, TypeScript 5
- **Database**: Supabase (Postgres) via Prisma 7
- **Styling**: Tailwind CSS 4 + unified DESIGN.md token layer (`src/app/globals.css`)
- **State**: Zustand 5 with localStorage persistence
- **LLM**: LangChain/LangGraph with OpenAI (GPT-4o-mini)
- **Charts**: Recharts 3
- **Validation**: Zod 4
- **Testing**: Vitest 4 + Playwright (E2E / visual regression)
- **PDF**: @react-pdf/renderer
- **Email**: Resend
