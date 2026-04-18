# Milestones

## v1.3 UX Unification & Polish (Shipped: 2026-04-18)

**Phases completed:** 11 phases (26-35, incl. decimal 28.1), 18 plans
**Timeline:** 2026-04-16 → 2026-04-18 (~2 days wall time)
**Requirements:** 27/27 met (28 defined — VIZ-03 formally cut, VIZ-07 added as replacement)
**Merge commit:** `05d2546` on `main` (PR #6 — v1.3 Gap Closure: P33-35)
**Tests:** 524 passing / 4 skipped (npm run test, 2026-04-18)
**Audit:** TECH_DEBT (no blocking gaps; verification-hygiene items only — see [v1.3-MILESTONE-AUDIT](milestones/v1.3-MILESTONE-AUDIT.md))

**Key accomplishments:**

- Unified two-level app shell for associates — same topbar + SectionSidebar as trainers with role-aware nav (Dashboard / Interviews / Curriculum) + cohort name header; PublicShell + AssociateNav deleted
- Accordion sign-in replacing tab UI (Mail + KeyRound icons, grid-row animation) with mandatory first-login password gate (trainer path closed in gap-closure Phase 33)
- Profile model + tabbed profile page + first-login detection migrated from `user_metadata` to `Profile.passwordSetAt` via lazy backfill
- Associate data-viz suite: ranked `SkillCardList` with trajectory language, `FocusHero` recommendation, `SkillRadar` Before/Now overlay backed by real `GapScore.prevWeightedScore` snapshots
- Associate curriculum schedule page with 5-band score coloring, hover tooltips, current-week highlight, and empty state
- Dark-mode coverage sweep: hardcoded hex eliminated across trainer + interview + review + PDF surfaces; semantic `--success-bg`/`--warning-bg`/`--danger-bg` tokens added
- Shell architecture overhaul: sidebar-primary nav for all roles, TopBar stripped to utility-only, Settings collapsible accordion, Profile modal overlay, landing-page minimal header, roster slug column removed, password change gated behind old-password or email OTP verification
- Chart design tokens + DESIGN.md Data Visualization section (5-series palette, axis/tooltip conventions, trajectory vocabulary) landed before any chart component was built — no dark-mode retrofit needed
- Gap-closure wave (Phases 33-35, PR #6) closed 5 audit gaps: trainer first-login gate, synthetic radar prior replaced with real snapshots, associate Settings accordion wired, `@deprecated settingsSidebarGroups` removed

**Archives:**

- [Roadmap](milestones/v1.3-ROADMAP.md)
- [Requirements](milestones/v1.3-REQUIREMENTS.md)
- [Audit](milestones/v1.3-MILESTONE-AUDIT.md)

---

## v1.2 Analytics & Auth Overhaul (Shipped: 2026-04-16)

**Phases completed:** 10 phases (16-25), 26 plans
**Timeline:** 2026-04-15 → 2026-04-16 (~16 hours wall time)
**Requirements:** 30/30 met (CACHE-01..02, BACKFILL-01..02, AUTH-05..10, INVITE-01..03, SHELL-01..04, ANALYTICS-01..06, ASELF-01..04, PDF-01..02, CLEANUP-01..03)
**Commits:** 205 (range `443d804..fbbbfb5`)
**Files changed:** 190 (+16,120 / -2,540)
**Tests:** 470 passing
**Codex review:** gpt-5.4, 2 P1 + 2 P2 findings, all fixed (`0fb1bde`)
**Mode:** Autonomous (`--unattended --discuss`)

**Key accomplishments:**

- In-memory question-bank manifest cache with ETag short-circuit + stampede dedupe (<400ms warm)
- Full Supabase auth: trainer email/password + associate magic link (PKCE, Resend delivery)
- Bulk invite onboarding: paste 1-50 emails → cohort assign → transactional magic links
- RLS defense-in-depth: 10 policies on 5 tables, `is_trainer()` SECURITY DEFINER (app_metadata)
- Two-level app shell: topbar + section-scoped sidebar + cohort switcher + mobile drawer
- Trainer analytics dashboard: KPI strip, sparklines, cohort trends, gap analysis, calibration
- Associate self-dashboard: personal gap trends, recommended next area, readiness progress bar
- PDF analytics export: cohort + per-associate reports with hand-rolled SVG sparklines
- PIN auth fully removed: schema columns dropped, env vars cleaned, CI grep-gate added
- Schema prep + email backfill UI enabling trainer-curated associate identity migration

**Archives:**

- [Roadmap](milestones/v1.2-ROADMAP.md)
- [Requirements](milestones/v1.2-REQUIREMENTS.md)
- [Autonomous Report](reports/AUTONOMOUS-REPORT-v1.2.md)

---

## v1.0 Readiness Loop MVP (Shipped: 2026-04-14)

**Phases completed:** 7 phases, 15 plans
**Timeline:** 2026-04-13 to 2026-04-14 (~26 hours)
**Requirements:** 22/22 met
**Audit:** TECH_DEBT (11 items tracked, no blockers)

**Key accomplishments:**

- Prisma 7 + Supabase foundation with singleton connection pooling and Docker build support
- Dual-write session persistence (file + Supabase) with sync-check verification endpoint
- Associate profiles with trainer-assigned slugs linking sessions to persistent identities
- Two-level recency-weighted gap scoring (skill + topic) with 0.8 decay and 3-session gate
- Readiness classification (ready/improving/not_ready) with configurable threshold
- Trainer dashboard with roster view, gap trend charts (recharts), and AI/trainer calibration
- Adaptive mock setup pre-populating technologies from associate gap history

**Archives:**

- [Roadmap](milestones/v1.0-ROADMAP.md)
- [Requirements](milestones/v1.0-REQUIREMENTS.md)
- [Audit](milestones/v1.0-MILESTONE-AUDIT.md)
- [Summary](reports/MILESTONE_SUMMARY-v1.0.md)

---

## v1.1 Cohort Readiness System (Shipped: 2026-04-14)

**Phases completed:** 8 phases (8–15), 22 plans
**Timeline:** 2026-04-14 → 2026-04-15 (~24 hours wall time)
**Requirements:** 14/14 met (AUTH-01..04, PIPE-01..02, COHORT-01..04, CURRIC-01..02, DESIGN-01..03)
**Commits:** 131 (range `5cddbbf..4238e36`)
**Files changed:** 224 (+20,733 / −3,972)
**PR:** `feat/v1.1-cohort-readiness-pr` → merged as `4238e36`
**Audit:** COMPLETE — no blockers; tech debt explicitly deferred to v1.2
**Deploy:** DEFERRED to v1.2 (user choice — code on main, prod not yet promoted)

**Key accomplishments:**

- Cohort model + full CRUD (`/api/cohorts`, `/trainer/cohorts` UI) with nullable FK on Associate (unassigned associates remain functional)
- Weekly curriculum schedule per cohort with canonical `skillSlug` exact match — setup wizard filters to taught-only skills
- Associate PIN auth (6-digit, bcryptjs-hashed) with dedicated `ASSOCIATE_SESSION_SECRET` + version-based cookie revocation (flag-gated off for ship)
- Authenticated automated-interview pipeline — split completion endpoints eliminate forged-linkage attack surface
- Readiness recompute marker (`Session.readinessRecomputeStatus`) + trainer-auth repair endpoint (`/api/admin/readiness-sweep`)
- Trainer dashboard cohort filter + opt-in readiness summary (default `/api/trainer` shape preserved for v1.0 consumers)
- Composite rate limiter for PIN verify (server-IP + fingerprint, `NLM_TRUSTED_PROXY` opt-in)
- Unified design system: `--nlm-*` legacy tokens deleted, all 35+ routes on DESIGN.md tokens, single `/signin` tabbed login, dark mode tokens, `globals.css` ~600 → 179 lines
- Codex review cycle: 9 findings, all P1/P2 addressed pre-merge (`21187f9`)

**Archives:**

- [Roadmap](milestones/v1.1-ROADMAP.md)
- [Requirements](milestones/v1.1-REQUIREMENTS.md)
- [Audit](milestones/v1.1-MILESTONE-AUDIT.md)
- [Summary](reports/MILESTONE_SUMMARY-v1.1.md)

---
