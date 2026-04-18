# v1.3 Gap Closure Review

## Summary
| Severity | Count |
|----------|-------|
| P0 | 0 |
| P1 | 1 |
| P2 | 2 |
| P3 | 0 |

**Ship gate: BLOCK**

## Findings

### [P1] Password sign-in gate can still route first-login trainers to `/trainer`
**Phase:** P33
**File:** src/app/signin/SignInTabs.tsx:117
**Finding:** `handleTrainerSubmit` enforces the first-login gate from `user_metadata.password_set` only. It does not use the same Profile-first source of truth as the exchange route, and it also fails open to `/trainer` when `getUser()` is indeterminate. A trainer whose Supabase metadata says `password_set: true` while `Profile.passwordSetAt` is still null, or a first-login trainer whose post-login `getUser()` call errors, can take the password path directly to `/trainer`. That misses the Phase 33 success criterion that trainer password sign-in with `Profile.passwordSetAt == null` must go to `/auth/set-password`.
**Evidence:**
```ts
src/app/signin/SignInTabs.tsx:110
const { data, error } = await supabase.auth.getUser();
if (error || !data?.user) {
  // Fail-open per D-07 — middleware still blocks unauthenticated access.
  router.replace(nextPath ?? '/trainer');
...
src/app/signin/SignInTabs.tsx:117
const passwordSet = data.user.user_metadata?.password_set === true;
if (!passwordSet) {
  router.replace('/auth/set-password');
...
src/app/signin/SignInTabs.tsx:123
router.replace(nextPath ?? '/trainer');
```
**Recommendation:** Move the password-sign-in redirect decision behind a server-side Profile-first check, for example a small authenticated password-status endpoint that calls `lazyBackfillProfile`, reads `Profile.passwordSetAt`, then falls back to metadata. Treat an indeterminate gate as closed for authenticated trainers, or route to `/auth/set-password` until the Profile-first check succeeds.

### [P2] Concurrent `saveGapScores` calls can clobber `prevWeightedScore`
**Phase:** P34
**File:** src/lib/gapPersistence.ts:73
**Finding:** `saveGapScores` reads existing rows once, stores their `weightedScore` in `priorByKey`, then later upserts all new scores with that stale prior. Two overlapping saves for the same associate can both read the same old value and both write that value into `prevWeightedScore`, even if one save has already advanced `weightedScore`. The last writer wins, so the visible "Prior" polygon can skip an intermediate completed-session state.
**Evidence:**
```ts
src/lib/gapPersistence.ts:73
const existingScores = await prisma.gapScore.findMany({
  where: { associateId },
  select: { id: true, skill: true, topic: true, weightedScore: true },
});
...
src/lib/gapPersistence.ts:88
const prior = priorByKey.has(key) ? priorByKey.get(key)! : null;
return prisma.gapScore.upsert({
...
src/lib/gapPersistence.ts:97
update: {
  weightedScore: input.weightedScore,
  prevWeightedScore: prior,
  sessionCount: input.sessionCount,
},
```
**Recommendation:** Serialize gap-score saves per associate, or wrap the read/compute/write path in a transaction with an associate-scoped lock. If keeping the single-column design, make the update derive `prevWeightedScore` from the row value at update time rather than from a pre-read map.

### [P2] AssociateShell now has two mounted ProfileModal instances
**Phase:** P35
**File:** src/components/shell/AssociateShell.tsx:81
**Finding:** `AssociateShell` mounts a new root `ProfileModal` while still rendering `TopBar`, and `TopBar` always renders `AvatarMenu`, which already owns and mounts its own `ProfileModal`. That violates the focus requirement that `ProfileModal` mount exactly once per `AssociateShell` instance. Even if only one modal is opened at a time, this leaves duplicate dialog roots and duplicate modal state paths in the associate shell.
**Evidence:**
```tsx
src/components/shell/AssociateShell.tsx:71
<TopBar
  role="associate"
  associateSlug={slug}
  sidebarGroups={groups}
  onToggleSidebar={toggleCollapsed}
  sidebarCollapsed={collapsed}
/>
...
src/components/shell/AssociateShell.tsx:81
<ProfileModal
  open={profileOpen}
  onClose={() => setProfileOpen(false)}
  initialTab={profileInitialTab}
/>
```
**Recommendation:** Centralize profile modal ownership for the shell. Either lift the existing `AvatarMenu` modal state to `AssociateShell` and pass open callbacks down, or make `AvatarMenu` accept external modal handlers and skip its internal `ProfileModal` when the shell owns one.

### No Issues Found: Exchange-route magic-link gate and associate magic-link flow
No issues found. In `src/app/api/auth/exchange/route.ts:84`, lazy backfill and the Profile-first password check now run before the trainer/admin role branch at `src/app/api/auth/exchange/route.ts:101`, while associates still fall through to the existing authUserId linkage at `src/app/api/auth/exchange/route.ts:106`.

### No Issues Found: Schema migration safety
No issues found. The migration is idempotent and additive: `prisma/migrations/20260418000000_add_gapscore_prev_score/migration.sql:2` uses `ADD COLUMN IF NOT EXISTS`, and the Prisma model keeps the field nullable with `prevWeightedScore Float?` at `prisma/schema.prisma:72`. Existing production rows can remain null safely.

### No Issues Found: SkillRadar partial-null handling
No issues found. Partial priors are handled explicitly: each axis sets `hasPrev` from `prevWeightedScore != null`, falls back `before` to `now` when missing, renders the Prior polygon only when at least one axis has a real prior, and gates tooltip prior text per-axis (`src/components/associate/SkillRadar.tsx:141`, `src/components/associate/SkillRadar.tsx:142`, `src/components/associate/SkillRadar.tsx:171`, `src/components/associate/SkillRadar.tsx:266`). This avoids null/NaN propagation for null priors and keeps missing-prior axes renderable.

## Auto-decisions log
- Treated the password-path Profile/metadata divergence as P1 because it can violate the explicit first-login trainer gate and route an authenticated trainer to `/trainer`.
- Treated the `saveGapScores` race as P2 because it affects trajectory accuracy, not primary score persistence.
- Treated duplicate `ProfileModal` instances as P2 because it violates the shell-wiring focus area but does not by itself break navigation.
- Did not flag the nullable migration: no default is required for a nullable additive column, and existing rows staying null is intentional.
- Did not flag SkillRadar partial-null rendering: the fallback-to-now behavior is deliberate and covered by the new component tests.
