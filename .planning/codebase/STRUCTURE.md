# STRUCTURE.md — Directory Layout & Organization

## Top-Level

```
mock-interview-assist/
├── .planning/              # GSD workflow artifacts (planning, phases, roadmap)
├── data/                   # Runtime file storage (gitignored)
│   ├── interview-history.json
│   └── rate-limits.json
├── prisma/
│   └── schema.prisma       # Database schema (generates to src/generated/prisma/)
├── public/                 # Static assets
├── src/                    # Application source code
├── Dockerfile              # Multi-stage production build
├── docker-compose.yml      # Development/deployment compose
├── next.config.ts          # Next.js configuration
├── tsconfig.json           # TypeScript configuration
├── vitest.config.ts        # Test configuration
├── eslint.config.mjs       # ESLint flat config
├── package.json            # Dependencies and scripts
└── prisma.config.ts        # Prisma configuration
```

## Source Code (src/)

```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/                # Server-side API route handlers
│   │   ├── associates/[slug]/gap-scores/route.ts  # Gap scores for adaptive setup
│   │   ├── auth/route.ts                          # Authentication endpoint
│   │   ├── generate-summary/route.ts              # AI summary generation
│   │   ├── github/route.ts                        # GitHub content proxy
│   │   ├── health/route.ts                        # DB connectivity check
│   │   ├── history/route.ts                       # Interview history CRUD + dual-write
│   │   ├── load-markdown/route.ts                 # Markdown file loader
│   │   ├── public/interview/                      # Public automated interview
│   │   │   ├── agent/route.ts                     # AI agent processing
│   │   │   ├── complete/route.ts                  # Session completion
│   │   │   └── start/route.ts                     # Rate-limited start
│   │   ├── question-banks/route.ts                # Question bank listing
│   │   ├── score/route.ts                         # LLM scoring (LangGraph)
│   │   ├── send-email/route.ts                    # Email delivery via Resend
│   │   ├── settings/route.ts                      # Trainer settings CRUD
│   │   ├── sync-check/route.ts                    # File vs DB parity check
│   │   └── trainer/                               # Trainer dashboard API
│   │       ├── route.ts                           # GET roster
│   │       └── [slug]/route.ts                    # GET associate detail
│   ├── associate/[slug]/page.tsx                  # Public associate profile
│   ├── dashboard/page.tsx                         # Setup wizard (3 phases)
│   ├── history/                                   # Interview history page
│   ├── interview/page.tsx                         # Interview execution
│   ├── login/                                     # Login page
│   ├── pdf/                                       # PDF preview page
│   ├── question-banks/                            # Question bank browser
│   ├── review/page.tsx                            # Score review/validation
│   ├── trainer/                                   # Trainer dashboard
│   │   ├── page.tsx                               # Roster view
│   │   ├── [slug]/page.tsx                        # Associate detail view
│   │   ├── loading.tsx                            # Loading state
│   │   └── trainer.css                            # Dashboard styles
│   ├── layout.tsx                                 # Root layout
│   ├── page.tsx                                   # Landing page
│   ├── globals.css                                # Global styles (Tailwind)
│   └── favicon.ico
├── components/             # Reusable React components
│   ├── ClientLayout.tsx    # Client-side layout wrapper
│   ├── Navbar.tsx          # Navigation bar
│   ├── PDFReport.tsx       # PDF report template (340 lines)
│   ├── ProgressBar.tsx     # Interview progress indicator
│   ├── QuestionCard.tsx    # Question display component
│   ├── SpeechToText.tsx    # Voice input component (Web Speech API)
│   └── trainer/            # Trainer dashboard components
│       ├── CalibrationView.tsx      # Score calibration display
│       ├── EmptyGapState.tsx        # Empty state for gap data
│       ├── GapTrendChart.tsx        # Recharts LineChart for gap trends
│       ├── ReadinessDisplay.tsx     # Readiness badge component
│       ├── RosterTable.tsx          # Sortable/searchable associate roster
│       ├── SessionHistoryList.tsx   # Session list for detail page
│       └── SkillFilterDropdown.tsx  # Skill filter for gap charts
├── generated/
│   └── prisma/             # Auto-generated Prisma client (gitignored)
├── lib/                    # Shared utilities and services
│   ├── __tests__/          # Unit tests
│   │   ├── adaptiveSetup.test.ts     (71 lines)
│   │   ├── gapService.test.ts        (562 lines)
│   │   └── readinessService.test.ts  (312 lines)
│   ├── adaptiveSetup.ts    # Gap-to-weight mapping for setup wizard
│   ├── auth-context.tsx     # AuthProvider + useAuth hook (client)
│   ├── auth-server.ts       # isAuthenticatedSession() (server)
│   ├── cleanupService.ts    # Data file cleanup (72h history, 24h rate limits)
│   ├── email-templates.ts   # HTML email template
│   ├── gapPersistence.ts    # Gap score DB operations
│   ├── gapService.ts        # Pure gap scoring algorithm (no DB)
│   ├── github-service.ts    # GitHub API client (via proxy)
│   ├── historyService.ts    # File-based history read/write
│   ├── langchain.ts         # Simple LLM scoring chain + aggregate calculator
│   ├── markdownParser.ts    # Question bank markdown parser + question selector
│   ├── prisma.ts            # Prisma singleton client
│   ├── rateLimitService.ts  # Fingerprint-based rate limiting
│   ├── readinessService.ts  # Readiness classification + bulk recompute
│   ├── sessionPersistence.ts # Dual-write orchestrator (file + DB)
│   ├── settingsService.ts   # Settings CRUD + threshold change trigger
│   ├── slug-validation.ts   # Zod slug schema + validator
│   ├── trainer-types.ts     # TypeScript types for trainer dashboard
│   └── types.ts             # Core domain types (InterviewSession, etc.)
├── middleware.ts            # Auth middleware for protected routes
├── store/
│   └── interviewStore.ts   # Zustand store (session state machine)
└── instrumentation.ts      # Boot-time cleanup job registration
```

## Key Locations

| What | Where |
|------|-------|
| Domain types | `src/lib/types.ts` |
| Central store | `src/store/interviewStore.ts` |
| Database schema | `prisma/schema.prisma` |
| Generated Prisma client | `src/generated/prisma/` |
| DB singleton | `src/lib/prisma.ts` |
| Auth middleware | `src/middleware.ts` |
| LLM scoring (full) | `src/app/api/score/route.ts` |
| Gap algorithm | `src/lib/gapService.ts` |
| Readiness engine | `src/lib/readinessService.ts` |
| Adaptive setup | `src/lib/adaptiveSetup.ts` |
| Unit tests | `src/lib/__tests__/` |
| Trainer components | `src/components/trainer/` |
| PDF template | `src/components/PDFReport.tsx` |
| Docker config | `Dockerfile` + `docker-compose.yml` |

## Naming Conventions

- **Pages**: `page.tsx` in App Router directory
- **API routes**: `route.ts` in App Router directory
- **Services**: camelCase files in `src/lib/` (e.g., `gapService.ts`, `sessionPersistence.ts`)
- **Components**: PascalCase files in `src/components/` (e.g., `PDFReport.tsx`, `QuestionCard.tsx`)
- **Tests**: `*.test.ts` co-located in `src/lib/__tests__/`
- **Types**: `types.ts` for domain types, `trainer-types.ts` for feature-specific types
- **Store**: Single file `interviewStore.ts` in `src/store/`
