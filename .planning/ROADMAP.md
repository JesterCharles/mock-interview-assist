# Roadmap: Next Level Mock

## Milestones

- **v1.0 Readiness Loop MVP** -- Phases 1-7 (shipped 2026-04-14) | [Archive](milestones/v1.0-ROADMAP.md)
- **v1.1 Cohort Readiness System** -- Phases 8-15, 22 plans, 14 reqs (shipped 2026-04-14, PR `4238e36`) | [Archive](milestones/v1.1-ROADMAP.md)
- **v1.2 Analytics & Auth Overhaul** -- Phases 16-25, 10 phases, 30 reqs (in planning, started 2026-04-15)

## Phases

<details>
<summary>v1.0 Readiness Loop MVP (Phases 1-7) -- SHIPPED 2026-04-14</summary>

- [x] Phase 1: DB Foundation (2/2 plans) -- completed 2026-04-13
- [x] Phase 2: Session Persistence (2/2 plans) -- completed 2026-04-13
- [x] Phase 3: Associate Profiles (2/2 plans) -- completed 2026-04-13
- [x] Phase 4: Gap Service (3/3 plans) -- completed 2026-04-14
- [x] Phase 5: Readiness Signals (2/2 plans) -- completed 2026-04-14
- [x] Phase 6: Trainer Dashboard (2/2 plans) -- completed 2026-04-14
- [x] Phase 7: Adaptive Setup (2/2 plans) -- completed 2026-04-14

</details>

<details>
<summary>v1.1 Cohort Readiness System (Phases 8-15) -- SHIPPED 2026-04-14</summary>

- [x] Phase 8: Schema Migration (2/2 plans) -- completed 2026-04-14
- [x] Phase 9: Associate PIN Auth (3/3 plans) -- completed 2026-04-14
- [x] Phase 10: Automated Interview Pipeline (3/3 plans) -- completed 2026-04-14
- [x] Phase 11: Cohort Management (3/3 plans) -- completed 2026-04-14
- [x] Phase 12: Cohort Dashboard Views (2/2 plans) -- completed 2026-04-14
- [x] Phase 13: Curriculum Schedule (3/3 plans) -- completed 2026-04-14
- [x] Phase 14: Design Cohesion (2/2 plans) -- completed 2026-04-14
- [x] Phase 15: Design Cohesion Sweep (4/4 plans) -- completed 2026-04-14

</details>

### v1.2 Analytics & Auth Overhaul (Phases 16-25)

- [x] **Phase 16: Cached Question-Bank Manifest** -- in-memory cache + ETag short-circuit + manual refresh, hits <400ms wizard target (completed 2026-04-15)
- [x] **Phase 17: Schema Prep + Email Backfill** -- additive schema (`Associate.email`, `authUserId`, `lastInvitedAt`, `Session.aiTrainerVariance`) + trainer email-backfill UI (completed 2026-04-15)
- [x] **Phase 18: Supabase Auth Install** -- `@supabase/ssr` scaffold + trainer email/password + associate magic-link (PKCE + Resend delivery) (completed 2026-04-16)
- [x] **Phase 19: Bulk Invite** -- trainer onboarding flow: paste emails → cohort + curriculum → per-email transactional invite (50/call cap) (completed 2026-04-16)
- [x] **Phase 20: Middleware Cutover + RLS** -- Supabase-primary middleware, PIN fallback during 2-week grace, RLS as defense-in-depth (completed 2026-04-16)
- [x] **Phase 21: App Shell Redesign** -- two-level nav (topbar + section-scoped sidebar), cohort switcher, route reorganization (completed 2026-04-16)
- [x] **Phase 22: Trainer Analytics** -- KPI strip, sparklines, cohort trends, gap aggregation, calibration view (completed 2026-04-16)
- [ ] **Phase 23: Associate Self-Dashboard** -- new `/associate/[slug]/dashboard` with personal trends, recommended next area, readiness goal
- [ ] **Phase 24: PDF Analytics Export** -- cohort + per-associate PDF reports with pre-rendered SVG sparklines
- [ ] **Phase 25: PIN Removal + Cleanup** -- delete PIN system, drop columns, remove env vars, CI grep-gate

## Phase Details

### Phase 16: Cached Question-Bank Manifest
**Goal**: Setup wizard loads cached question-bank manifest in <400ms on warm cache; trainers can force-refresh when banks update.
**Depends on**: Nothing (independent quick win)
**Requirements**: CACHE-01, CACHE-02
**Success Criteria** (what must be TRUE):
  1. Trainer's first wizard load fetches from GitHub and populates the in-memory cache
  2. Trainer's second wizard load (within 5-min TTL) returns the manifest in <400ms
  3. Wizard displays a "last synced {time}" timestamp for the active repo+branch
  4. Trainer-only "Refresh" button calls `/api/github/cache/invalidate` and the next load fetches fresh
  5. Conditional GET via `If-None-Match` returns 304 and resets TTL without re-downloading the body
**Plans**: 1 plan
Plans:
- [x] 16-01-PLAN.md — Manifest cache module + /api/github?type=manifest + invalidate route + wizard UI + call-site migration

### Phase 17: Schema Prep + Email Backfill
**Goal**: Database schema is ready for Supabase identity linkage; existing Associate rows have trainer-curated emails (or are deleted) before auth cutover.
**Depends on**: Nothing (independent data migration)
**Requirements**: BACKFILL-01, BACKFILL-02
**Success Criteria** (what must be TRUE):
  1. `prisma migrate deploy` succeeds on production-shape DB and adds `Associate.email`, `Associate.authUserId`, `Associate.lastInvitedAt`, `Session.aiTrainerVariance` (all nullable)
  2. Migration is idempotent (rerunnable without error)
  3. Trainer at `/trainer/settings/associates` sees every existing Associate row with session count + email field
  4. Trainer can type and save emails per associate; uniqueness violations surface inline
  5. Trainer can one-click delete a slug-only Associate with zero sessions (confirm modal); rows with sessions are protected
  6. Pre-cutover dry-run preview shows counts: associates with email / without email / sessions orphaned if deleted
**Plans**: 4 plans

Plans:
- [x] 17-01-PLAN.md — Schema + idempotent migration + Prisma client regenerate
- [x] 17-02-PLAN.md — Backfill API routes (list, PATCH email, DELETE orphan, preview) with origin guard
- [x] 17-03-PLAN.md — /trainer/settings/associates page + table + dry-run preview card
- [x] 17-04-PLAN.md — Vitest integration tests for routes + preview math
**UI hint**: yes

### Phase 18: Supabase Auth Install
**Goal**: Trainers and associates can authenticate via Supabase, with magic links delivered through Resend and identity resolution unified through `getCallerIdentity`.
**Depends on**: Phase 17 (needs `authUserId` column)
**Requirements**: AUTH-05, AUTH-06, AUTH-07, AUTH-08
**Success Criteria** (what must be TRUE):
  1. `npm run build` succeeds with `@supabase/ssr` + `@supabase/supabase-js` installed and server/middleware/admin clients scaffolded
  2. Boot-time assert prevents the app from starting if `NEXT_PUBLIC_SITE_URL` resolves to localhost in production
  3. Trainer can sign in at `/signin` (Trainer tab) with Supabase email/password and receive trainer role from `user_metadata.role`
  4. Associate can request a magic link at `/signin` (Associate tab); link is delivered via Resend, opens via PKCE, and expires after 7 days
  5. `getCallerIdentity()` returns the same `admin | trainer | associate | anonymous` shape from Supabase session only (no PIN fallback)
  6. Middleware refreshes Supabase session BEFORE route guard and returns the mutated `NextResponse`
**Plans**: 4 plans

Plans:
- [x] 18-01-PLAN.md — Install packages + scaffold Supabase clients + boot assert + AuthEvent migration + rate limiter
- [x] 18-02-PLAN.md — Middleware rewrite (Supabase session refresh) + getCallerIdentity rewrite + caller updates
- [x] 18-03-PLAN.md — Trainer email/password sign-in + password reset (Resend + abuse flagging)
- [x] 18-04-PLAN.md — Associate magic link (PKCE + Resend + /auth/callback + authUserId linkage)
**UI hint**: yes

### Phase 19: Bulk Invite
**Goal**: Trainer can onboard a cohort by pasting 1-50 emails and triggering transactional magic-link invites with curriculum auto-assignment.
**Depends on**: Phase 18 (needs Supabase admin client + Resend integration)
**Requirements**: INVITE-01, INVITE-02, INVITE-03
**Success Criteria** (what must be TRUE):
  1. Trainer pastes comma- or newline-separated emails at `/trainer/onboarding`; malformed/duplicate emails surface as inline chips before submit
  2. Submissions over 50 emails are blocked with a clear error message
  3. Preview screen shows per-email action (new / reassign cohort / skip-same-cohort / skip-invalid) before execution
  4. `/api/trainer/invites/bulk` runs per-email transactions; partial failures do not roll back siblings; response is a result table with per-email status
  5. Re-invite throttle (`lastInvitedAt` < 5 min) blocks repeat sends with a clear message
  6. New invitee receives a Resend-delivered magic link that lands them on `/associate/[slug]/dashboard` after click-through
**Plans**: 3 plans

Plans:
- [x] 19-01-PLAN.md — Email parser pure function + EmailChipInput component
- [x] 19-02-PLAN.md — Preview classification + onboarding page wiring + human verify
- [x] 19-03-PLAN.md — inviteAssociate helper extraction + bulk API route + integration tests
**UI hint**: yes

### Phase 20: Middleware Cutover + RLS
**Goal**: Supabase identity is the primary auth source for all guarded routes; RLS policies are deployed as defense-in-depth without breaking Prisma access.
**Depends on**: Phase 18 (auth installed), Phase 19 (associates have Supabase identities to authenticate)
**Requirements**: AUTH-09, AUTH-10
**Success Criteria** (what must be TRUE):
  1. `src/middleware.ts` enforces Supabase-primary guards on `/trainer/*` (trainer only), `/associate/*` except `/signin` (trainer or matching associate), `/interview/*` and `/review/*` (trainer only)
  2. Legacy PIN cookie still authorizes during the 2-week grace window; both paths route to the same identity shape
  3. RLS policies on `Session`, `GapScore`, `Associate`, `Cohort`, `CurriculumWeek` block direct `supabase-js` reads from non-owners (verified by manual test query)
  4. All Prisma reads in route handlers filter explicitly by identity from `getCallerIdentity()`; no implicit RLS reliance
  5. PROJECT.md documents the BYPASSRLS + Transaction Pooler architecture and the explicit-filter requirement
**Plans**: 2 plans

Plans:
- [x] 20-01-PLAN.md — RLS migration (is_trainer() function + policies on 5 tables)
- [x] 20-02-PLAN.md — Route handler audit annotations + PROJECT.md BYPASSRLS documentation

### Phase 21: App Shell Redesign
**Goal**: Trainer routes render a two-level navigation shell (global topbar + section-scoped sidebar) with persistent cohort switcher, reorganized routes under Next.js route groups, and new settings section absorbing existing cohort and associate management pages.
**Depends on**: Phase 18 (needs Supabase auth for avatar menu user info)
**Requirements**: SHELL-01, SHELL-02, SHELL-03, SHELL-04
**Success Criteria** (what must be TRUE):
  1. Every authenticated trainer route renders a global topbar with logo + Dashboard / Interviews / Question Banks / Settings + avatar menu; active section is highlighted
  2. Dashboard section sidebar shows Overview (Roster / Gap Analysis / Calibration) + Actions (New Mock / Reports); other sections render their own sidebars or none
  3. Existing URLs are preserved: `/trainer` lands on Dashboard > Roster, `/trainer/[slug]` is a child route (not modal), `/interview/new` lives under Interviews, `/question-banks` lives under Question Banks
  4. New `/trainer/settings` section provides Threshold / Cohorts / Curriculum / Users / Associates pages (BACKFILL-02 page lives here)
  5. Topbar cohort switcher persists selection to `?cohort=<id>` URL param; all Dashboard child pages respect the filter
  6. Sidebar collapsed state persists to localStorage; mobile sidebar is a Radix off-canvas sheet
**Plans**: 2 plans

Plans:
- [x] 21-01-PLAN.md — Install Radix deps + shell components (TopBar, SectionSidebar, AvatarMenu, CohortSwitcher, MobileSidebar) + sidebar configs + ConditionalNavbar
- [x] 21-02-PLAN.md — Route reorganization (route groups, file moves, layouts, placeholder pages, settings routes, link updates, tests, visual verification)
**UI hint**: yes

### Phase 22: Trainer Analytics
**Goal**: Trainers see actionable analytics (KPIs, sparklines, gap aggregation, cohort trends, calibration) scoped by the global cohort switcher.
**Depends on**: Phase 21 (KPI strip lives in shell), Phase 17 (`aiTrainerVariance` column)
**Requirements**: ANALYTICS-01, ANALYTICS-02, ANALYTICS-03, ANALYTICS-04, ANALYTICS-05, ANALYTICS-06
**Success Criteria** (what must be TRUE):
  1. Dashboard > Roster renders 4 KPI cards (Avg Readiness, Mocks This Week, At-Risk Count + Top Gap label, AI-Trainer Variance) sourced from a single `$queryRaw` and scoped by cohort switcher
  2. Roster table renders a per-associate sparkline (last 6 sessions), trend word, top-gap tag, and last-mock timestamp from a single windowed query (no N+1)
  3. Dashboard > Gap Analysis aggregates by skill AND topic across the selected cohort; rows sort by associates-affected desc; clicking a row drills through to the affected associates
  4. New question-bank parser reads optional `topic:` frontmatter; `Session.questions` JSON stores `topic` per question (fallback to `keywords[0]`)
  5. Dashboard > Calibration shows trainer-override frequency + AI-vs-trainer delta distribution sourced from denormalized `Session.aiTrainerVariance`
  6. Cohort Trends card on Dashboard > Roster shows a 12-week weekly average readiness line chart for the selected cohort
**Plans**: 4 plans
Plans:
- [x] 22-01-PLAN.md — Data foundation: topic parser + aiTrainerVariance write + analytics types
- [x] 22-02-PLAN.md — Roster page: KPI strip + sparklines + cohort trends + page rewrite
- [x] 22-03-PLAN.md — Gap Analysis page + drill-through
- [x] 22-04-PLAN.md — Calibration page (override frequency + delta histogram)
**UI hint**: yes

### Phase 23: Associate Self-Dashboard
**Goal**: Associates have a personal dashboard at `/associate/[slug]/dashboard` showing their own gap trends, recommended next practice area, and readiness-goal progress.
**Depends on**: Phase 20 (Supabase associate session), Phase 21 (shell pattern)
**Requirements**: ASELF-01, ASELF-02, ASELF-03, ASELF-04
**Success Criteria** (what must be TRUE):
  1. Authenticated associate visiting `/associate/[slug]/dashboard` sees their own gap trend chart (own GapScore history) under an `AssociateNav` with Dashboard / Profile / Book a Mock tabs
  2. A single "Recommended Next Practice Area" card surfaces `Associate.recommendedArea` with a one-line rationale and a "Not now" dismiss that hides the card for 7 days (localStorage)
  3. A readiness-goal progress bar shows the associate's current weighted readiness vs the cohort threshold; no cohort-mate names are visible (aggregate-only)
  4. "Book a Mock" CTA opens a working trainer-contact path (mailto or in-app message) — no full scheduler required
  5. Associates from other slugs cannot access this dashboard (middleware enforces matching identity)
**Plans**: 2 plans
Plans:
- [ ] 23-01-PLAN.md — AssociateNav layout + tabs (Dashboard / Profile / Book a Mock mailto)
- [ ] 23-02-PLAN.md — Dashboard page (gap trend chart + recommended area card + readiness progress bar + identity guard)
**UI hint**: yes

### Phase 24: PDF Analytics Export
**Goal**: Trainers can export cohort and per-associate analytics as PDFs without recharts-in-PDF OOM risk.
**Depends on**: Phase 22 (consumes analytics queries + denormalized variance)
**Requirements**: PDF-01, PDF-02
**Success Criteria** (what must be TRUE):
  1. Trainer can export a cohort analytics PDF from Dashboard > Reports containing KPI snapshot, gap-by-topic table, and roster summary
  2. Trainer can export a per-associate PDF from the associate detail page containing gap trend, session list, and recommended areas
  3. PDFs render using a hand-rolled SVG sparkline helper (no recharts inside `@react-pdf/renderer`)
  4. PDF generation completes without OOM on the constrained Docker host (verified on production-equivalent memory limits)
**Plans**: 2 plans
Plans:
- [ ] 23-01-PLAN.md — AssociateNav layout + tabs (Dashboard / Profile / Book a Mock mailto)
- [ ] 23-02-PLAN.md — Dashboard page (gap trend chart + recommended area card + readiness progress bar + identity guard)
**UI hint**: yes

### Phase 25: PIN Removal + Cleanup
**Goal**: PIN auth system is fully removed from the codebase, schema, and environment after the 2-week Supabase grace period.
**Depends on**: Phase 20 (Supabase cutover live), 2-week grace window elapsed
**Requirements**: CLEANUP-01, CLEANUP-02, CLEANUP-03
**Success Criteria** (what must be TRUE):
  1. CI grep-gate fails any PR where `ENABLE_ASSOCIATE_AUTH|pinHash|pinGeneratedAt|associate_session|verifyAssociateToken|isAssociateAuthEnabled` matches anywhere in `src/`
  2. PIN routes (`/api/associate/pin/*`), services (`pinService`, `pinAttemptLimiter`, `associateSession`), `featureFlags.ts`, and `/associate/login` redirect are deleted; PIN-related tests are removed
  3. Prisma migration drops `Associate.pinHash` and `Associate.pinGeneratedAt`; `prisma migrate deploy` succeeds
  4. Env vars `APP_PASSWORD`, `ASSOCIATE_SESSION_SECRET`, `ENABLE_ASSOCIATE_AUTH` are removed from `.env.example`, `.env.docker`, deploy docs, and CLAUDE.md / PROJECT.md
  5. App boots and all auth flows function with only Supabase env vars present
**Plans**: 2 plans
Plans:
- [ ] 23-01-PLAN.md — AssociateNav layout + tabs (Dashboard / Profile / Book a Mock mailto)
- [ ] 23-02-PLAN.md — Dashboard page (gap trend chart + recommended area card + readiness progress bar + identity guard)

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. DB Foundation | v1.0 | 2/2 | Complete | 2026-04-13 |
| 2. Session Persistence | v1.0 | 2/2 | Complete | 2026-04-13 |
| 3. Associate Profiles | v1.0 | 2/2 | Complete | 2026-04-13 |
| 4. Gap Service | v1.0 | 3/3 | Complete | 2026-04-14 |
| 5. Readiness Signals | v1.0 | 2/2 | Complete | 2026-04-14 |
| 6. Trainer Dashboard | v1.0 | 2/2 | Complete | 2026-04-14 |
| 7. Adaptive Setup | v1.0 | 2/2 | Complete | 2026-04-14 |
| 8. Schema Migration | v1.1 | 2/2 | Complete | 2026-04-14 |
| 9. Associate PIN Auth | v1.1 | 3/3 | Complete | 2026-04-14 |
| 10. Automated Interview Pipeline | v1.1 | 3/3 | Complete | 2026-04-14 |
| 11. Cohort Management | v1.1 | 3/3 | Complete | 2026-04-14 |
| 12. Cohort Dashboard Views | v1.1 | 2/2 | Complete | 2026-04-14 |
| 13. Curriculum Schedule | v1.1 | 3/3 | Complete | 2026-04-14 |
| 14. Design Cohesion | v1.1 | 2/2 | Complete | 2026-04-14 |
| 15. Design Cohesion Sweep | v1.1 | 4/4 | Complete | 2026-04-14 |
| 16. Cached Question-Bank Manifest | v1.2 | 1/1 | Complete   | 2026-04-15 |
| 17. Schema Prep + Email Backfill | v1.2 | 4/4 | Complete   | 2026-04-15 |
| 18. Supabase Auth Install | v1.2 | 4/4 | Complete   | 2026-04-16 |
| 19. Bulk Invite | v1.2 | 3/3 | Complete    | 2026-04-16 |
| 20. Middleware Cutover + RLS | v1.2 | 2/2 | Complete    | 2026-04-16 |
| 21. App Shell Redesign | v1.2 | 2/2 | Complete    | 2026-04-16 |
| 22. Trainer Analytics | v1.2 | 4/4 | Complete    | 2026-04-16 |
| 23. Associate Self-Dashboard | v1.2 | 0/2 | Planning    | - |
| 24. PDF Analytics Export | v1.2 | 0/0 | Not started | - |
| 25. PIN Removal + Cleanup | v1.2 | 0/0 | Not started | - |
