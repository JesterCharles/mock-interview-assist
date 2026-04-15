# Milestone v1.1 — Cohort Readiness System

**Generated:** 2026-04-15
**Shipped:** 2026-04-14 (PR merged as `4238e36`)
**Purpose:** Team onboarding and project review

---

## 1. Overview

v1.1 evolves Next Level Mock from a single-associate Readiness Loop (v1.0) into a **cohort-first readiness engine**. Trainers can now group associates into cohorts, define weekly curriculum schedules, and filter dashboards/setup-wizards by what's actually been taught. Automated interviews are fully wired into the gap/readiness pipeline via a new authenticated entry — anonymous automated sessions remain supported but can no longer forge associate linkage. The entire UI converges onto a single DESIGN.md token system (warm parchment + Clash Display + DM Sans + burnt orange accent), with the legacy `--nlm-*` dark-theme token stack deleted.

**Headline metrics:**

| Metric | Value |
|--------|-------|
| Phases delivered | 8 (Phases 8–15) |
| Plans executed | 22/22 |
| Requirements satisfied | 14/14 (AUTH-01..04, PIPE-01..02, COHORT-01..04, CURRIC-01..02, DESIGN-01..03) |
| Commits | 131 |
| Files changed | 244 (+34,327 / −4,749) |
| Unit tests | 239 passing, 4 skipped |
| Playwright specs | 24/24 green (Phase 15) |
| Codex findings (pre-ship) | 9 (all P1/P2 addressed in `21187f9`) |
| Timeline | 2026-04-14 → 2026-04-15 (~24 hours wall time) |
| PR | `feat/v1.1-cohort-readiness-pr` → merged as `4238e36` |

---

## 2. Architecture

### New data model (Phase 8)

- **`Cohort`** — name, startDate, endDate?, description. Non-cascading delete (associates keep their history, just lose FK).
- **`CurriculumWeek`** — `cohortId`, `weekNumber`, `skillName` (display), `skillSlug` (**canonical matcher**), `topicTags[]`, `startDate`. DB-enforced `@@unique([cohortId, weekNumber])` (Codex #9).
- **`Associate.cohortId`** — nullable FK; unassigned associates remain fully functional.
- **`Associate.pinHash` + `pinGeneratedAt`** — bcryptjs-hashed 6-digit PIN; `pinGeneratedAt` doubles as session-token version for DB-backed revocation (Codex #4).
- **`Session.mode`** — `"trainer-led" | "automated"`, defaulted to `"trainer-led"` on all existing rows.
- **`Session.readinessRecomputeStatus`** — `"pending" | "done" | "failed" | "not_applicable"`, repair marker for the readiness sweep (Codex #5).
- **`Session.cohortId`** — nullable FK, copied from associate at write time.

Baseline migration `prisma/migrations/0000_baseline/migration.sql` was hand-written from the pre-v1.1 git snapshot (the Supabase DB had been db-push bootstrapped and lacked `_prisma_migrations` history). Post-Codex, both baseline and `0001_v11_cohorts` use `CREATE TABLE IF NOT EXISTS` + `DO $$ ... EXCEPTION WHEN duplicate_object` guards so `prisma migrate deploy` is idempotent across fresh dev DBs and existing prod.

### Readiness sweep

- Completion pipeline marks `Session.readinessRecomputeStatus = 'pending'` at write time, then `'done'` on successful gap+readiness fan-out, or `'failed'` on throw.
- **`POST /api/admin/readiness-sweep`** (trainer-auth) reprocesses pending/failed rows. The helper `runReadinessSweep` picks the most recent session per associate as the pipeline marker and uses `updateMany` to close sibling markers — one recompute covers all outstanding state for that associate. `runReadinessPipeline` now returns `boolean`; the sweep only closes sibling markers when it returns `true` (Codex P2 fix).

### PIN-gated associate flow (Phase 9; **feature-flagged off for v1.1 ship**)

- Dedicated env var **`ASSOCIATE_SESSION_SECRET`** (separate from `APP_PASSWORD`) HMAC-signs the `associate_session` cookie. Token version = `pinGeneratedAt.getTime()`; regenerating a PIN invalidates prior cookies without touching trainer sessions.
- Middleware enumerates identity as `trainer | associate | anonymous` from **cookie only** (Edge-safe; no DB). Version-check / stale-session handling lives in server-component helpers (`getAssociateSession()`).
- `/associate/login` → PIN entry. `/associate/[slug]` → matching-associate OR trainer grants access; mismatched slugs render JSX-wrapped 403 (Next.js page components cannot return raw Response).
- **`/associate/[slug]/interview`** is the explicit authenticated automated-interview entry (Codex #2) — Phase 10 wires it to `/api/associate/interview/complete`, which derives identity exclusively from the cookie and ignores client-supplied `associateSlug`. The anonymous `/api/public/interview/complete` unconditionally nulls the client's `associateSlug` before persisting (Codex #3 closure).

### Composite rate limiter

PIN verification is keyed on `(server-observed IP, fingerprint)` with a separate IP-only bucket. `NLM_TRUSTED_PROXY=true` opts into `x-forwarded-for` parsing behind an edge LB. Replaces the v1.0 fingerprint-only limiter for PIN routes (Codex P1 mitigation: a trusted client fingerprint alone is insufficient for a brute-forceable credential surface).

### Cohort dashboard (Phases 11–12)

- `/api/cohorts` full CRUD (zod-validated, non-cascading DELETE via `prisma.$transaction`). `/api/trainer/[slug]` PATCH assigns/unassigns cohorts.
- `/trainer/cohorts` CRUD UI; `/trainer` roster gains a cohort dropdown + opt-in readiness summary bar.
- **Backward compatibility:** default `GET /api/trainer` still returns `RosterAssociate[]` (v1.0 shape). The wrapped `{associates, summary}` shape is opt-in via `?includeSummary=true` (Codex #1). No existing v1.0 consumer breaks.

### Curriculum filter (Phase 13)

- `/api/cohorts/[id]/curriculum` CRUD + `?taught=true` query for `startDate <= today`.
- Setup wizard fetches curriculum and gap scores in parallel. `filterTechsByCurriculum` uses `Set.has(firstSegment)` for **exact skillSlug match** — `react` does not match `react-native` (Codex #9). Wizard separates `allTechs` (source) from `availableTechs` (visible) so curriculum filter never compounds on itself (Codex P2 fix).
- `<400ms` wizard load is an advisory target, not a release gate; Playwright ceiling is `<2000ms`. The real bottleneck is recursive GitHub question-bank discovery — a cached manifest is deferred to v1.2 (Codex #7).

### Unified design system (Phases 14–15)

- Phase 14: DESIGN.md tokens added alongside legacy `--nlm-*` tokens. New routes (PIN entry, `/associate/*`, cohort + curriculum UIs) built on `PublicShell` + `.btn-accent-flat` / `.btn-secondary-flat` from day one. Legacy pages untouched.
- Phase 15: **legacy deletion sweep**. All remaining routes (`/`, `/interview`, `/review`, `/dashboard`, `/login`, `/pdf`, `/history`, `/question-banks`) and shared components (`Navbar`, `QuestionCard`, `SpeechToText`, `ProgressBar`) migrated to DESIGN tokens. `globals.css` collapsed from ~600 lines to **179 lines**. Zero `--nlm-*` tokens, zero `.glass-card` / `.gradient-text` / `.nlm-bg` / glow utilities, zero kill-list keyframes. Single `/signin` with Trainer/Associate tabs replaces split logins (`/login` and `/associate/login` 301-redirect). `/dashboard` renamed to `/interview/new`; `/trainer` is the trainer dashboard. Dark mode tokens defined (`@media (prefers-color-scheme: dark)` + manual toggle).

---

## 3. Phases

**Phase 8 — Schema Migration** (2 plans). Added `Cohort`, `CurriculumWeek`, and the FK/status columns that every other phase depends on. Hand-wrote `0000_baseline/migration.sql` from git snapshot `9662034` to resolve P3005 ("database schema is not empty") without a destructive reset. Wired `prisma migrate deploy` into the Docker runtime CMD (not build-time) to avoid baking DB creds into the image. Codex-follow-up patched the baseline to be idempotent (`IF NOT EXISTS` + `duplicate_object` guards).

**Phase 9 — Associate PIN Auth** (3 plans). bcryptjs-hashed 6-digit PINs (pure JS, works in node:22-alpine). Dedicated `ASSOCIATE_SESSION_SECRET` HMAC key; cookie version = `pinGeneratedAt`. Middleware refactored to cookie-only identity enum (Edge-safe). Server-side version check + JSX-wrapped 403 for slug mismatch. Added the new `/associate/[slug]/interview` authenticated entry that Phase 10 consumes. Per Codex P1 post-ship review, **the entire PIN surface is feature-gated behind `ENABLE_ASSOCIATE_AUTH` (default `false`)** — routes return 404 and UI CTAs are hidden in v1.1 prod. Vitest sets the flag to exercise the code path.

**Phase 10 — Automated Interview Pipeline** (3 plans). Split completion endpoints: `/api/public/interview/complete` stays anonymous and unconditionally nulls `associateSlug`; new `/api/associate/interview/complete` derives identity exclusively from the cookie. Both go through shared `runReadinessPipeline` with the DB recompute marker. `/api/admin/readiness-sweep` (trainer-auth) repairs outstanding `pending`/`failed` markers using an "update-one, close siblings" pattern. Post-Codex, `Session.mode` is persisted as `'automated'` for both authenticated and anonymous automated entries.

**Phase 11 — Cohort Management** (3 plans). Full `/api/cohorts` CRUD with inline zod schemas per route (D-04 convention). Non-cascading DELETE uses `prisma.$transaction({ timeout: 10_000 })` with an inline comment documenting the Supabase transaction-pooler assumption. `PATCH /api/trainer/[slug]` added for cohort assignment. Code review found 7 medium/low findings (endDate-vs-startDate PATCH validation, undocumented transaction assumption, assessment typing) — all 7 fixed atomically in `REVIEW-FIX.md`. 40 automated tests across the phase.

**Phase 12 — Cohort Dashboard Views** (2 plans). Cohort dropdown + opt-in readiness summary bar above the roster. Crucially, **default `GET /api/trainer` response shape is unchanged from v1.0** — the wrapped `{associates, summary}` shape is opt-in via `?includeSummary=true` (Codex #1). Five success criteria verified by static analysis; visual QA on the dropdown, filter state transitions, and summary-pill count correlation was marked `human_needed`.

**Phase 13 — Curriculum Schedule** (3 plans). `/api/cohorts/[id]/curriculum` CRUD with canonical `skillSlug` regex validation and `409` on unique violation. Trainer UI at `/trainer/cohorts/[id]/curriculum`. Setup wizard filter uses `Set.has(firstSegment)` for exact match — never substring. Playwright spec covers 4 scenarios (no cohort, cohort-no-curriculum, taught-only filter, future-date exclusion) with a `<2000ms` advisory perf ceiling. Post-Codex, wizard no longer compounds the filter on itself (separated `allTechs` source from `availableTechs` visible state).

**Phase 14 — Design Cohesion** (2 plans). DESIGN.md tokens added **alongside** legacy `--nlm-*` — not replacing them (Codex #8 intent at the time). `PublicShell` + `ReadinessSignal` + `.btn-accent-flat` / `.btn-secondary-flat` introduced. New routes (PIN entry, `/associate/*`, cohort + curriculum UIs) built on tokens from day one. Legacy `/`, `/interview`, `/review` were intentionally left visually unchanged. Playwright visual asserts confirm `rgb(245, 240, 232)` parchment bg + `rgb(200, 90, 46)` burnt orange accent on new routes.

**Phase 15 — Design Cohesion Sweep** (4 plans). The v1.1 closing move: **delete the legacy token stack entirely**. Wave 1 migrated shared components (Navbar, QuestionCard, SpeechToText, ProgressBar). Wave 2 migrated `/`, `/interview`, `/review` (HIGH RISK — mid-session surfaces) with full manual trainer-led smoke. Parallel Wave 2 track migrated `/dashboard`, `/pdf`, `/history`, `/question-banks`. Wave 3 ran a grep gate + Playwright regression suite, then atomically deleted `--nlm-*` tokens, kill-list utilities, and keyframes from `globals.css` in commit `06987c7`. Also shipped: unified `/signin` with Trainer/Associate tabs, legacy redirects (`/dashboard→/interview/new`, `/login→/signin?as=trainer`, `/associate/login→/signin?as=associate`), role-aware single Navbar, dark mode toggle. 9/9 automated SCs verified; 50→0 legacy refs across `src/`.

---

## 4. Key Decisions

- **PIN auth feature-flagged off for v1.1 ship (`ENABLE_ASSOCIATE_AUTH=false`).** Codex P1 flagged the PIN rate limiter as trusting client fingerprint — a brute-forceable surface. Rather than rearchitect the limiter mid-ship, we defense-in-depth'd it (composite server-IP + fingerprint buckets, `NLM_TRUSTED_PROXY` opt-in) *and* gated the entire PIN surface behind a flag. v1.1 ships the code path but defaults it off; v1.2 will harden further and flip the flag. Vitest sets the flag true so the pipeline has full coverage.

- **Legacy `--nlm-*` deletion (Codex #8 override).** Phase 14 CONTEXT originally committed to preserving legacy utilities on `/`, `/interview`, `/review`. After Phase 14 shipped, scope was expanded via a new Phase 15 (DESIGN-03) to migrate all remaining surfaces and delete the legacy stack — not preserve it. The rationale: two parallel token systems is retrofit debt a solo dev cannot amortize, and Phase 14's visual audit surfaced several implicit inconsistencies (drop shadows, borders, heading weights) that were cheaper to fix via migration than via a permanent dual-system styleguide. Decision recorded in `15-CONTEXT.md`; executed atomically in commit `06987c7`.

- **Idempotent baseline migration.** The Supabase dev DB was db-push bootstrapped — `_prisma_migrations` was empty, so `prisma migrate deploy` fails with P3005. `--create-only` would have required a destructive reset. Instead: hand-wrote `0000_baseline/migration.sql` from git snapshot, marked it applied via `prisma migrate resolve`, then let `0001_v11_cohorts` apply cleanly. Codex P1 follow-up then rewrote both migrations with `CREATE TABLE IF NOT EXISTS` + `DO $$ ... EXCEPTION WHEN duplicate_object THEN NULL; END $$` FK guards so the same migration is safe on both fresh and pre-existing DBs.

- **Composite rate limiter for PIN verification.** The v1.0 limiter keyed only on FingerprintJS fingerprint. For PIN (a brute-forceable 6-digit credential), a single client-controlled key was insufficient. Phase 9 / Codex-fix now key on `(server-observed IP, fingerprint)` with a separate IP-only bucket. `NLM_TRUSTED_PROXY=true` opts into `x-forwarded-for` when behind an edge LB — without it, the app uses the direct socket IP.

- **Split completion endpoints (Codex #3).** Rather than one endpoint that conditionally reads `associateSlug`, two endpoints: anonymous strips identity unconditionally; authenticated derives identity from cookie and ignores client payload. Eliminates the forged-linkage attack surface by construction.

- **`Session.readinessRecomputeStatus` + sweep endpoint (Codex #5).** Readiness fan-out used to be fire-and-forget; silent failures left associates with stale readiness. Now every automated session write carries a DB-visible `pending` marker, transitioned to `done`/`failed` by the pipeline. `/api/admin/readiness-sweep` makes failures repairable without backfill scripts. `runReadinessPipeline` returns `boolean` so the sweep doesn't false-close sibling markers on a throw (Codex P2 fix).

- **Opt-in dashboard summary shape (Codex #1).** v1.0 consumers of `GET /api/trainer` expect `RosterAssociate[]`. Phase 12 originally wrapped the response as `{associates, summary}`. Codex caught the compat break; final API returns the wrapped shape only when `?includeSummary=true` is passed.

- **Exact skillSlug match, not substring (Codex #9).** `CurriculumWeek` carries `skillName` (display) and `skillSlug` (canonical matcher). Filter uses `Set.has(firstSegment)` — `react` never matches `react-native`. `@@unique([cohortId, weekNumber])` enforced at DB level.

- **`<400ms` wizard perf is a target, not a gate (Codex #7).** Real bottleneck is recursive GitHub question-bank discovery. Playwright ceiling is `<2000ms`; `<400ms` is logged, not enforced. Cached manifest deferred to v1.2.

- **Dedicated `ASSOCIATE_SESSION_SECRET`, not `APP_PASSWORD` (Codex #4).** Decouples associate auth from trainer password rotation and lets the cryptographic secret be a real HMAC key, not a human-entered password. Token version = `pinGeneratedAt` gives DB-backed revocation without a session-revocation table.

---

## 5. Requirements

All 14 v1.1 requirements satisfied.

| REQ-ID | Phase | Status | Notes |
|--------|-------|--------|-------|
| **AUTH-01** Trainer generates 6-digit PIN per associate | 9 | ✅ | bcryptjs hash; PIN shown once. Feature-gated off for v1.1 ship. |
| **AUTH-02** Associate PIN → HttpOnly session cookie | 9 | ✅ | `associate_session`, HMAC-signed with dedicated secret. |
| **AUTH-03** Associate auth coexists with trainer auth; no cross-contamination | 9 | ✅ | Separate cookie names; middleware identity enum. |
| **AUTH-04** `/associate/[slug]` auth-guarded; matching associate OR trainer; 403 on mismatch | 9 | ✅ | Server-component helper does version check + JSX 403. |
| **PIPE-01** Automated sessions link to authenticated associate via PIN session | 10 | ✅ | `/api/associate/interview/complete` derives identity from cookie. |
| **PIPE-02** Automated sessions trigger gap + readiness pipeline | 10 | ✅ | Shared `runReadinessPipeline` + sweep repair path. |
| **COHORT-01** Trainer CRUD cohorts | 11 | ✅ | `/api/cohorts` + `/trainer/cohorts` UI; non-cascading delete. |
| **COHORT-02** Associate assigned via nullable FK; unassigned remain functional | 11 | ✅ | `PATCH /api/trainer/[slug]`; null-cohort associates visible in "All Associates". |
| **COHORT-03** Roster filter by cohort | 12 | ✅ | Dropdown on `/trainer`; `?cohortId=` query. |
| **COHORT-04** Aggregate readiness summary per cohort | 12 | ✅ | Summary bar above roster; `?includeSummary=true` opt-in. |
| **CURRIC-01** Trainer defines curriculum weeks | 13 | ✅ | `/api/cohorts/[id]/curriculum` + trainer UI; `@@unique([cohortId, weekNumber])`. |
| **CURRIC-02** Setup wizard filters to taught slugs; adaptive weights compose on top | 13 | ✅ | Exact skillSlug match; `filterGapScoresByCurriculum` runs before `applyGapScores`. |
| **DESIGN-01** Public/associate/auth flows on DESIGN.md tokens | 14 | ✅ | PublicShell + Clash Display + burnt orange accent. |
| **DESIGN-02** Cohort + curriculum UIs on DESIGN.md from day one | 14 | ✅ | Zero grep hits for legacy utilities in `src/components/cohort`, `src/components/curriculum`, `src/app/trainer/cohorts`. |
| **DESIGN-03** (new) All routes unified; legacy `--nlm-*` deleted | 15 | ✅ | 50→0 legacy refs; `globals.css` 179 lines; 9/9 automated SCs + 24/24 Playwright. |

Phase 12, 13, and 15 have `human_needed` verification status for visual / UI round-trip items that cannot be scripted. All automated gates are green.

---

## 6. Tech Debt

**Shipped in v1.1 but parked:**

- **PIN auth ships feature-flagged off (`ENABLE_ASSOCIATE_AUTH=false`).** All PIN code paths, routes, and UI are complete; prod defaults them off per Codex P1. v1.2 work: harden rate limiter further (IP reputation, exponential backoff on repeat failures), flip the flag, validate in staging.
- **Dark mode tokens defined, not fully themed across all surfaces.** `globals.css` has `@media (prefers-color-scheme: dark)` + manual toggle mappings, and the toggle is wired. Spot-check passes on signin / profile / trainer, but not every interactive state (error banners, disabled buttons, pill badges across all readiness colors) has been visually QA'd in dark mode.
- **Cached GitHub question-bank manifest deferred.** Recursive question-bank discovery is the real wizard perf bottleneck. Until a cached manifest lands, `<400ms` is advisory only (Codex #7 accepted).
- **Readiness sweep is manual (no cron).** `/api/admin/readiness-sweep` exists and is trainer-authed; a scheduled trigger is not yet wired. Trainers repair stale readiness on demand.
- **Nyquist validation partially present.** Only Phase 11 has a full `VALIDATION.md`. Phases 12/13/14/15 have `VERIFICATION.md` with `human_needed` residuals for browser-based flows. Same gap pattern as v1.0.
- **Legacy redirects are permanent.** `/dashboard`, `/login`, `/associate/login` all 301 to the new unified paths. Any external bookmarks still resolve; removal deferred indefinitely.

**Deferred explicitly to v1.2+:**

- Magic link / Supabase Auth OTP (replace PIN entirely) — see `AUTH-FUTURE-01`.
- Curriculum cloning between cohorts.
- Curriculum-scoped gap computation (compute gaps only for taught skills).
- Cohort snapshots + per-cohort trend charts.
- Readiness-change email notifications (Resend) + trainer preferences.
- Self-service PIN reset for associates.

---

## 7. Getting Started

### Local setup

```bash
# 1. Clone and install
git clone <repo> && cd mock-interview-assist
npm install

# 2. Env — copy .env.example or .env.docker
cp .env.example .env.local
# Required for local dev:
#   DATABASE_URL=postgresql://...:6543/...?connection_limit=5&pool_timeout=10
#   DIRECT_URL=postgresql://...:5432/...   (for migrations)
#   APP_PASSWORD=<trainer-login-password>
#   ASSOCIATE_SESSION_SECRET=<random-32-byte-hex>   # NEW in v1.1
#   OPENAI_API_KEY=...
#   GITHUB_TOKEN=...
#   RESEND_API_KEY=...
# Optional:
#   ENABLE_ASSOCIATE_AUTH=false    # default; flip to true to exercise PIN surface
#   NLM_TRUSTED_PROXY=false        # default; set true only behind trusted edge LB

# 3. Apply migrations (idempotent — safe against existing DBs)
npx prisma migrate deploy
npx prisma generate

# 4. Run
npm run dev           # http://localhost:3000
npm test              # vitest; 239 pass, 4 skipped
npm run lint
npx tsc --noEmit      # typecheck
npm run build         # 35 routes; standalone Docker output
```

### Key env vars (v1.1 additions)

| Var | Required | Default | Purpose |
|-----|----------|---------|---------|
| `DATABASE_URL` | yes | — | Supabase transaction pooler (port 6543) |
| `DIRECT_URL` | yes (migrations) | — | Direct Supabase (port 5432) |
| `APP_PASSWORD` | yes | — | Trainer login |
| `ASSOCIATE_SESSION_SECRET` | yes (v1.1) | — | HMAC key for associate cookies; **not** `APP_PASSWORD` |
| `ENABLE_ASSOCIATE_AUTH` | no | `false` | Exposes PIN surface; prod ships off |
| `NLM_TRUSTED_PROXY` | no | `false` | Trust `x-forwarded-for` for IP-keyed rate limiter |

### Key entry points

| Path | What it is |
|------|-----------|
| `/signin` | Unified trainer + associate login (tabbed) |
| `/trainer` | Trainer dashboard (roster + cohort filter + summary) |
| `/trainer/cohorts` | Cohort CRUD |
| `/trainer/cohorts/[id]/curriculum` | Curriculum week editor |
| `/trainer/[slug]` | Associate detail (gap chart, sessions, calibration) |
| `/interview/new` | Trainer setup wizard (was `/dashboard` in v1.0) |
| `/associate/[slug]` | Associate public profile (auth-guarded) |
| `/associate/[slug]/interview` | Authenticated automated-interview entry |
| `/api/admin/readiness-sweep` | Trainer-auth readiness repair endpoint |

### Where to read the plans

- `.planning/ROADMAP.md` — Phase index and status
- `.planning/REQUIREMENTS.md` — 14 requirements + deferred list
- `.planning/PROJECT.md` — Core value, constraints, key decisions table
- `.planning/phases/{08..15}-*/` — Per-phase CONTEXT.md (decisions), PLAN.md (per plan), SUMMARY.md (outcomes), VERIFICATION.md
- `.planning/phases/11-cohort-management/REVIEW.md` + `REVIEW-FIX.md` — Phase 11 code-review cycle
- `.planning/PIPELINE-SHIP.md` — v1.1 ship log + Codex P1/P2 resolutions
- `.planning/reports/MILESTONE_SUMMARY-v1.0.md` — Predecessor milestone summary
- `DESIGN.md` — Token authority (read before any UI work)
- `CLAUDE.md` — Project conventions + unified workflow ownership

### Core modules to read first

- `src/lib/prisma.ts` — singleton client
- `src/lib/auth-server.ts` + `src/lib/associate-session.ts` — identity enum, cookie helpers
- `src/middleware.ts` — cookie-only identity classification (Edge-safe)
- `src/lib/sessionPersistence.ts` — dual-write orchestrator; `options.mode` persists `Session.mode`
- `src/lib/readinessPipeline.ts` + `src/lib/readinessSweep.ts` — fan-out + repair
- `src/lib/curriculumFilter.ts` — exact skillSlug matcher
- `src/app/globals.css` — DESIGN token authority (179 lines, zero legacy)
- `src/components/layout/PublicShell.tsx` — public/associate shell
- `prisma/schema.prisma` + `prisma/migrations/` — data model + idempotent baseline

---

*Milestone v1.1 shipped 2026-04-14. Next: `/gsd-audit-milestone` → `/gsd-complete-milestone` → v1.2 planning (harden PIN limiter, flip `ENABLE_ASSOCIATE_AUTH`, cached question-bank manifest, readiness notifications).*
