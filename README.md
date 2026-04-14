# Next Level Mock

An adaptive technical skills development platform that gives associates repeated mock experiences with AI-scored feedback, tracks improvement over time, and surfaces readiness signals to trainers.

## Features

- **Trainer-led interviews** — Setup wizard configures GitHub-sourced question banks with weighted technologies, voice input via Web Speech API, keyword tracking, soft skills assessment, LLM scoring (GPT-4o-mini via LangGraph)
- **AI-automated interviews** — Public mode where an AI agent conducts the interview without a trainer
- **PDF reports** — Generated via `@react-pdf/renderer` and emailed via Resend
- **Associate profiles** — Persistent identity via slug, session history, readiness status
- **Gap tracking** — Recency-weighted scoring per skill (0.8 decay factor), computed after each session
- **Readiness signals** — Three-state classification (ready / improving / not_ready) based on threshold, trend, and session count
- **Trainer dashboard** — Roster with readiness badges, associate detail with gap trend charts, skill filtering, score calibration
- **Adaptive setup** — Tech weights pre-populated from gap scores for returning associates (3+ sessions)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

Copy `.env.example` and configure:

- `DATABASE_URL` — Supabase Transaction Pooler connection string
- `DIRECT_URL` — Direct Supabase connection for Prisma migrations
- `OPENAI_API_KEY` — Required for LLM scoring
- `GITHUB_TOKEN` — GitHub API access for question banks
- `RESEND_API_KEY` — Email delivery
- `APP_PASSWORD` — Authentication password

### Database Setup

```bash
npx prisma db push        # Push schema to Supabase
npx prisma generate       # Generate Prisma client
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

## Docker

```bash
docker compose up    # Uses .env.docker, maps port 80 -> 3000
```

## Tech Stack

- **Framework**: Next.js 16, React 19, TypeScript 5
- **Database**: Supabase (Postgres) via Prisma 7
- **Styling**: Tailwind CSS 4
- **State**: Zustand 5 with localStorage persistence
- **LLM**: LangChain/LangGraph with OpenAI (GPT-4o-mini)
- **Charts**: Recharts 3
- **Validation**: Zod 4
- **Testing**: Vitest 4
- **PDF**: @react-pdf/renderer
- **Email**: Resend
