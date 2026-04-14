# PIPELINE-PLAN-AUTOPLAN — v1.1 Cohort Readiness System

**Date:** 2026-04-14
**Scope:** Phases 8-14 (17 plans across 7 phases)
**Reviewer:** autoplan (4 lenses: CEO / eng / design / DX)
**Overall confidence:** HIGH (8.5/10) — plans are unusually detailed and self-consistent. Ship as-is with the few flags below.

---

## Auto-decisions (resolved via 6 decision principles)

### CEO lens (scope, user value, 10-star ops)
- **AD-01** Scope is locked; no feature expansion requested. Plans correctly defer clone-curriculum, notifications, magic-link auth, cohort snapshots to v1.2. ACCEPT.
- **AD-02** PIN UI styling utilitarian in Phase 9, polish in Phase 14 — correct sequencing (ship function before finish). ACCEPT.
- **AD-03** "Readiness Signal Pattern" (typography not badges) applied on `/associate/[slug]` in 14-01 is the highest-leverage 10-star touch in-scope. KEEP.
- **AD-04** Phase 12 omitting per-cohort trend charts is correct for 3-4 week window (COHORT-FUTURE-02). ACCEPT.

### Engineering lens (architecture, risk, testability)
- **AD-05** Dual-write preserved; additive-only migrations (Phase 8). Low risk. ACCEPT.
- **AD-06** `onDelete: SetNull` on Associate.cohortId + Session.cohortId, CASCADE on CurriculumWeek.cohortId — correct semantics. ACCEPT.
- **AD-07** `runReadinessPipeline` helper extraction (10-01) DRYs `/api/history` + public complete. KEEP.
- **AD-08** Server-side identity override (10-01 D-12) prevents slug-spoofing. Correct trust boundary. ACCEPT.
- **AD-09** Middleware stays synchronous, DB lookups happen in route handlers — correct perf posture. ACCEPT.
- **AD-10** Trainer cookie precedence when both present (09-02 D-10) — pragmatic; trainers can impersonate-view. ACCEPT.
- **AD-11** `bcryptjs` over `bcrypt` for Alpine Docker compat. Correct. ACCEPT.
- **AD-12** Reusing `APP_PASSWORD` as HMAC secret for associate token — acceptable for v1.1 per D-08 note; migration path to dedicated secret documented. ACCEPT with risk flag (see RF-02).

### Design lens
- **AD-13** Phase 14 scope correctly excludes `/interview` + `/review` (mid-session regression risk). ACCEPT.
- **AD-14** Phase 11/13 ship with DESIGN.md tokens from initial build; Phase 14 consolidates — reduces retrofit debt. KEEP.
- **AD-15** `PublicShell` extraction in 14-01 is the right DRY boundary. KEEP.
- **AD-16** Native `<select>` + `window.confirm` for trainer-internal CRUD — matches "utilitarian" direction; correct for solo-dev velocity. ACCEPT.

### DX lens
- **AD-17** TDD on pure-function + API layers, manual checkpoints for UI flows — appropriate test-cost mix. ACCEPT.
- **AD-18** Wave-based parallelization labeled; plans have clear `depends_on`. Good for /gsd-execute-phase routing. ACCEPT.
- **AD-19** All plans define artifacts + truths + verify commands — high machine-readability for wave dispatch. ACCEPT.

---

## Risk flags per phase

### Phase 8 (Schema Migration)
- **RF-01 (medium):** 08-02 Task 2 adds `prisma migrate deploy` to Docker CMD — this runs on every container boot. Concurrent boots (multi-instance scale-out) could race. Not a v1.1 issue (single GCE instance), flag for v1.2 scale-out. SURFACED, no block.

### Phase 9 (Associate PIN Auth)
- **RF-02 (medium):** Reusing `APP_PASSWORD` as HMAC secret couples trainer auth rotation to associate token invalidation. If you rotate `APP_PASSWORD`, all active associate sessions silently invalidate. Document in 09-01 SUMMARY. Flag as v1.2 hardening (dedicated `ASSOCIATE_SESSION_SECRET`).
- **RF-03 (low):** 09-02 middleware tests use `new NextRequest` — verify this matches the Next 16 App Router middleware test pattern; earlier Next versions had quirks. Note in test task.
- **RF-04 (low):** 09-03 Task 2 action text is uncertain about Next 16 403 pattern ("use whichever Next 16 API is idiomatic"). Planner should verify `unauthorized()` availability in Next 16 docs before implementation; fallback is explicit `Response` with 403 status.

### Phase 10 (Automated Interview Pipeline)
- **RF-05 (low):** 10-02 Task 1 integration tests require a separate `TEST_DATABASE_URL`. If not configured, tests skip silently — acceptable but surface in SUMMARY so CI gap is tracked.
- **RF-06 (low):** CONTEXT D-07 says SameSite=Lax for associate_session; 09-01 D-07 specifies SameSite=Strict. Inconsistency is benign (Strict is safer and 10-02 reads cookie server-side only) but flag for cleanup.

### Phase 11 (Cohort Management)
- **RF-07 (low):** 11-01 DELETE uses `$transaction` to null associates + delete cohort — redundant with Phase 8's `onDelete: SetNull` but belt-and-suspenders is fine. No action.
- **RF-08 (low):** 11-02 no E2E test; relies on human checkpoint. Acceptable for solo dev, flag for future Playwright coverage.

### Phase 12 (Cohort Dashboard Views)
- **RF-09 (low):** 12-01 treats `cohortId` query param as string, passes to Prisma `where: { cohortId: string }` — Prisma expects `Int`. Executor must coerce to `Number` before query. Small bug risk if not caught during implementation.

### Phase 13 (Curriculum Schedule)
- **RF-10 (medium):** 13-03 <400ms perf budget is tight. `Promise.all(GitHub fetch, curriculum fetch)` caps on GitHub latency, not curriculum. Budget is realistic only if GitHub responds <350ms. Flag: if budget fails, either loosen to 600ms or stub GitHub in Playwright perf test (plan says stub is acceptable).
- **RF-11 (low):** 13-03 Task 2 action proposes extending `/api/associates/[slug]/gap-scores` to return `cohortId` — that route was scoped to gap scores only in v1.0. Extending is fine but update its contract docs.
- **RF-12 (low):** CurriculumWeek.skillName matching to `GitHubFile.path.split('/')[0]` is a fragile contract (D-02 "documented not code-enforced"). One typo in trainer curriculum UI silently excludes a skill. Consider inline help text near skillName input in 13-02 pointing to correct convention.

### Phase 14 (Design Cohesion)
- **RF-13 (medium):** 14-01 Task 1 deletes many globals.css utilities (`.glass-card`, `.nlm-bg`, etc.). These may be referenced from non-restyled pages (`/interview`, `/review`, `/dashboard`). Deletion could cause visual regression on pages that weren't restyled. MITIGATION: Before deletion, grep the full codebase for each class — if referenced outside restyled scope, either restyle inline or retain the utility as a compatibility alias pointing to new tokens.
- **RF-14 (low):** 14-01 Task 1 replaces `--nlm-*` tokens entirely — same risk as RF-13. Mid-session pages may have hardcoded indigo. Grep before deletion.
- **RF-15 (low):** 14-01 `CurriculumFilterBadge` (13-03) vs `CurriculumWeekList` (14-02) may duplicate "today marker" logic. Minor DRY miss, not blocking.

---

## Taste decisions surfaced (DECISION_NEEDED)

### DN-01 (DX / trainer operations) — PIN delivery mechanism is out-of-band
Phase 9 stops at trainer copies PIN and manually communicates it (SMS/email/slack outside product). No in-product delivery (SMS, email-to-associate, print-friendly view). For a solo-trainer running a single cohort this is fine. For 20+ associate cohorts this is painful.
**Recommendation (FF):** Ship as planned. Add print-friendly PIN receipt view to v1.2 backlog only if trainer reports friction during cohort onboarding. No change to v1.1 scope.

### DN-02 (eng) — Dockerfile runtime migrate-deploy vs startup script
08-02 adds `prisma migrate deploy && node server.js` to CMD. Alternative: separate migration job (one-shot container) that runs before server start. Runtime in CMD is simpler for solo-GCE-Docker; separate job is proper pattern for Cloud Run / k8s.
**Recommendation (FF):** Ship CMD approach as planned (matches current GCE deployment). Migration to separate job is part of future Cloud Run zero-scale work (already in MEMORY.md roadmap).

### DN-03 (design) — Phase 14 scope includes `/login` but plan 14-01 also scaffolds `/associate/login` if Phase 9 didn't create it
Creates ambiguity about plan ownership. Phase 9 Plan 03 owns `/associate/login/page.tsx`.
**Recommendation:** Auto-decide — 09-03 builds the page, 14-01 restyles. No scaffolding path needed in 14-01 if 09-03 is done first (depends_on: ["09","10"] is correct). Add explicit note in 14-01 that scaffolding branch is dead code once 09-03 ships. NO USER INPUT NEEDED.

### DN-04 (eng) — Skill-to-path matching fragility (RF-12)
Current plan: substring match `curriculumWeek.skillName` ↔ `githubFile.path.split('/')[0]` case-insensitive. Alternative: add dropdown in curriculum UI populated from live GitHub tech list.
**Recommendation (FF):** Ship substring match as planned. Dropdown-from-GitHub is v1.2 polish (would require GitHub fetch in trainer UI + caching). Add helper text in curriculum form: "skillName must match a question bank folder (e.g., 'react', 'typescript')".

No BLOCKED items. All gray areas auto-resolve with fast-intuitive defaults consistent with solo-dev 3-4 week velocity.

---

## Confidence summary

| Dimension | Rating | Notes |
|-----------|--------|-------|
| Plan coverage of requirements | 10/10 | All 14 reqs mapped to plans |
| Architectural soundness | 9/10 | Dual-write preserved; identity trust boundaries correct |
| Test posture | 8/10 | TDD on pure/API layers; manual checkpoints on UI (appropriate) |
| Design consistency | 8/10 | Phase 14 consolidates; RF-13 watch on globals.css token swap |
| Solo-dev velocity fit | 9/10 | Native selects, window.confirm, inline forms — no over-engineering |
| Backward compat discipline | 10/10 | Every plan re-asserts v1.0 non-regression |

**Ready to execute via `/gsd-execute-phase` starting with Phase 8.** Surface RF-13/RF-14 (globals.css grep) and RF-09 (Int coercion) to executor at wave-dispatch time.
