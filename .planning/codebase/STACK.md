# STACK.md — Technology Stack

## Runtime & Language

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 22 (Docker: node:22-alpine) | Server runtime |
| TypeScript | ^5 | Language (strict mode enabled) |
| Target | ES2018 | Compiler target |
| Module resolution | bundler | Via tsconfig.json |

Path alias: `@/*` maps to `./src/*` (tsconfig + vitest alias).

## Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | ^16.2.3 | App Router framework |
| React | 19.2.3 | UI library |
| React DOM | 19.2.3 | DOM renderer |

Build output: `standalone` (optimized for Docker).
`next.config.ts` includes `outputFileTracingRoot`, `outputFileTracingIncludes` for Prisma binaries, and `transpilePackages: ['@react-pdf/renderer']`.

## State Management

| Technology | Version | Purpose |
|------------|---------|---------|
| Zustand | ^5.0.9 | Client-side state with `persist` middleware |

Single store: `src/store/interviewStore.ts` — holds full interview session, setup wizard state, assessments, tech weights. Persisted to localStorage under key `interview-session-storage`.

## Database & ORM

| Technology | Version | Purpose |
|------------|---------|---------|
| Prisma | ^7.7.0 | ORM (CLI + client) |
| @prisma/client | ^7.7.0 | Type-safe query builder |
| @prisma/adapter-pg | ^7.7.0 | pg driver adapter for Supabase pgBouncer |
| pg | (peer of adapter) | PostgreSQL driver |

Schema: `prisma/schema.prisma` — generates to `src/generated/prisma/`.
Singleton client: `src/lib/prisma.ts` — `pg.Pool` with `max: 5, idleTimeoutMillis: 10_000`.

## AI / LLM

| Technology | Version | Purpose |
|------------|---------|---------|
| @langchain/openai | ^1.2.0 | ChatOpenAI (gpt-4o-mini) |
| @langchain/core | ^1.1.39 | Prompt templates |
| @langchain/langgraph | ^1.2.7 | StateGraph workflow for scoring |
| langchain | ^1.3.0 | Core langchain |

Model: `gpt-4o-mini`, temperature 0.3. Used in `src/app/api/score/route.ts` (LangGraph) and `src/lib/langchain.ts` (simple chain).

## Styling

| Technology | Version | Purpose |
|------------|---------|---------|
| Tailwind CSS | ^4 | Utility-first CSS |
| @tailwindcss/postcss | ^4 | PostCSS plugin |

## UI Libraries

| Technology | Version | Purpose |
|------------|---------|---------|
| lucide-react | ^0.562.0 | Icons |
| react-hot-toast | ^2.6.0 | Toast notifications |
| recharts | ^3.8.1 | Charts (trainer dashboard gap trends) |
| @react-pdf/renderer | ^4.3.1 | PDF report generation (ESM-only) |

## Email

| Technology | Version | Purpose |
|------------|---------|---------|
| resend | ^6.10.0 | Email delivery service |

Template: `src/lib/email-templates.ts` — HTML email with strengths/improvements.

## Validation

| Technology | Version | Purpose |
|------------|---------|---------|
| zod | ^4.3.6 | Schema validation (slug, API inputs) |

## Utilities

| Technology | Version | Purpose |
|------------|---------|---------|
| gray-matter | ^4.0.3 | Frontmatter parsing |
| marked | ^17.0.1 | Markdown rendering |
| dotenv | ^17.4.2 | Environment variable loading |
| @fingerprintjs/fingerprintjs | ^5.1.0 | Device fingerprinting for rate limiting |

## Dev Dependencies

| Technology | Version | Purpose |
|------------|---------|---------|
| vitest | ^4.1.4 | Test runner |
| @vitest/coverage-v8 | ^4.1.4 | Coverage |
| eslint | ^9 | Linting |
| eslint-config-next | 16.1.1 | Next.js ESLint rules |
| @types/pg | ^8.20.0 | TypeScript types for pg |

## Configuration Files

| File | Purpose |
|------|---------|
| `next.config.ts` | Next.js config (standalone, Prisma tracing, transpile packages) |
| `tsconfig.json` | TypeScript config (strict, bundler resolution, `@/*` alias) |
| `vitest.config.ts` | Vitest config (node env, path alias, passWithNoTests) |
| `eslint.config.mjs` | ESLint flat config (core-web-vitals + typescript) |
| `prisma/schema.prisma` | Database schema |
| `Dockerfile` | Multi-stage Docker build (deps -> builder -> runner) |
| `docker-compose.yml` | Docker Compose (port 80->3000, .env.docker, data volume) |

## Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `OPENAI_API_KEY` | LLM scoring | Yes |
| `GITHUB_TOKEN` | GitHub API (question banks) | Yes |
| `RESEND_API_KEY` | Email delivery | Yes |
| `APP_PASSWORD` | Single-password auth | Yes |
| `DATABASE_URL` | Supabase transaction pooler (port 6543) | Yes |
| `DIRECT_URL` | Direct Supabase (port 5432, for migrations) | Yes |
