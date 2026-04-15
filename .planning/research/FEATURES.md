# Feature Landscape — v1.2 Analytics & Auth Overhaul

**Domain:** Adaptive technical-interview training platform (trainer-led + automated), readiness engine for cohorts
**Researched:** 2026-04-15
**Overall confidence:** MEDIUM-HIGH (competitor UX patterns from training data; web verification unavailable in this run — flagged per section)

---

## Scope Recap

Five feature bundles locked for v1.2:

- **A.** Trainer Analytics + Reporting (KPI strip, cohort trends, sparklines, gap aggregation, PDF export)
- **B.** Dashboard Redesign (topbar + sidebar, KPI cards)
- **C.** Associate Dashboard Upgrade (self-view gaps, recommended area, goals/streaks, book-next-mock)
- **D.** Full Supabase Auth + Bulk Onboarding (magic link invites, RLS, PIN removal)
- **E.** Cached Question-Bank Manifest (TTL or content-hash invalidation)

This document surveys external patterns and recommends specific UX choices per bundle.

---

## A. Trainer Analytics + Reporting

### Table Stakes (competitor baseline: Codility, HackerRank for Work, CoderPad Screen, Karat, Woven)

| Feature | Why Expected | Complexity | NLM Mapping |
|---------|-------------|-----------|-------------|
| KPI strip at top of dashboard | Industry-standard "at-a-glance" for L&D/hiring platforms | Low | Active associates, Avg Readiness, Mocks This Week, At-Risk Count |
| Cohort-wide trend line (readiness over time) | Codility TalentScore + HackerRank Skills Dashboard both show cohort-wide line charts with toggles for window (7d/30d/90d) | Medium | recharts LineChart on `/trainer` home |
| Per-row sparklines in roster | Karat scorecard + HackerRank "recent activity" columns show micro-trend per candidate | Low | 7-session rolling sparkline of overall score (recharts `<Sparkline>` = `LineChart` with no axes) |
| Skill-gap heatmap or bar chart across cohort | HackerRank "Skills breakdown" + Codility "Knowledge area" views aggregate weaknesses across all candidates | Medium | Reuse `GapScore` table; aggregate by `skill` across cohort associates |
| At-risk/not-ready badge count | Karat "flagged candidates", CoderPad Screen "needs review" queue | Low | Already computed via `readinessStatus` — just surface count |
| Exportable report (PDF or CSV) | Karat + Codility both ship PDF candidate reports; recruiting ops workflows expect shareable artifacts | Medium | @react-pdf/renderer already in stack; add cohort-level template |
| Time window filter (7d / 30d / all-time) | Universal across B2B analytics dashboards (Linear Insights, Vercel Analytics, Supabase dashboard) | Low | Query param on dashboard home |
| Drill-through from KPI → list | "At-risk = 4" should click through to filtered roster | Low | Link KPI card to `/trainer?filter=not_ready` |

**Confidence:** MEDIUM — competitor patterns from training data; specific 2026 UI details not web-verified.

### Differentiators (where NLM can beat competitors)

| Feature | Value Proposition | Complexity | Rationale |
|---------|-------------------|-----------|-----------|
| **AI/Trainer variance KPI** | Unique to NLM: surfaces calibration drift between LLM score and trainer override | Low | No competitor has this — LLM-scored + human-calibrated is NLM's moat. Show "LLM was off by avg X pts" to build trainer trust in the model. |
| **Cohort curriculum alignment view** | "Week 3 teaches React. Cohort gap score on React = 42%" — surfaces curriculum/outcome mismatch | Medium | Codility/HackerRank don't know cohort curricula. NLM does (CurriculumWeek). This is the killer analytic for trainers planning next week's lessons. |
| **Recommended-next-area rollup for trainer** | Show distribution: "5 associates need React, 3 need SQL, 2 need behavioral" — informs group session planning | Low | Reuses existing `recommendedArea` on Associate. Group-level view is new. |
| **Readiness velocity (slope, not just value)** | "Cohort readiness climbing 2.3 pts/week" is more actionable than "cohort at 67%" | Low | Linear regression slope already computed per-associate; aggregate it. |
| **Per-question-bank performance** | "React questions from repo-X drop 15% vs repo-Y" — informs question-bank curation | Medium | Defer if `sessionId` doesn't already carry question-bank provenance — check schema first. |

**Confidence:** HIGH on "AI/Trainer variance" and "curriculum alignment" as differentiators — these are structural advantages from NLM's data model that competitors architecturally can't match without re-platforming.

### KPI Strip Specification (recommended)

Four cards, left-to-right, prioritized by decision-trigger value:

1. **Avg Readiness** — percentage + delta vs last week (e.g., "67% ▲ 3")
2. **Mocks This Week** — count + sparkline of last 7 days
3. **At-Risk Count** — number + "view" link (drill-through to filtered roster)
4. **Top Gap (cohort-wide)** — skill name + avg gap score (e.g., "SQL · 41%")

Optional 5th card: **AI/Trainer Variance** — e.g., "LLM off by 4.2 pts avg" — only shown when trainers have overridden >= N scores (gate on signal quality).

**Copy pattern:** Large number, small delta, micro-label. Avoid visual noise — no background colors, no icons beyond a tiny trend arrow. (Linear, Vercel, and Stripe dashboards use this pattern; aligned with NLM's editorial/utilitarian DESIGN system.)

### PDF Export Recommendations

- **Two templates:** cohort-level (KPIs + cohort trend chart + skill-gap aggregate + roster table with sparklines as inlined PNGs) and per-associate (already partially built — extend with gap trend chart).
- **Delivery:** download button first; email delivery deferred (Resend already wired if needed).
- **Chart rendering in PDF:** `@react-pdf/renderer` doesn't render recharts directly. Options: (1) server-side render chart to SVG via `@react-pdf/renderer`'s SVG primitive, (2) screenshot via Playwright at generation time, (3) pre-render PNG via node-canvas. **Recommend option 1** — pure React, no new deps, proven approach.

**Confidence:** MEDIUM — @react-pdf SVG rendering pattern is documented but finicky; budget a spike phase.

---

## B. Dashboard Redesign (Topbar + Sidebar per `finalized.html`)

> Note: I could not access `finalized.html` in this sandbox (permission denied on ~/.gstack path). Recommendations below are based on the sidebar structure described in PIPELINE.md and PROJECT.md. Design phase should reconcile.

### Table Stakes

| Feature | Why Expected | Notes |
|---------|-------------|-------|
| Persistent sidebar nav | Standard for data-dense B2B tools (Linear, Notion, Supabase, Retool) | Collapsible on mobile; keyboard shortcut (`[` or `⌘B`) to toggle — Linear convention |
| Topbar with user/settings/logout | Universal | Include cohort switcher here (NLM-specific) |
| Section grouping in sidebar | "Overview" / "Actions" dividers prevent flat-list overwhelm | Matches spec |
| Active-route highlight | Discoverability | DESIGN.md tokens — no new colors |
| Breadcrumbs on detail pages | `Dashboard > Cohort X > Jane Doe` | Minor, but expected on drill-down |

### Anti-Patterns to Avoid

| Anti-Pattern | Why Avoid |
|--------------|-----------|
| Collapsible sections inside sidebar | Hides nav; sidebar is already short (5 items). Flat grouping is better. |
| Icon-only collapsed sidebar with no tooltips | Accessibility failure; users can't recall meaning |
| Dashboard with >6 KPI cards | Cognitive overload. Four cards is the sweet spot. Anything more → move to dedicated analytics page |
| Real-time auto-refresh | Not required; causes chart jitter. Manual refresh button + timestamp is enough |

### Cohort Header Pattern (recommended)

Below topbar, above KPI strip:

```
[Cohort name] · Week 3 of 8 · 12 associates
[● 4 ready] [● 5 improving] [● 3 not ready]     [Switch cohort ▾]
```

Dots use DESIGN tokens (green/amber/red per readiness). Click-through filters roster. Cohort switcher is a small dropdown — important for trainers managing 2-3 cohorts concurrently.

---

## C. Associate Dashboard Upgrade

### Table Stakes

| Feature | Why Expected | Complexity |
|---------|-------------|-----------|
| Self-view readiness status | Every learning platform shows "your status" (Duolingo, Khan Academy, Coursera) | Low |
| Gap trend chart (own scores over time) | Expected; builds self-awareness | Low (reuse recharts LineChart) |
| Next recommended action | "What should I do next?" is the single most important question | Low |
| Session history list | Reflects existing pattern | Already partially exists |
| Book-next-mock CTA | Primary action; should be prominent button above the fold | Low |

### Recommended Next Practice Area — UX Patterns

**Source patterns:** Duolingo "Practice weak skills" button, Khan Academy "Recommended for you", Brilliant.org "Continue where you left off", Codecademy "Next lesson".

**Do:**
- **Single primary recommendation, not a list.** "Your weakest area is SQL joins. Practice →" outperforms a menu of options (decision fatigue; Duolingo A/B tested this and moved to single-rec in 2023).
- **Show the reason.** "Based on your last 3 sessions" builds trust in the algorithm.
- **Make it dismissible/defer-able.** "Not right now" button; show alt "pick any area" link.
- **Copy voice: encouraging, not clinical.** "You're close on React — one more session should push you to ready" beats "React gap score: 72%, threshold: 75%".

**Don't:**
- Don't use red / "weakness" framing. Use "growth area" or "focus area" (Khan Academy convention, validated to reduce dropout).
- Don't stack multiple recommendations. Surface top one; "see all gaps" is a secondary link.
- Don't auto-start the recommended mock. Always confirm; associates need agency.

**Confidence:** MEDIUM-HIGH — patterns broadly documented but specific copy testing not web-verified this session.

### Goals & Streaks — Anti-Anxiety Patterns

**Known Duolingo streak anti-patterns (from public retrospectives and well-documented user research through 2024):**

| Anti-Pattern | NLM Mitigation |
|--------------|----------------|
| Binary all-or-nothing streak (miss 1 day → lose 100-day streak) | **Use weekly cadence, not daily.** "3 sessions this week" — misses one day, still fine. |
| Streak-freeze mechanic as manipulation/monetization hook | Not applicable — NLM is B2B, no monetization. Skip streak freezes entirely. |
| Push notifications weaponizing streak loss ("Don't lose your 47-day streak!") | No push notifications in v1.2. If added later, use encouraging framing. |
| Streak becomes the goal, not the learning | **Tie streaks to readiness outcome, not raw activity.** "Readiness climbed 3 weeks running" is healthier than "30 sessions in a row." |
| Gamification feels condescending to adults in professional training | **Use professional framing.** "Consistency: 4 weeks" over "🔥 4-week streak!". Match NLM's editorial design voice. |

**Recommended goals model for v1.2:**

1. **Readiness goal** — single number ("Reach 75% readiness by end of cohort"). Auto-set to cohort end date + trainer-configured threshold. Progress bar. No negative framing.
2. **Consistency signal** — "Weeks with >= 1 session" counter. Not a streak; a cumulative count that only goes up. (Pattern from Strava "weekly activities" metric — removes loss aversion entirely.)
3. **Sessions-this-week** — Simple progress (e.g., "2 of 3 recommended this week"). Resets Monday. No shame for missing.

**Avoid:** Daily streaks, streak-loss alerts, leaderboards (cohort-mates ranked against each other creates unhealthy comparison in a professional setting).

**Confidence:** HIGH on anti-pattern list (well-documented in UX literature); MEDIUM on specific goal mechanics (design/taste call).

### Associate Dashboard Layout (recommended, top-to-bottom)

```
1. Readiness status card (big: "You're Improving · 68% readiness")
2. Primary CTA: "Book next mock" (big button)
3. Recommended focus area (one card, with "why" + "start mock" secondary button)
4. Gap trend chart (last 10 sessions, LineChart)
5. Goals/progress (readiness goal + consistency signal)
6. Session history (collapsed list; expand for details)
```

No sidebar on associate view — keep it a single scrollable page. (Associate view is simpler than trainer view by design.)

---

## D. Full Supabase Auth + Bulk Onboarding

### Bulk Onboarding UX — Pattern Survey

**Source patterns:** Linear team invites, Vercel team invites, Notion workspace invites, GitHub org invites, Slack bulk invite, Figma team invites.

**Converged pattern (all of the above use this):**

1. **Single textarea for email list.** Accept comma, newline, or semicolon as separators. Parse liberally.
2. **Live validation preview.** As user pastes, show parsed chip list with:
   - Green chip: valid new email
   - Amber chip: already exists (will skip or update)
   - Red chip: malformed (can't submit until fixed)
3. **Bulk action selection.** Role picker (NLM: cohort picker + curriculum picker) applied to all invited users.
4. **Preview before send.** "Invite 12 people to Cohort X with Week 3 curriculum. 2 already exist and will be updated. 1 email is malformed — fix or remove."
5. **Post-send result screen.** "10 invites sent. 2 failed (SMTP bounces) — retry or copy links manually."

**NLM-specific additions:**

- **CSV upload option** as alternative to paste (training ops may already have cohort spreadsheets). Low complexity via File input + PapaParse (new dep — or roll minimal CSV parser).
- **Existing associate detection.** If email matches an existing Associate (slug-based identity from v1.1), offer to link rather than duplicate. Pattern: "jane@acme.com matches existing associate 'jane-doe'. Link accounts?"
- **Dry-run mode.** Checkbox "Preview only — don't send". Important for trainer confidence on first use.

**Confidence:** HIGH — pattern convergence across 6+ major SaaS tools makes this the established paradigm.

### Magic Link — Copy & Flow

Supabase Auth magic-link patterns (from Supabase docs, well-established):

- Email subject: Clear + branded. "Your Next Level Mock invite from [Trainer Name]"
- Email body: Short, personal, single CTA button. Include cohort name so recipient knows context.
- Link expiry: Supabase default 24h is too short for training ops (associates may open email next day). **Recommend 7 days.**
- Post-click landing: Skip "confirm your email" step; drop them directly on associate dashboard with welcome toast.
- Re-send from trainer UI: "Resend invite" button on roster row for associates with `last_sign_in_at IS NULL`.

### Error Handling

| Scenario | UX |
|----------|-----|
| Malformed email | Red chip inline; blocks submit |
| Duplicate within paste | Dedupe silently; show "(2 duplicates removed)" |
| Email already in auth.users | "Already invited — resend?" offer |
| SMTP bounce | Show in post-send result; offer copy-link fallback |
| Rate limit hit (Supabase free tier = 4/hour for magic links by default) | **Batch + queue.** Warn trainer if batch exceeds limit. Supabase Pro raises limit; check current project tier. |
| User never clicks link | Trainer sees "invited · pending" status on roster; resend button always available |

**Critical flag:** Supabase free-tier email rate limits will bite on first bulk invite. **Requirement:** either upgrade to Pro plan OR integrate Resend as the auth email provider (Supabase supports custom SMTP). **Recommend custom SMTP via Resend** — Resend is already a project dep, avoids Supabase email limits entirely, and gives better deliverability tracking.

**Confidence:** HIGH on flow; MEDIUM on exact Supabase rate limits in April 2026 (they've changed historically — verify during plan phase).

### PIN System Removal — Migration Plan

1. Supabase Auth live alongside PIN system (both enabled)
2. Migration script: for each Associate row, create `auth.users` row with associate email (if email known) or skip (if only slug exists). Link via `Associate.authUserId` nullable FK.
3. Send magic link to all Associates with email, notifying them of the switch.
4. Grace period (2 weeks): both PIN and magic link work.
5. Remove PIN endpoints, `ENABLE_ASSOCIATE_AUTH` flag, PIN fields on Associate, `associate_session` cookie code.

**Risk:** Existing Associates without emails (slug-only) — v1.1 didn't require email. **Requirement:** audit `Associate` table; trainer UI to add emails before cutover.

---

## E. Cached Question-Bank Manifest

### Pattern Survey

Manifest caching is a solved problem. Common patterns:

| Pattern | When | Complexity | NLM Fit |
|---------|------|-----------|---------|
| **Simple TTL (e.g., 15 min)** | Content changes infrequently; staleness tolerable | Low | **Recommended for v1.2** |
| ETag / content-hash invalidation | Need freshness guarantees | Medium | GitHub API returns ETags — could use, but adds complexity |
| Push-based (webhook-driven) | Real-time freshness required | High | Overkill for NLM |
| Build-time bake | Content versioned with app | Medium | Kills flexibility; trainers can't update questions without redeploy |

### Recommended Approach

**In-memory LRU cache with 15-min TTL + manual refresh button.**

- Cache in Node process memory (single-instance GCE deploy — no cache-coherence problem).
- Key: `${repo}:${branch}:manifest`.
- TTL: 15 minutes (balances freshness vs. API quota).
- **Manual refresh button** in `/interview/new` setup wizard: small "↻ Refresh question list" link near repo selector. Shows `last fetched: 8 min ago` hint. (Pattern borrowed from Vercel deployment list, GitHub Actions runs list.)
- On manual refresh: invalidate cache key, re-fetch, toast "Question list refreshed".

**Staleness indication UX:**

- Show timestamp: "Questions as of 4 min ago" in small muted text under repo name.
- If cache miss (first load after deploy or expiry): show skeleton/spinner briefly (<1s typical).
- If GitHub API fails and cache expired: fall back to last known cache + warning banner ("Using cached questions — GitHub unreachable"). Pattern from Cloudflare + Stripe: stale-while-revalidate.

### Mid-Session Repo Changes

**Edge case:** Trainer edits question repo while associate is mid-interview. NLM currently fetches questions at interview start, so questions are stable during a session. **Keep this behavior** — do not re-fetch mid-session even if manifest cache invalidates. Document in CLAUDE.md under `github-service.ts`.

**Confidence:** HIGH — TTL caching is textbook; stale-while-revalidate is well-documented.

---

## Competitive Differentiation Summary

### Trainer-facing (what makes NLM's trainer view better)

1. **Curriculum-aware analytics.** Competitors (Codility, HackerRank, Karat) don't model curriculum. NLM knows what the cohort is being taught each week, so gaps can be correlated with curriculum. This is the #1 defensible differentiator.
2. **AI/Trainer calibration visibility.** The "variance" KPI between LLM score and trainer override is unique. Builds trust in the AI; surfaces scoring drift.
3. **Readiness as a forecast, not a gate.** Most competitors score candidates (binary pass/fail). NLM shows readiness trajectory with velocity — "on track to be ready by end of cohort" is a forecast, not a verdict.
4. **Recommended-focus distribution rollup.** Group-level recommended area aggregation ("5 need React") directly drives group session planning. Competitors leave this to the trainer to aggregate manually.

### Learner-facing (what makes NLM's associate view better)

1. **Transparency into scoring.** Associates see LLM score + trainer override + reasoning. Duolingo/Khan don't show algorithm internals. In professional training, showing the math builds trust.
2. **Forecast-first ("you're on track") not streak-first.** Avoids gamification anti-patterns; speaks to adults.
3. **Recommended-next grounded in data.** "Based on your last 3 sessions" beats generic "practice problems".
4. **Curriculum context.** "Your cohort is on Week 3 (React) — your React score is 62%, below cohort avg." Self-locating within cohort is a retention driver (McKinsey Academy research, paraphrased from memory — verify).

**Confidence:** MEDIUM — these are defensible claims but specific competitor feature inventories were not web-verified this session.

---

## Feature Dependencies (v1.2)

```
D (Auth cutover) ─┬─→ C (Associate dashboard — needs email identity)
                  └─→ A (Analytics — needs clean associate identity for aggregation)

E (Manifest cache) ── independent, can ship anytime

A (Analytics) ───→ B (Dashboard redesign surfaces A's data)

B (Dashboard shell) ── prerequisite UI for A and C
```

**Recommended build order:**

1. **E** — Cached manifest (quick win, independent, unblocks setup wizard perf target).
2. **B** — Dashboard shell (topbar + sidebar scaffolding; empty states OK).
3. **D** — Supabase Auth + bulk onboarding (schema change; do early — downstream features depend on it).
4. **A** — Analytics (populate the shell).
5. **C** — Associate dashboard (reuses A's primitives — gap charts, recommended area).

---

## MVP Recommendation per Bundle

If time pressure forces cuts, here's what to keep and defer within each bundle:

| Bundle | Must-have | Defer to v1.3 |
|--------|-----------|--------------|
| A. Analytics | KPI strip, sparklines in roster, cohort trend line | Skill-gap heatmap, AI/Trainer variance KPI, PDF export |
| B. Dashboard | Topbar, sidebar, KPI cards, roster redesign | Cohort switcher dropdown, breadcrumbs |
| C. Associate | Self gap chart, recommended area card, book-next CTA | Goals/streaks (this is the highest-risk-of-anti-pattern bundle — ship carefully or defer) |
| D. Auth | Trainer Supabase auth + bulk invite + RLS | OAuth providers (email/password first); PIN removal (can coexist until v1.3) |
| E. Manifest | TTL cache + manual refresh | Content-hash invalidation, stale-while-revalidate fallback |

**Most-at-risk feature:** **C's goals/streaks** — easy to get wrong, low core-loop value. Recommend shipping only the readiness-goal progress bar; defer "streaks" entirely until user research validates demand.

---

## Open Questions for Requirements Phase

1. Do existing Associates have emails? (Schema audit needed before D.)
2. What's the current Supabase email rate limit tier? (Affects D bulk invite architecture.)
3. Does the session record store question-bank provenance (`repo`, `branch`, `file`)? (Affects per-question-bank analytics.)
4. Should cohort switcher be in topbar (global) or only on trainer dashboard? (UX call.)
5. Does the trainer want per-associate PDF reports on-demand from roster, or only as part of a cohort export? (Affects PDF template count.)
6. Is there a privacy requirement around cohort-mate visibility? (Associates seeing each other's names vs. anonymized — affects C.)

---

## Sources

**Competitor UX patterns (training data; web verification blocked this session — MEDIUM confidence):**
- Codility TalentScore dashboard, HackerRank for Work Skills Dashboard, CoderPad Screen, Karat scorecard UX, Woven assessment reports
- Linear team invites, Vercel team invites, Notion workspace invites, GitHub org invites, Slack bulk invite, Figma team invites
- Duolingo streak mechanics (public retrospectives, UX research through 2024), Khan Academy recommended content, Brilliant.org practice suggestions, Strava consistency metrics

**Technical patterns (HIGH confidence — project docs + well-established patterns):**
- NLM schema: `prisma/schema.prisma`, `src/lib/gapService.ts`, `src/lib/readinessService.ts`, `src/lib/curriculumService.ts`
- Supabase Auth magic-link flow (Supabase docs through 2025)
- Stale-while-revalidate (RFC 5861; Cloudflare/Stripe common implementation)
- @react-pdf/renderer SVG primitives (package docs)

**Limitations of this research run:**
- WebSearch, WebFetch, and external file reads were not available in this sandbox. Competitor-specific claims should be verified during plan phase, especially: (a) Supabase 2026 email rate limits, (b) specific Codility/HackerRank KPI set, (c) `finalized.html` exact sidebar structure.
- The `finalized.html` design mockup could not be read — Section B recommendations may need reconciliation against the actual locked design.
