# Milestone v1.2 Requirements — Analytics & Auth Overhaul

**Goal:** Actionable analytics dashboard, Supabase auth cutover, bulk cohort onboarding via magic-link invites, two-level app shell.

REQ-IDs continue from v1.1. Locked decisions from `.planning/research/SUMMARY.md`.

---

## Cached Question-Bank Manifest (Phase 1)

- [x] **CACHE-01**: `/api/github` manifest responses cached in-memory (`Map` + 5-min TTL + ETag `If-None-Match` short-circuit). Per-repo+branch key. Setup wizard first fetch populates cache; subsequent wizard loads hit <400ms for cached entries.
- [x] **CACHE-02**: Trainer-only `/api/github/cache/invalidate` endpoint clears one entry or the full cache. Setup wizard shows "last synced {time}" hint + manual "Refresh" button that calls the invalidate endpoint for the current repo+branch.

## Schema Prep + Email Backfill (Phase 2)

- [ ] **BACKFILL-01**: Prisma migration adds `Associate.email String? @unique`, `Associate.authUserId String? @unique`, `Associate.lastInvitedAt DateTime?`, `Session.aiTrainerVariance Float?`. Migration is idempotent (`IF NOT EXISTS` + DO-block guards).
- [ ] **BACKFILL-02**: Trainer UI at `/trainer/settings/associates` shows all existing `Associate` rows with session-count + email field. Trainer can type email per associate and save. Slug-only rows with 0 sessions get a one-click "Delete" (confirm modal). Dry-run audit preview before cutover shows counts: associates with email / without / total sessions orphaned if deleted.

## Supabase Auth Install (Phase 3)

- [ ] **AUTH-05**: Install `@supabase/ssr` + `@supabase/supabase-js`. Scaffold `src/lib/supabase/{server,middleware,admin}.ts`. Env vars added: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL` (boot-time assert prevents `localhost` in prod).
- [ ] **AUTH-06**: Trainer signs in via Supabase email/password at `/signin` (Trainer tab). Trainer role marker lives in `auth.users.user_metadata.role = 'trainer'`. Session refresh happens in middleware BEFORE route guard; mutated `NextResponse` returned.
- [ ] **AUTH-07**: Associate signs in via Supabase magic link at `/signin` (Associate tab). PKCE flow enabled. 7-day link expiry. Magic-link emails delivered via Resend (not Supabase default SMTP) using `admin.generateLink` server-side.
- [ ] **AUTH-08**: `getCallerIdentity()` reads Supabase session as primary source; legacy PIN cookie fallback kept behind 2-week grace flag for active in-flight sessions. Both paths resolve to the same `trainer | associate | anonymous` shape.

## Bulk Invite (Phase 4)

- [x] **INVITE-01**: Trainer posts comma-separated (or newline-separated) email list to `/trainer/onboarding`. Live validation chips flag malformed/duplicate emails before submit. Per-batch cap 50; UI blocks larger submissions with clear error.
- [x] **INVITE-02**: Submit picks target cohort + auto-assigns curriculum from cohort. Preview screen shows per-email action (new / reassign cohort / skip — same cohort / skip — invalid). Trainer confirms to execute.
- [x] **INVITE-03**: `/api/trainer/invites/bulk` runs per-email transaction: upsert Associate by email → set cohortId → `admin.generateLink` → Resend send → write result. Partial failures don't roll back siblings. Response body is a result table (email, status, error if any). `lastInvitedAt` throttle = 5 min.

## Middleware Cutover + RLS (Phase 5)

- [x] **AUTH-09**: `src/middleware.ts` flipped to Supabase-primary. Guards `/trainer/*` (trainer role only), `/associate/*` except `/signin` (trainer or matching associate), `/interview/*` + `/review/*` (trainer only). PIN cookie path remains as fallback during 2-week grace.
- [x] **AUTH-10**: RLS policies deployed on `Session`, `GapScore`, `Associate`, `Cohort`, `CurriculumWeek` as defense-in-depth. Policies use `is_trainer()` SECURITY DEFINER helper for role check. Prisma stays on service-role (BYPASSRLS) + Transaction Pooler; every Prisma read in route handlers filters explicitly by identity from `getCallerIdentity()`. Documented in PROJECT.md.

## App Shell Redesign — Two-Level Nav (Phase 6)

- [x] **SHELL-01**: Global topbar with logo + primary nav (Dashboard · Interviews · Question Banks · Settings) + avatar menu. Present on all authenticated trainer routes. Active section highlighted.
- [x] **SHELL-02**: Section-scoped sidebar. Dashboard section shows Overview (Roster / Gap Analysis / Calibration) + Actions (New Mock / Reports). Interviews, Question Banks, and Settings define their own sidebars or render without sidebar where not applicable. Mobile sidebar = Radix sheet (off-canvas hamburger).
- [x] **SHELL-03**: Route reorganization preserves existing URLs where possible. `/trainer` → Dashboard > Roster (default landing). `/trainer/[slug]` stays as child route (not modal). `/interview/new` → Interviews section. `/question-banks` → Question Banks section. New `/trainer/settings` section with sidebar: Threshold / Cohorts / Curriculum / Users / Associates (BACKFILL-02 page lives here).
- [x] **SHELL-04**: Topbar cohort switcher is global and persists selection to URL query param (`?cohort=<id>`) — all Dashboard child pages respect the filter. Sidebar collapsed state persisted to localStorage.

## Trainer Analytics (Phase 7)

- [x] **ANALYTICS-01**: Dashboard > Roster renders KPI strip with 4 fixed cards: Avg Readiness, Mocks This Week, At-Risk Count (Top Gap label + count), AI-Trainer Variance. Values scoped by topbar cohort switcher. Single Prisma `$queryRaw` for all 4 KPIs.
- [x] **ANALYTICS-02**: Roster table rows render per-associate sparkline (last 6 sessions overall score) + trend word + top-gap tag + last-mock timestamp. All sparkline data sourced from a single windowed query (`ROW_NUMBER() OVER (PARTITION BY associateId)`) — no N+1.
- [x] **ANALYTICS-03**: Dashboard > Gap Analysis page aggregates by **skill** AND **topic** across selected cohort. Topic pulled from per-question `topic` field (fallback: first keyword when absent). Sort by count-associates-affected desc. Drill-through to list of associates with that gap.
- [x] **ANALYTICS-04**: Question-bank markdown parser reads optional `topic:` frontmatter field per question. `Session.questions` JSON stores `topic` per question object (set at interview start). Fallback to `keywords[0]` when bank hasn't been updated.
- [x] **ANALYTICS-05**: Dashboard > Calibration page shows trainer-override frequency + delta distribution (AI score vs trainer final). `Session.aiTrainerVariance` denormalized at session save (not computed per page view).
- [x] **ANALYTICS-06**: Cohort Trends card on Dashboard > Roster renders cohort-wide average readiness over time (line chart, weekly buckets, last 12 weeks).

## Associate Self-Dashboard (Phase 8)

- [x] **ASELF-01**: New route `/associate/[slug]/dashboard`. Sibling `layout.tsx` renders `AssociateNav` with tabs: Dashboard / Profile / Book a Mock. Dashboard shows personal gap trend chart (own GapScore history).
- [ ] **ASELF-02**: Single "Recommended Next Practice Area" card surfaces `Associate.recommendedArea` with a one-line "why" and a "Not now" dismiss. Dismiss persists for 7 days via localStorage.
- [ ] **ASELF-03**: Readiness-goal progress bar shows current weighted readiness vs cohort threshold. Associates do NOT see cohort-mate names (aggregate-only privacy default).
- [x] **ASELF-04**: "Book a Mock" CTA navigates associate to a trainer-scheduling flow (minimum viable: mailto link or in-app message to trainer — full scheduling deferred).

## PDF Analytics Export (Phase 9)

- [ ] **PDF-01**: Trainer can export cohort analytics report as PDF from Dashboard > Reports. Template includes KPI strip snapshot, gap-by-topic table, roster summary. Generated via `@react-pdf/renderer`.
- [ ] **PDF-02**: Trainer can export per-associate report from associate detail page. Template includes gap trend, session list, recommended areas. Sparkline/chart rendering uses a pre-rendered hand-rolled SVG helper (no recharts inside `@react-pdf` — OOM risk on constrained hosts).

## PIN Removal + Cleanup (Phase 10)

- [ ] **CLEANUP-01**: After 2-week grace period, CI grep-gate verifies zero matches for `ENABLE_ASSOCIATE_AUTH|pinHash|pinGeneratedAt|associate_session|verifyAssociateToken|isAssociateAuthEnabled` in `src/`. Gate is a pre-ship check (blocks merge to main).
- [ ] **CLEANUP-02**: Delete PIN routes (`/api/associate/pin/*`), services (`pinService`, `pinAttemptLimiter`, `associateSession`), legacy `/associate/login` redirect, `SignInTabs` feature flag logic, PIN-related tests, feature flag file `src/lib/featureFlags.ts`. Prisma migration drops `Associate.pinHash` + `Associate.pinGeneratedAt`.
- [ ] **CLEANUP-03**: Remove env vars `APP_PASSWORD`, `ASSOCIATE_SESSION_SECRET`, `ENABLE_ASSOCIATE_AUTH` from all envs + docs. CLAUDE.md + PROJECT.md updated to reflect Supabase-only auth.

---

## Future Requirements (deferred to v1.3 or later)

- **NOTIF-01**: Readiness change email notifications via Resend
- **NOTIF-02**: Trainer email stored in Settings; global on/off toggle
- **OPS-01**: Scheduled readiness sweep cron (GCE systemd timer or Cloud Run scheduled job)
- **OPS-02**: Production deploy automation (GitHub Actions → GCE SSH docker compose)
- **OPS-03**: Cloud Run zero-scale deploy path
- **ASELF-05**: Full in-app mock scheduling (calendar integration) — v1.2 ships mailto-only
- **ANALYTICS-07**: Per-question-bank analytics ("associates struggle most with <bank>") — requires bank provenance column on Session
- **QA-01**: Dark-mode visual QA across all v1.2 surfaces
- **QA-02**: Nyquist validation hygiene backfill for v1.0–v1.1 phases

## Out of Scope (v1.2)

- **No streaks / leaderboards / push notifications** — gamification anti-pattern risk; only readiness-goal progress bar ships
- **No cohort-mate visibility on associate dashboard** — aggregate-only privacy default
- **No materialized views for analytics** — inline Prisma `$queryRaw` fine until >2000 associates
- **No Redis for manifest cache** — in-memory `Map` sufficient for single-container deploy
- **No custom SMTP in Supabase** — orchestration via `admin.generateLink` + Resend keeps retry/idempotency in app code
- **No NextAuth / custom JWT** — Supabase Auth only
- **No PK swap on Associate** — additive `authUserId` FK only; `Session.associateId` unchanged

## Traceability

Roadmap phase numbers are continuous across milestones. v1.2 phases are numbered 16-25 (continuing from v1.1 which ended at Phase 15). The "Phase N" labels in the section headers above (Phase 1-10) are the milestone-relative ordinals.

| REQ-ID | Roadmap Phase | Status |
|--------|---------------|--------|
| CACHE-01 | Phase 16 | Complete |
| CACHE-02 | Phase 16 | Complete |
| BACKFILL-01 | Phase 17 | Pending |
| BACKFILL-02 | Phase 17 | Pending |
| AUTH-05 | Phase 18 | Pending |
| AUTH-06 | Phase 18 | Pending |
| AUTH-07 | Phase 18 | Pending |
| AUTH-08 | Phase 18 | Pending |
| INVITE-01 | Phase 19 | Complete |
| INVITE-02 | Phase 19 | Complete |
| INVITE-03 | Phase 19 | Complete |
| AUTH-09 | Phase 20 | Complete |
| AUTH-10 | Phase 20 | Complete |
| SHELL-01 | Phase 21 | Complete |
| SHELL-02 | Phase 21 | Complete |
| SHELL-03 | Phase 21 | Complete |
| SHELL-04 | Phase 21 | Complete |
| ANALYTICS-01 | Phase 22 | Complete |
| ANALYTICS-02 | Phase 22 | Complete |
| ANALYTICS-03 | Phase 22 | Complete |
| ANALYTICS-04 | Phase 22 | Complete |
| ANALYTICS-05 | Phase 22 | Complete |
| ANALYTICS-06 | Phase 22 | Complete |
| ASELF-01 | Phase 23 | Complete |
| ASELF-02 | Phase 23 | Pending |
| ASELF-03 | Phase 23 | Pending |
| ASELF-04 | Phase 23 | Complete |
| PDF-01 | Phase 24 | Pending |
| PDF-02 | Phase 24 | Pending |
| CLEANUP-01 | Phase 25 | Pending |
| CLEANUP-02 | Phase 25 | Pending |
| CLEANUP-03 | Phase 25 | Pending |

**Coverage:** 30/30 v1.2 requirements mapped. No orphans.
