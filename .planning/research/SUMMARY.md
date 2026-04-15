# Research Synthesis — Milestone v1.2 (Analytics & Auth Overhaul)

**Synthesized:** 2026-04-15
**Inputs:** STACK.md · FEATURES.md · ARCHITECTURE.md · PITFALLS.md
**Overall confidence:** MEDIUM-HIGH (Supabase SSR/RLS patterns are HIGH; exact package versions + Supabase rate limits flagged for install-time verification)

---

## Executive Summary

v1.2 is a **greenfield Supabase Auth install** (not an upgrade — `@supabase/supabase-js` and `@supabase/ssr` are absent from `package.json` as of 2026-04-15) combined with an analytics layer, dashboard shell redesign, associate self-dashboard, and a cached question-bank manifest. The auth cutover is the load-bearing work: every other bundle either depends on clean Supabase identity (Analytics, Associate Dashboard) or is incidentally coupled (Dashboard shell hosts the KPIs). The manifest cache is fully independent and is the natural quick-win opener.

The dominant technical decision — converged across all four research docs — is **RLS as defense-in-depth, app-layer authorization as primary enforcement**. Prisma connects via a `BYPASSRLS` service role through Supabase's Transaction Pooler, which makes session-scoped `SET LOCAL` RLS infeasible without breaking pooling. This is a locked architectural choice; do not revisit during planning. Policies still get written (safety net against any future direct `supabase-js` data reads), but every Prisma query must filter explicitly by the identity resolved from `getCallerIdentity()`.

The single highest-risk thread is the PIN-to-Supabase migration: existing `Associate` rows have `slug` + `displayName` but **no `email` column** yet, so bulk onboarding depends on a trainer-driven email backfill before cutover. All four docs flag this as the first blocker for requirements. Magic-link delivery should go through `supabase.auth.admin.generateLink` + existing Resend integration (not Supabase's default SMTP) to dodge rate limits and reuse proven deliverability. PIN removal is staged as a four-commit sequence, not a big-bang PR.

---

## Cross-Doc Agreements (what all 4 converge on)

| Decision | Agreed Sources | Status |
|----------|---------------|--------|
| `@supabase/ssr` + `supabase-js` (admin) as the auth stack | STACK, ARCH, PITFALLS | **Locked** |
| Supabase Auth is greenfield (not installed) | STACK, ARCH, PITFALLS | **Locked** |
| RLS is defense-in-depth; app-layer auth is primary | STACK, ARCH, PITFALLS | **Locked — Option A** |
| Prisma keeps using service-role / Transaction Pooler | STACK, ARCH, PITFALLS | **Locked** |
| `Associate.authUserId` is additive nullable FK (not PK swap) | STACK, ARCH, PITFALLS | **Locked** |
| Magic links via `generateLink` + Resend (not Supabase SMTP) | STACK, FEATURES, ARCH, PITFALLS | **Locked** |
| PIN removal is staged (4 commits min, not one PR) | ARCH, PITFALLS | **Locked** |
| In-memory `Map` + TTL for manifest cache; no Redis | STACK, FEATURES, ARCH, PITFALLS | **Locked** |
| Nested App Router layout (`trainer/layout.tsx`) for shell | FEATURES, ARCH | **Locked** |
| `/trainer/[slug]` stays as child route (not modal) | FEATURES, ARCH | **Locked** |
| Associate dashboard is a NEW route, not an extension of profile | FEATURES, ARCH | **Locked** |
| Recharts stays (React 19 compatible); no Tremor/Nivo | STACK, FEATURES | **Locked** |
| 4 KPI cards max (Avg Readiness, Mocks/Week, At-Risk, Top Gap) | FEATURES, ARCH | **Locked** |
| Middleware must run `getUser()` BEFORE route guard, return same mutated response | ARCH, PITFALLS | **Locked** |
| Trainer role via `user_metadata.role = 'trainer'` (not separate table) | ARCH, PITFALLS | **Locked** |
| No streaks / no leaderboards / no push notifications | FEATURES | **Locked** |
| Bulk invite batch size cap = 50; per-email transaction | STACK, FEATURES, ARCH | **Locked** |
| Magic-link expiry = 7 days | FEATURES, PITFALLS | **Locked** |
| PKCE flow enabled | PITFALLS | **Locked** |
| Hash-based + TTL hybrid manifest invalidation (ETag via `If-None-Match`) | STACK, ARCH, PITFALLS | **Locked** |
| Recharts must NOT render inside `@react-pdf/renderer`; pre-render SVG server-side | FEATURES, ARCH, PITFALLS | **Locked** |

---

## Cross-Doc Conflicts (resolved)

### Conflict 1: Manifest cache TTL duration
- STACK: 10min · FEATURES: 15min · ARCH: 5min · PITFALLS: prefers hash-based

**Resolution:** **5-minute TTL + ETag short-circuit + manual "Refresh" button + `/api/github/cache/invalidate`.** ARCH's tightest bound; ETag (304) resets TTL without re-download.

### Conflict 2: Magic-link delivery mechanism
- STACK/ARCH/PITFALLS: `generateLink` + Resend · FEATURES: custom SMTP via Resend in Supabase

**Resolution:** **`generateLink` server-side + send via Resend.** Keeps orchestration code in control of rate/idempotency/retry. Don't configure custom SMTP in Supabase.

### Conflict 3: Bulk-invite existing-email behavior
- STACK/FEATURES: skip + record duplicate · ARCH: reassign cohort if different; skip if same

**Resolution:** **ARCH wins.** Different cohort = reassign (common training-ops flow). Same cohort = skip. Add `Associate.lastInvitedAt` + 5-min re-invite throttle.

### Conflict 4: Goals & streaks scope
- FEATURES main body: progress bar + weekly counter · FEATURES MVP table: defer entirely

**Resolution:** **Readiness-goal progress bar only in v1.2.** Defer consistency counter. Highest anti-pattern-risk bundle; minimize surface area.

### Conflict 5: Cohort switcher placement
**Resolution:** **Topbar (global).** Matches locked shell; trainers manage multiple concurrent cohorts.

### Conflict 6: PIN removal grace period
- FEATURES/PITFALLS: 2 weeks · ARCH: single deploy cycle

**Resolution:** **2-week grace + grep-gate.** ARCH's single-cycle too aggressive for prod sessions. PITFALLS's grep rule (`rg "ENABLE_ASSOCIATE_AUTH|pinHash|pinGeneratedAt|associate_session|verifyAssociateToken|isAssociateAuthEnabled" src/` returns zero) becomes a required pre-ship CI check before `DROP COLUMN`.

---

## Locked Decisions (DO NOT revisit)

1. **Auth stack:** `@supabase/ssr` + `@supabase/supabase-js` admin. No NextAuth. No custom JWT.
2. **RLS enforcement:** Option A — app-layer primary, RLS defense-in-depth. Prisma on service-role + Transaction Pooler.
3. **Identity linkage:** `Associate.authUserId` nullable FK to `auth.users`. `Associate.id` stays as app PK. No FK surgery on `Session`/`GapScore`.
4. **Trainer role marker:** `auth.users.user_metadata.role`. No separate `TrainerProfile` table.
5. **Magic-link flow:** `admin.generateLink` + Resend. PKCE enabled. 7-day expiry.
6. **Charts:** Recharts 3.8.1. No Tremor/Nivo/chart.js.
7. **Manifest cache:** in-memory `Map` + 5-min TTL + ETag + manual invalidate endpoint. No Redis.
8. **Dashboard shell:** nested `src/app/trainer/layout.tsx`. URLs preserved (`/trainer`, `/trainer/[slug]`).
9. **Associate dashboard:** NEW route `/associate/[slug]/dashboard`. Profile stays at `/associate/[slug]`. Sibling `layout.tsx` provides `AssociateNav`.
10. **KPI strip:** 4 cards — Avg Readiness, Mocks This Week, At-Risk Count, Top Gap. AI/Trainer Variance optional 5th (gated on override volume).
11. **Gamification:** none. Readiness-goal progress bar only.
12. **Bulk invite:** 50/call cap, per-email transaction, idempotent on email+cohort.
13. **Analytics:** Prisma `$queryRaw` for aggregations, inline (no materialized views until >2000 associates).
14. **AI/Trainer variance:** denormalize to `Session.aiTrainerVariance Float?` at session save.
15. **PIN removal timeline:** 4 commits — (a) Supabase alongside PIN, (b) data migration, (c) flip middleware, (d) delete PIN after 2-week grace + grep-gate.

---

## Open Questions (MUST answer before planning)

### Q1 — Associate email audit (BLOCKER for Phase 2)
How many existing `Associate` rows have an obtainable email? Collisions? Any email in `session.candidateName` or adjacent fields for backfill? Forks Phase 2 strategy (hard vs soft cutover).
**How:** `SELECT COUNT(*), COUNT(DISTINCT slug) FROM "Associate"` + candidateName pattern audit.

### Q2 — Supabase project tier + current email rate limits
Free vs Pro? April-2026 rate-limit buckets? Affects bulk-invite batch-size calibration + inter-call delay.
**How:** Dashboard → Auth → Rate Limits.

### Q3 — Latest `@supabase/ssr` version
CLAUDE.md asserts `0.10.2`; STACK could not verify. **How:** `npm view @supabase/ssr version` at install time.

### Q4 — Does `Session` capture question-bank provenance (`repo`/`branch`/`file`)?
Needed for per-question-bank analytics differentiator. If absent: add schema field in v1.2 OR defer analytic to v1.3.
**How:** Inspect `prisma/schema.prisma` + `sessionPersistence.ts`.

### Q5 — Does `finalized.html` sidebar spec match 5-item flat nav?
ARCH + FEATURES made recommendations without reading locked mockup (sandbox permission denied on `~/.gstack`). **How:** Read during Phase 6 design reconciliation.

### Q6 — Cohort switcher visibility
Resolved above (topbar). Confirm with user.

### Q7 — PDF scope: per-associate on-demand + cohort, or cohort-only?
Affects template count. Recommend both; cut per-associate if timeline slips.

### Q8 — Cohort-mate privacy
Can associates see cohort-mate names? Default: aggregate-only, no names. Affects associate-dashboard copy.

---

## Recommended Phase Order for ROADMAP.md

### Phase 1 — Cached Question-Bank Manifest
Independent, quick win, validates <400ms wizard target. `src/lib/github-manifest-cache.ts`, `/api/github` wrap, `/api/github/cache/invalidate` (trainer-only), wizard "last synced" hint + refresh button. **No research needed.**

### Phase 2 — Associate Email Backfill + Schema Prep
Unblocks downstream. Prisma migration adds `Associate.email String? @unique` + `authUserId String? @unique`. Trainer UI to enter emails. Audit script. **Research: YES — Q1 must answer first.**

### Phase 3 — Supabase Auth Install (Alongside PIN)
Install `@supabase/ssr` + `supabase-js`. Scaffold `src/lib/supabase/{server,middleware,admin}.ts`. Trainer email/password login + magic-link callback route. PIN still active. **Research: YES — Q2 + Q3 + PKCE config.**

### Phase 4 — Bulk Invite + Data Migration
`/api/trainer/invites/bulk` (per-email transaction, 50/call cap). Bulk UI (textarea → chips → preview → result table). Migration script for existing associates. `lastInvitedAt` throttle. **Research: light — Resend DMARC/SPF/DKIM verification.**

### Phase 5 — Middleware Cutover + RLS Policies
Flip `src/middleware.ts` + `getCallerIdentity` to Supabase-primary. Deploy RLS with `is_trainer()` SECURITY DEFINER helper. PIN legacy fallback in middleware during 2-week grace. **No research — ARCH §1.5 + §2 canonical.**

### Phase 6 — Dashboard Shell Redesign
`src/app/trainer/layout.tsx` (topbar + sidebar), cohort switcher in topbar, localStorage collapse state, Radix sheet for mobile. URLs preserved. **Research: YES — Q5 reconcile with `finalized.html`.**

### Phase 7 — Trainer Analytics
KPI strip, roster sparklines (single window-function query), cohort trend chart, skill-gap aggregation, `/trainer/gap-analysis`, `/trainer/calibration`. `src/lib/analyticsService.ts`. `Session.aiTrainerVariance` column + pipeline hook. **No research — ARCH §3 complete.**

### Phase 8 — Associate Self-Dashboard
New `/associate/[slug]/dashboard` + shared `AssociateNav`. Gap trend, single primary recommendation with "why" + dismiss, book-next-mock CTA, readiness-goal progress bar. **No research — FEATURES §C locked.**

### Phase 9 — PDF Analytics Export
Cohort + per-associate templates. SVG sparkline helper (no recharts in PDF). Memory-safe rendering. **Research: light — @react-pdf SVG primitive spike.**

### Phase 10 — PIN Removal + Cleanup
After 2-week grace. Delete PIN routes/services/tests/UI, `DROP COLUMN`, env cleanup, flag removal. CI grep-gate. **No research — PITFALLS §8 exhaustive file list.**

---

## Phase Research Flags

| Phase | Needs `/gsd-research-phase`? | Reason |
|-------|------------------------------|--------|
| 1. Manifest cache | NO | Textbook pattern |
| 2. Email backfill | **YES** | Q1 audit forks strategy |
| 3. Supabase install | **YES** | Q2 + Q3 + PKCE details |
| 4. Bulk invite + migration | YES (light) | Resend domain/DMARC |
| 5. Middleware + RLS | NO | ARCH §1.5 + §2 locked |
| 6. Dashboard shell | **YES** | Q5 finalized.html reconcile |
| 7. Analytics | NO | ARCH §3 complete |
| 8. Associate dashboard | NO | FEATURES §C locked |
| 9. PDF export | YES (light) | @react-pdf SVG spike |
| 10. Cleanup | NO | PITFALLS §8 complete |

---

## Top Pitfalls Per Phase (surface in ROADMAP)

**Critical:**
1. **Middleware ordering + same-response-return** (Phase 5) — `getUser()` before route guard; return mutated response, not fresh `NextResponse.next()`.
2. **Prisma bypasses RLS silently** (Phase 5) — document in PROJECT.md; every Prisma query filters explicitly.
3. **Email collisions during migration** (Phase 2 + 4) — dry-run script emits conflict report; trainer approves CSV.
4. **Magic-link rate limits** (Phase 4) — `generateLink` + Resend; 250ms inter-call jitter; structured result table.
5. **PIN-removal grep-gate** (Phase 10) — CI check before `DROP COLUMN` deploy.

**Moderate:**
- **N+1 roster sparklines** (Phase 7) — `ROW_NUMBER() OVER (PARTITION BY associateId)`, single query.
- **recharts-in-PDF OOM** (Phase 9) — pre-rendered SVG helper only.
- **Mass-logout on cutover** (Phase 5) — weekend window; 2-week dual-auth grace; verify Zustand localStorage preserves mid-interview state.
- **Redirect URL per env** (Phase 3) — `NEXT_PUBLIC_SITE_URL` + boot-time assert against `localhost` in prod.
- **PKCE flow for magic links** (Phase 3) — prevent email-scanner auto-consume.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Auth stack + SSR pattern | HIGH | Supabase docs + direct code |
| RLS design (defense-only) | HIGH | Known Prisma + pgBouncer limitation |
| Analytics architecture | HIGH | Raw-SQL at current scale |
| Dashboard shell pattern | MEDIUM | Canonical App Router; finalized.html unverified |
| Associate UX | MEDIUM-HIGH | Competitor patterns from training data |
| Bulk invite orchestration | HIGH | ARCH §7 complete |
| Manifest cache | HIGH | Textbook |
| PDF chart rendering | MEDIUM | @react-pdf SVG finicky; spike advised |
| Supabase rate-limit numbers | LOW-MEDIUM | Install-time verify (Q2) |
| Package version pins | MEDIUM | Install-time verify (Q3) |
| Existing email coverage | UNKNOWN | **Critical gap — Q1 before Phase 2** |

**Overall: MEDIUM-HIGH.** Critical gaps: Q1 (email audit), Q5 (finalized.html). All other uncertainty is install-time resolvable.

---

## Gaps to Flag for Requirements Phase

1. **Associate email coverage audit (Q1)** — highest priority; forks Phase 2.
2. **`finalized.html` sidebar spec (Q5)** — reconcile before Phase 6.
3. **PDF export scope (Q7)** — cohort-only vs both.
4. **Cohort-mate privacy (Q8)** — default aggregate-only.
5. **Supabase project tier (Q2)** — confirm before Phase 3.
6. **Question-bank provenance in `Session` (Q4)** — schema check; v1.2 vs v1.3 decision for per-bank analytics.
