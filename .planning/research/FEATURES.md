# Feature Landscape

**Domain:** Adaptive technical skills assessment platform with persistent gap tracking and trainer dashboard
**Project:** Next Level Mock — Readiness Loop MVP
**Researched:** 2026-04-13
**Confidence:** HIGH (primary source: approved design doc + live codebase + training knowledge of adaptive assessment patterns)

---

## Context: What Already Exists

The following are shipped and working. They are NOT features to build — they are the baseline this milestone extends:

- Trainer-led mock interview with real-time LLM scoring
- Public AI-automated interview (LangGraph / GPT-4o-mini)
- Trainer score override (review screen)
- Keyword matching + soft skills assessment per question
- Question bank from GitHub Markdown repos (weighted randomization)
- PDF report generation + email delivery via Resend
- Rate limiting via device fingerprinting
- Single-password auth + session cookie
- Voice input via Web Speech API

The active milestone adds: **session persistence, associate identity, gap tracking, readiness scoring, and a trainer dashboard.**

---

## Table Stakes

Features users (trainers) expect in a persistent assessment platform. Absence makes the product feel broken or incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Persistent session storage** | Without it, no history, no trends, no gap tracking — the whole milestone collapses | Med | Supabase + Prisma. Dual-write to file storage for backward compat during migration |
| **Associate profiles with stable identity** | Trainers need to look up "how is Alex doing" — requires a stable ID across sessions | Low | Trainer-assigned slug at mock start (no login). Stored on associate row in DB |
| **Session history list per associate** | Trainers must see past sessions to understand trajectory | Low | Query sessions by associate_id, ordered by created_at |
| **Per-session score detail** | Every question's AI score, trainer override, keywords hit/missed — trainers need to see what happened | Low | Already captured in existing QuestionAssessment type; needs DB persistence |
| **Gap identification at skill level** | "Alex is weak on SQL" — one level up from individual questions | Med | Aggregate scores grouped by technology/skill. Derived from session data |
| **Readiness status per associate** | Trainers need a quick "ready / not ready / needs work" signal for roster scan | Med | Threshold computation on recency-weighted scores: 75% avg / 3 sessions / non-negative trend |
| **Trainer dashboard roster view** | Without a central view, trainer must navigate associate-by-associate — unusable at 10+ associates | Med | New `/trainer` route. Table rows: name, last session, readiness badge, gap summary |
| **Per-associate drill-down view** | Roster gives overview; trainers need to go deeper when someone is flagged | Med | Session list + gap chart + recommended next area |
| **Adaptive mock setup (gap-driven pre-selection)** | If the system stores gaps but ignores them at setup time, it's just a database — not adaptive | Med | Setup wizard reads gap profile, pre-selects tech weights. Trainer can override |

---

## Differentiators

Features that set this platform apart from screening tools (CodeSignal, iMocha) and LMS platforms (TalentLMS). Not expected by users, but create competitive moat and strengthen the core value proposition.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Two-level gap tracking (skill → topic)** | "Weak on SQL" is not actionable. "Weak on SQL → query optimization" is. Topic-level gaps enable precise next-practice recommendations | Med-High | Topics map to keyword categories in parsed Markdown questions. Schema: `{ associateId, skillId, topicTag, avgScore, sessionCount, lastSeenAt }` |
| **Recency-weighted gap algorithm (0.8 decay)** | Recent improvement matters more than old failures. Simple decay prevents stale gaps from dominating recommendations | Low-Med | v1: `weightedScore = sum(score * 0.8^sessionAge)`. Ordered by lowest weighted score = next recommended area. Autoresearch optimizes post-MVP |
| **AI vs. trainer score calibration view** | No other tool shows the trainer where AI diverges from human judgment. This is the data that makes autoresearch possible and gives trainers trust in AI scoring | High | Per-question diff view: AI score vs final (trainer-overridden) score. Filter by question type, skill, topic. Visible delta and trend |
| **Next recommended practice area** | Tells the trainer what to run next for each associate — removes guesswork from scheduling | Low-Med | Derived from gap algorithm output: lowest weighted score topic = recommendation. Displayed on associate detail and surfaced in setup wizard |
| **Trajectory signal, not snapshot** | Readiness is a trend, not a number. "Improving toward threshold" is different from "at threshold but declining." Current QC audits only give snapshots | Med | Trend direction computed from last 3 sessions: positive / flat / declining. Shown alongside readiness badge |
| **Configurable readiness threshold** | Different clients or roles may have different passing bars. The default (75%/3/non-negative) must be overridable per trainer | Low | Settings screen or per-dashboard config. Stored on trainer settings row |

---

## Anti-Features

Things to deliberately NOT build in this milestone. Including them wastes time, introduces scope risk, or contradicts validated decisions.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Associate login / self-service portal** | Adds auth complexity (email/password, session management, email verification) that delays the core loop. Associates don't need to log in for MVP — trainers run the platform | Trainer assigns slug at mock start. Associates never authenticate. Ship associate auth in a future milestone when job seeker segment is validated |
| **Multi-tenancy / role-based access** | Requires tenant isolation, per-org data boundaries, permission matrices. None of this is needed when one training org uses the system | Keep single-password auth. Design schema with `org_id` column (nullable, always null for now) so the migration path exists without building it |
| **Client-facing talent pipeline portal** | Validated as out of scope. Three-sided marketplace requires supply AND demand simultaneously. Solo developer cannot build three products at once | Add `placementOutcome` field to associate schema for future correlation. Defer portal entirely |
| **Multi-format assessment (Feynman, code review, architecture diagrams)** | Adds prompt engineering per format, new scoring rubrics, untested UI patterns. Interview format is trainer-validated; others are not | Prove the core loop with interview format first. Document format extension points in schema so adding formats later doesn't require a rewrite |
| **Billing / subscription management** | No revenue model in MVP. Building payments before proving the loop is premature optimization | No payment infra. Track usage in analytics so you know what to price when the time comes |
| **Email/notification system for associates** | Associates can't log in, so what would you email them? Adds complexity for zero current-user value | Trainers receive session reports via existing Resend integration. Do not add associate notifications |
| **Historical data migration** | Existing `data/interview-history.json` sessions lack associate IDs (no persistent identity) — migrating them produces incomplete, unreliable gap data | Capture sessions forward only. Old file-based data stays as-is until TTL cleanup |
| **Sorting, filtering, pagination on roster (v1)** | Premature for a training org with 10-20 associates. Adds UI complexity before you know what trainers actually need to filter on | Ship a simple sorted table. Add filters after trainers use the dashboard and request them |
| **Automated reporting / scheduled emails** | No evidence trainers want this. Adds cron job complexity and potential spam for zero validated benefit | Trainers can pull PDF reports on demand (existing flow). Do not automate delivery |

---

## Feature Dependencies

```
PERSIST-01 (session storage in Supabase)
  └── PERSIST-02 (associate profiles with stable identity)
        ├── GAP-01 (two-level gap tracking)
        │     ├── GAP-02 (adaptive mock setup — reads gap profile)
        │     ├── READY-02 (next recommended practice area)
        │     └── DASH-02 (per-associate detail with gap trend charts)
        ├── READY-01 (computed readiness signal — requires ≥3 sessions)
        └── DASH-01 (trainer dashboard roster view — requires readiness + session history)
              └── DASH-03 (AI vs trainer calibration view — requires sessions with both llmScore and finalScore stored)
```

**Critical chain:** PERSIST-01 → PERSIST-02 → everything else. Nothing in this milestone works until sessions are stored with associate identity.

**Parallelizable after persistence:**
- DASH-01 roster view can be built with stub data while gap algorithm is being implemented
- READY-01 readiness computation can be developed against seed data before real sessions exist

**DASH-03 dependency note:** Calibration view requires sessions where trainers actually overrode AI scores. Initial dashboard may show empty state for calibration until enough overrides accumulate. Design must handle zero-data state gracefully.

---

## MVP Recommendation

**Phase 1 — Foundation (persistence + identity):**
1. Supabase schema + Prisma setup
2. Dual-write: existing scoring pipeline writes to file AND Supabase
3. Associate profile creation at mock start (trainer assigns slug)
4. Session storage with full QuestionAssessment data

This phase is infrastructure. No new UI. Backward compatible. Unblock everything.

**Phase 2 — Gap Engine:**
1. Gap tracking computation (skill level first, then topic level)
2. Recency-weighted scoring algorithm (0.8 decay v1)
3. Readiness signal computation (75%/3/non-negative trend)
4. Next recommended practice area derivation
5. Adaptive mock setup wizard (pre-select from gap profile, trainer-overridable)

**Phase 3 — Trainer Dashboard:**
1. Roster view (`/trainer`) — table with readiness badges and last-session summary
2. Per-associate detail — session history list + gap summary
3. Gap trend charts (skill selector, time axis)
4. AI vs trainer calibration view (per-question diff)

**Defer:**
- Topic-level gaps can ship in Phase 2 but topic tag extraction from questions needs validation — ensure question Markdown has consistent category tags before building this
- Configurable readiness threshold: ship as hardcoded 75%/3/non-negative in Phase 2, expose settings UI in Phase 3
- Chart library selection (gap trend charts) needs a decision: recharts (already common in Next.js apps, minimal bundle) vs Chart.js vs D3. Recharts recommended for lowest friction with React — but verify bundle size before committing

---

## Complexity Notes

**Session storage (PERSIST-01):** Medium. The schema design is straightforward, but dual-write without breaking the existing scoring pipeline requires careful integration. The LangGraph scoring flow is async (pending → processing → ready → validated) — writes must handle partial state correctly.

**Gap algorithm (GAP-01):** Medium. The math is simple (weighted average with 0.8 decay). The complexity is in topic tag extraction from question Markdown and ensuring consistent taxonomy across question banks.

**Trainer dashboard charts (DASH-02):** Medium-High. Charts require a time-series data model, a charting library, and responsive layout. The chart itself is not hard; the data aggregation query is.

**AI vs trainer calibration view (DASH-03):** High relative to other features. Requires storing both `llmScore` and `finalScore` per question, computing divergence, presenting it meaningfully. Defer to Phase 3 Week 2.

**Readiness signal (READY-01):** Low-Medium. Simple threshold check once session data exists. The nuance is the trend direction computation (requires at least 3 sessions, degrades gracefully with fewer).

---

## Sources

- Approved design document: `~/.gstack/projects/JesterCharles-mock-interview-assist/jestercharles-main-design-20260413-115201.md`
- Active requirements: `.planning/PROJECT.md`
- Existing type definitions: `src/lib/types.ts`
- Existing scoring implementation: `src/lib/langchain.ts`
- Training knowledge: adaptive assessment platform patterns (spaced repetition, recency weighting, LMS roster views) — HIGH confidence for established patterns, MEDIUM confidence for specific algorithm parameters (0.8 decay factor is a reasonable v1 starting point, autoresearch validates post-MVP)
