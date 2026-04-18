---
date: 2026-04-18
session: v1.4 local demo
mode: dogfood
host: macOS arm64 + Colima x86_64 profile
---

# v1.4 Local Demo — Findings

Dogfood session after autonomous pipeline run. Drove full coding-challenge
flow end-to-end on local dev stack (Next.js + Supabase + Judge0 x86_64 VM +
4 seeded demo challenges).

## P0 / Must-fix before prod

### F-01 — Routes hard-fail when GitHub repo env vars missing
Three server routes threw 500 when `GITHUB_CODING_PUBLIC_REPO` /
`GITHUB_CODING_PRIVATE_REPO` unset:

- `GET /api/coding/challenges/[id]` — `loadChallenge()` fetches README from GitHub
- `POST /api/coding/submit` — `loadHiddenTests()` fetches private repo
- `POST /api/coding/submit` (SQL branch) — `getSetupSql()` fetches public repo

**Patched** in-session with DB fallbacks (hidden tests already in DB per sync;
description already in `CodingChallenge.description` column; setupSql → empty).

**Long-term:** decide whether DB is canonical OR GitHub is canonical. Today
it's a hybrid that breaks when GitHub is unreachable. Proposed: make GitHub
refresh an idempotent sync that writes description + setup.sql into DB
columns, then routes read purely from DB. Removes runtime GitHub dependency.

### F-02 — Prisma migration flow unusable on Supabase free tier
Direct Supabase host (`db.*.supabase.co:5432`) is IPv6-only on free tier; our
network can't reach it. `prisma migrate deploy` / `status` hang or fail.

**Workaround used:** applied `0006`, `0007`, and
`20260418000000_add_gapscore_prev_score` via raw SQL through the transaction
pooler (DATABASE_URL). Inserted rows into `_prisma_migrations` manually.

**Long-term:** either (a) enable Supabase IPv4 add-on, or (b) switch
`DIRECT_URL` to the session-mode pooler format and verify auth works.
Document the answer in README for contributors.

### F-03 — Prisma client requires dev-server restart after schema change
`npx prisma generate` updates `src/generated/prisma/index.d.ts` but
Next.js/Turbopack caches the client. Hot reload doesn't pick it up; requires
full `Ctrl+C` + `npm run dev`. Symptom: runtime "Unknown field" errors even
though schema + client agree.

**Fix:** add `prisma generate && next dev` to the `dev` script, OR add a
`postinstall` hook.

## P1 / UX friction

### F-04 — VerdictCard doesn't surface expected-vs-actual diff
Demo-fizzbuzz failure showed "fail" but UI didn't make it obvious that user's
stdout (1-100) was longer than expected (1-5). User asked "output seems
fine, why fail?" — answer required reading DB directly.

**Fix:** VerdictCard visible-test accordion should render a unified diff
(expected / actual) when `passed === false`. Keep hidden-test output
suppressed per D-05.

### F-05 — "Run" button always disabled ("Coming soon")
Phase 40 Plan 03 Task 1 shipped Run as a placeholder. Users naturally click
Run first, get no feedback. Submit is the only active button.

**Fix:** either (a) ship Run with a single-visible-case execution path, or
(b) remove the button entirely until implemented. Placeholder buttons create
drag.

### F-06 — Rate limit too aggressive for dev
`CODING_SUBMIT_RATE_HOURLY=5` hit within one session. Env changes require
dev-server restart. Bucket state in `data/rate-limits.json` persists across
restarts — can't clear via "just restart".

**Fix:** make rate-limit bucket path + per-scope limit overridable via
`rate-limits.dev.json` or a per-env override. Document for contributors.

## P2 / Infrastructure insights

### F-07 — Colima x86_64 profile closes Judge0 sandbox gap on Apple Silicon
Full-system QEMU emulation (`colima --arch x86_64 --vm-type=qemu`) runs
isolate's `clone(CLONE_NEWPID|CLONE_NEWUSER)` correctly where arm64 Colima
(userspace QEMU) fails with `EINVAL`.

4/10 spike fixtures PASS end-to-end (Python, SQL, C#); Java/JS/TS need bigger
resource caps (JVM code cache > 245 KB; Node 12 startup > 15s wall under
emulation). Prod native x86_64 should pass all 10.

**Action:** `.planning/phases/38-judge0-infrastructure/38-SPIKE-REPORT.md`
PARTIAL-PASS → PASS for local dev verification. Committed 2e2dcc4.

### F-08 — Supabase auth-token lock-stealing warnings
Frequent `[browser] ⨯ unhandledRejection: Error: Lock "lock:sb-...-auth-token"
was released because another request stole it` messages when multiple tabs
open. Benign (concurrent session refresh) but noisy — clutters error watch.

**Fix:** filter at the Supabase client layer OR suppress in dev-error overlay.

### F-09 — Monaco script-tag React warning
`Encountered a script tag while rendering React component` surfaces on load.
Monaco's worker bootstrap pattern is the source. Benign but confusing.

**Fix:** wrap Monaco mount in a way that avoids injecting `<script>` into
React tree, or explicitly suppress with `suppressHydrationWarning`.

### F-10 — SQL demo pattern needs revision
Current demo-select-all stored schema + seed + answer + test all in the test
case `stdin`. But submit concatenation order is `setupSql + user code + test
query`. The "stdin seeds schema" pattern doesn't match the contract.

**Fix:** SQL challenges need schema/seed in `setupSql` column or separate
field, not in test-case stdin. Trainer-authoring doc should make this
explicit with an example.

## Stack health observations

| Component | Status | Notes |
|-----------|--------|-------|
| Next.js dev | ✅ | Turbopack boots <300ms |
| Supabase pool | ✅ | Health check OK |
| Judge0 x86_64 | ✅ | sys_info OK, sandbox exec works |
| Prisma client | ⚠️ | Requires dev restart after schema change |
| File-based rate limits | ⚠️ | Persists across restart, no dev override |
| Monaco load | ⚠️ | ~3-4s first nav; subsequent fast |

## Token usage (this demo)

~30-40K additional tokens for in-session patches (env append, 3 route
fallbacks, rate-limit bump, seed script, migration apply, diagnosis).

## Recommendations for v1.5 seeds

1. **GitHub-as-sync, not runtime dep** — refresh writes to DB columns, routes
   read DB only (F-01)
2. **Supabase IPv4 or pooler-only migration flow** — document one working
   path (F-02)
3. **prisma generate in dev script** (F-03)
4. **VerdictCard expected-vs-actual diff** (F-04)
5. **Run button: ship or remove** (F-05)
6. **Rate-limit dev override file** (F-06)
7. **ARM-Mac contributor docs** — colima x86_64 setup (F-07)
8. **Supabase lock-steal warning filter** (F-08)
9. **Monaco script-tag suppression** (F-09)
10. **SQL bank contract clarification** — schema in setupSql, not stdin (F-10)

## Artifacts created this session

- `scripts/seed-coding-demo.ts` (4 local demo challenges — uncommitted, git-ignore candidate)
- In-route fallbacks for missing GitHub env (3 patches — uncommitted, awaiting decision on F-01 direction)
- Added `JUDGE0_URL`, `JUDGE0_AUTH_TOKEN`, coding rate-limit vars to `.env` (local only)
- Applied migrations 0006, 0007, gapscore_prev_score to Supabase DB
- Seeded 4 coding challenges into DB
