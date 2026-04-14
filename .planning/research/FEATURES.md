# Feature Research

**Domain:** Cohort management, associate authentication, curriculum scheduling, and notification systems for a technical training/assessment platform
**Project:** Next Level Mock — v1.1 Cohort Readiness System
**Researched:** 2026-04-14
**Confidence:** MEDIUM (training-data-based domain expertise — LMS/cohort management patterns are well-established; specific implementation choices draw on existing codebase analysis; WebSearch unavailable for external verification)

---

## Context: Baseline (v1.0 Already Shipped)

The following are not features to build — they are the foundation v1.1 extends:

- Trainer-led mock interviews with LLM scoring + trainer override
- AI-automated public interviews (no trainer, LangGraph agent)
- Persistent sessions in Supabase via Prisma (dual-write with file storage)
- Associate profiles (trainer-assigned slug, no login)
- Two-level gap scoring (skill + topic, 0.8 recency decay)
- Readiness classification (ready/improving/not_ready, configurable threshold)
- Trainer dashboard: roster view, per-associate detail, gap trend charts, calibration view
- Adaptive mock setup (gap-driven tech weight pre-population)
- PDF reports via @react-pdf/renderer, email via Resend

**The gap v1.1 must close:** Automated public interviews do not link to associate identity or feed the readiness pipeline. There is no cohort organization layer. Curriculum is not connected to question selection. Design is inconsistent across pages.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features trainers expect in a cohort-aware training platform. Missing these makes the platform feel like a prototype, not a professional tool.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Associate identity linkage for automated interviews** | Automated interview sessions exist in DB today but orphaned (no `associateId`). Trainers cannot see automated session history per associate without this. The gap pipeline never fires. | MEDIUM | Associate provides slug at interview start. The `/api/public/interview/start` and `/api/public/interview/complete` routes need to accept + propagate slug. `persistSessionToDb` already handles associate upsert via slug — this is wiring, not new infrastructure. |
| **Automated interviews trigger gap scoring + readiness update** | If a session saves but gap scores don't recompute, the readiness pipeline is broken. Trainers expect all interview modes to feed the same record. | LOW | The gap scoring and readiness update path already exists for trainer-led sessions (via `gapPersistence.ts` + `readinessService.ts`). Automated complete endpoint needs to call the same pipeline post-persist. |
| **Cohort as first-class entity** | "Show me everyone in the April cohort" is a natural trainer query. Without cohort grouping, roster becomes unusable as the associate list grows. | MEDIUM | New `Cohort` model in Prisma schema: `{ id, name, startDate, endDate, description, trainerId? }`. Associates belong to one cohort at a time (nullable `cohortId` FK on Associate). |
| **Cohort-filtered roster view** | Trainer dashboard must support viewing one cohort at a time. Global roster with 100 associates is noise. | MEDIUM | `/trainer` roster adds cohort selector (dropdown or tab). Query filters by `cohortId`. Existing roster table and readiness badges reuse without change. |
| **Curriculum schedule per cohort** | Trainers teach in weekly sequences. Question selection today uses arbitrary `selectedWeeks`. Curriculum ties weeks to skills explicitly so question selection becomes principled rather than manual. | MEDIUM | New `CurriculumWeek` model: `{ id, cohortId, weekNumber, skillName, topicTags[], startDate }`. This replaces the implicit week→skill mapping currently embedded in session `techMap`. |
| **Curriculum-driven question filtering** | When an associate takes a mock, questions should only come from skills that have been taught. Untaught topics should not appear. | MEDIUM | At interview setup, fetch current cohort's taught weeks (weeks where `startDate <= today`). Filter `selectedWeeks` to taught weeks only, or auto-populate from curriculum. The `techMap` already maps week → skill — this formalizes the data source. |
| **Design cohesion across all pages** | The platform makes readiness judgments with career consequences. Inconsistent visual treatment (fonts, colors, spacing) undermines credibility. Trainers notice. | LOW-MEDIUM | Apply DESIGN.md tokens (warm parchment, Clash Display headings, DM Sans body, burnt orange accent) to all pages that currently don't follow the system: public interview flow, auth page, associate profile. No new design decisions needed — execution work only. |

### Differentiators (Competitive Advantage)

Features that set this platform apart from generic LMS cohort tools (Canvas, TalentLMS, Google Classroom). Aligned with the core value: trajectory over snapshot.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Cohort-aggregate readiness view** | "3 of 8 associates in the April cohort are ready, 4 are improving, 1 is at risk" — no LMS gives this. Trainers can set cohort graduation targets with actual data behind them. | MEDIUM | Aggregate readiness counts from associate records filtered by cohort. Display as summary bar at top of cohort view. Data already exists per-associate — this is a GROUP BY query + display component. |
| **Curriculum-adaptive gap computation** | Gaps should only be computed against taught material. An associate who hasn't been taught SQL yet shouldn't be flagged as weak in SQL. `GapScore` records should scope to curriculum progress. | MEDIUM-HIGH | When computing gaps, filter assessed questions to skills present in taught curriculum weeks. This requires curriculum data to be present before the gap pipeline runs. Dependency: curriculum schedule must exist and be linked to the cohort. |
| **Readiness change email notifications to trainer** | Trainer does not watch the dashboard all day. When an associate crosses the readiness threshold (not_ready → improving, improving → ready, or ready → declining), the trainer needs to know without polling. | MEDIUM | Resend is already integrated for PDF report delivery. New hook: after `updateAssociateReadiness`, compare new status to previous stored status. If changed, send a structured Resend email to trainer. Trainer email address needs to be stored (Settings model). |
| **Per-cohort readiness trend over time** | Week-over-week cohort readiness improves or plateaus. Visualizing this trajectory gives the trainer — and eventually the client — a defensible record. | HIGH | Requires snapshotting cohort-aggregate readiness at regular intervals (daily or weekly). Simple approach: compute and store a `CohortSnapshot` record on each session save. Chart with recharts `LineChart` (already in project). |

### Anti-Features (Commonly Requested, Often Problematic)

| Anti-Feature | Why Requested | Why Problematic | Alternative |
|--------------|---------------|-----------------|-------------|
| **Associate self-registration (email/password signup)** | Associates want to check their own progress. Seems like a natural evolution. | Requires email verification flow, password reset, session management for a different user role, and Supabase Auth integration or custom JWT. Doubles auth surface area. The job-seeker segment is explicitly deferred. | Trainers share associate profile URLs directly (`/associate/[slug]` already exists as a server-rendered public profile). No login needed for associates in v1.1. |
| **Cohort invitation emails to associates** | Logical if associates were self-registering. | There are no associate accounts in v1.1. Associates take interviews via a public URL — no invitation needed. Sending emails to associates who don't have accounts creates confusion. | Trainer shares the interview URL verbally or via their own communication channels. |
| **Multi-trainer / role-based access within a cohort** | Real training orgs have co-trainers. Seems natural. | Requires trainer identity, permission model, audit trails. Current auth is single-password. Building this before the single-trainer loop is validated adds complexity before the product is proven. | Single-password auth is sufficient for v1.1. Add trainer identity when multi-trainer is a validated need. |
| **Automated interview scheduling / calendar integration** | Trainers want to schedule mock interviews in advance. | Calendar integration (Google Calendar, iCal) is a standalone project. Scheduling without calendar is just a date field with no notification delivery. Adds real complexity for unclear MVP value. | Trainers schedule verbally. The curriculum `startDate` per week gives enough structure to see what's been taught without a calendar. |
| **Cohort progress report PDFs** | Clients want deliverables. Seems high-value. | Requires a new PDF template, aggregate data pipeline, and design work. No client-facing portal exists. PDF goes nowhere meaningful in v1.1. | Cohort aggregate readiness view gives trainers the data to write their own client reports. Defer cohort PDF to client-portal milestone. |
| **Real-time dashboard updates (Supabase Realtime)** | "Live" feels modern. | The dashboard is read-heavy with ~20 associates. Polling on page load is sufficient. Realtime subscriptions add connection management complexity without meaningful UX improvement at this scale. Explicitly out of scope per PROJECT.md. | Next.js `revalidatePath` or simple page refresh covers the use case for v1.1. |
| **Granular notification preferences (per-event, per-channel)** | Users want to control what emails they get. | Notification preference UIs are surprisingly complex. Before any notifications are sent, the preference system adds feature surface with zero value. | Ship one notification type (readiness status change) with a global on/off toggle in Settings. Preferences can be added after the first notification type is validated as useful. |

---

## Feature Dependencies

```
[Associate slug at automated interview start]
    └──requires──> [Associate identity linkage for automated interviews]
                       └──requires──> [Automated interviews trigger gap + readiness pipeline]
                                          └──enhances──> [Readiness change notifications]

[Cohort model in DB]
    ├──requires──> [Cohort-filtered roster view]
    ├──requires──> [Cohort-aggregate readiness view]
    └──requires──> [Curriculum schedule per cohort]
                       └──requires──> [Curriculum-driven question filtering]
                       └──requires (future)──> [Curriculum-scoped gap computation]

[Trainer email in Settings]
    └──requires──> [Readiness change email notifications]

[Design cohesion]
    ──independent──> (all other features — no functional dependencies)
```

### Dependency Notes

- **Automated pipeline wiring requires nothing new:** The associate upsert and gap/readiness pipeline already exist. This is routing work, not infrastructure work. It is the lowest-effort highest-impact item in v1.1.

- **Cohort is a prerequisite for curriculum:** You cannot attach a curriculum schedule to a cohort that doesn't exist. Cohort model must be in the DB schema before curriculum weeks are modeled.

- **Curriculum-driven question filtering is useful before curriculum-scoped gap computation:** Filtering questions to taught skills is a setup-time concern. Scoping gap computation to taught skills is a post-interview concern. They can ship independently.

- **Readiness notifications require trainer email storage:** The Settings model currently stores only `readinessThreshold`. Trainer email is a one-line addition. This must precede any notification send logic.

- **Design cohesion has no functional dependencies** and can be executed in parallel with any other feature work. It is the safest work to batch with blocked phases.

---

## MVP Definition

### v1.1 Launch With

Minimum set to deliver the milestone goal: "a trusted readiness record that any evidence source can feed."

- [ ] **Automated interview → associate identity linkage** — Without this, automated sessions are orphaned data. The readiness pipeline is incomplete. Core correctness issue.
- [ ] **Automated interview → gap scoring + readiness update** — Sessions that don't feed gap scores are wasted data. One-line addition to the complete endpoint.
- [ ] **Cohort model + associate-cohort membership** — Foundation for all cohort views and curriculum. Required before curriculum weeks can exist.
- [ ] **Cohort-filtered roster view** — Trainers with 2+ cohorts cannot use the dashboard without this. Usability cliff.
- [ ] **Curriculum schedule per cohort** — Weeks linked to skill names, with start dates. Formalizes the implicit week→skill mapping already in the codebase.
- [ ] **Curriculum-driven question filtering at setup** — Auto-populates `selectedWeeks` from taught curriculum. Prevents untaught topics from appearing.
- [ ] **Cohort-aggregate readiness view** — Headline metric for the cohort (X ready / Y improving / Z not_ready). Requires cohort model + per-associate readiness (already computed).
- [ ] **Readiness change email notifications** — Trainer email in Settings + Resend hook after `updateAssociateReadiness`. One of the clearest productivity wins for solo trainers.
- [ ] **Design cohesion** — Apply DESIGN.md to public interview flow, auth page, associate profile. No new decisions, execution work only.

### Add After Validation (v1.x)

- [ ] **Curriculum-scoped gap computation** — Gaps filtered to taught curriculum. Higher fidelity but requires curriculum data to accumulate first. Build once real cohort sessions exist.
- [ ] **Per-cohort readiness trend chart** — Week-over-week cohort aggregate. Requires snapshot data over time. Needs 2-3 cohort cycles to be meaningful.
- [ ] **Notification preferences (on/off toggle per event type)** — Only valuable once the first notification type is sending and trainers express preference fatigue.

### Future Consideration (v2+)

- [ ] **Associate self-service portal** — Triggers when job-seeker segment is validated as a buyer.
- [ ] **Multi-trainer support** — Triggers when a second trainer joins the platform.
- [ ] **Cohort PDF report for clients** — Triggers when client-portal milestone begins.
- [ ] **Calendar/scheduling integration** — Triggers when trainers request it and the use case is validated.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Automated interview → associate identity linkage | HIGH | LOW | P1 |
| Automated interview → gap + readiness pipeline | HIGH | LOW | P1 |
| Cohort model + associate membership | HIGH | MEDIUM | P1 |
| Cohort-filtered roster view | HIGH | MEDIUM | P1 |
| Curriculum schedule per cohort | HIGH | MEDIUM | P1 |
| Curriculum-driven question filtering | HIGH | MEDIUM | P1 |
| Cohort-aggregate readiness view | HIGH | LOW | P1 |
| Readiness change email notifications | HIGH | LOW | P1 |
| Design cohesion | MEDIUM | MEDIUM | P1 |
| Curriculum-scoped gap computation | HIGH | MEDIUM | P2 |
| Per-cohort readiness trend chart | MEDIUM | HIGH | P2 |
| Notification preferences toggle | LOW | LOW | P3 |

**Priority key:**
- P1: Must have for v1.1 launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

Analysis based on training-data knowledge of common LMS and assessment platforms (Canvas, TalentLMS, CodeSignal, iMocha, Greenhouse). Confidence: MEDIUM (patterns are well-established; specific feature parity claims not verified against current product versions).

| Feature | Canvas / TalentLMS | CodeSignal / iMocha | Our Approach |
|---------|---------------------|---------------------|--------------|
| Cohort/group management | Yes — first-class "courses" and "groups" with enrollment management, start/end dates | Yes — candidate pools, assessment campaigns | Lightweight cohort model scoped to one training org. No enrollment workflows needed. |
| Curriculum scheduling | Yes — module sequencing with unlock gates, prerequisites, completion tracking | Limited — assessment campaigns have dates but no curriculum structure | Week-based curriculum tied to a cohort. Start dates determine what's "taught." No gates or prerequisites in v1.1. |
| Associate authentication | Yes — full email/password or SSO (Canvas uses institution SSO) | Yes — candidates have accounts for test-taking | Slug-based identity (no login) for v1.1. Associates never authenticate. The public interview URL is the access mechanism. |
| Progress notifications | Yes — automated email digests, assignment reminders, grade notifications | Yes — assessment completion emails, hiring pipeline updates | Single event type: readiness status change. Email to trainer only. Associates receive no notifications in v1.1. |
| Aggregate cohort view | Yes — class-level analytics, completion rates | Yes — cohort pass rates, skill distribution | Aggregate readiness breakdown (ready / improving / not_ready counts) + summary bar. More opinionated than generic LMS analytics. |
| Adaptive content selection | Limited — adaptive paths exist in premium tiers only | Some — difficulty scaling | Full gap-driven adaptive setup is a genuine differentiator. No LMS does recency-weighted skill gap → tech weight pre-population. |

**Where NLM differentiates:** The gap algorithm, readiness trajectory (not snapshot), and adaptive setup are not available in any competitor at this specificity. The trade-off is simplicity (no enrollment workflows, no gates) — appropriate for a solo-run training org.

---

## Sources

- Existing codebase analysis: `prisma/schema.prisma`, `src/lib/sessionPersistence.ts`, `src/lib/readinessService.ts`, `src/app/api/public/interview/complete/route.ts`, `src/app/api/public/interview/start/route.ts`
- Project context: `.planning/PROJECT.md` (v1.1 target features, constraints, out-of-scope list)
- Design system: `DESIGN.md` (editorial/utilitarian aesthetic, warm parchment + burnt orange)
- Training-data knowledge: LMS cohort management patterns (Canvas, TalentLMS, Google Classroom), assessment platform patterns (CodeSignal, iMocha), notification system design patterns — MEDIUM confidence (well-established domain; specific current-version feature parity not externally verified)
- WebSearch: unavailable during this research session — confidence on competitor claims is MEDIUM, not HIGH

---
*Feature research for: v1.1 Cohort Readiness System — Next Level Mock*
*Researched: 2026-04-14*
