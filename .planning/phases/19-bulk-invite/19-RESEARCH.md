# Phase 19: Bulk Invite - Research

**Researched:** 2026-04-16
**Domain:** Bulk email invite flow — Next.js App Router, Supabase admin.generateLink, Resend, Prisma, chip UI
**Confidence:** HIGH

## Summary

Phase 19 builds on fully implemented Phase 18 primitives. The single-invite route (`/api/trainer/associates/[id]/invite/route.ts`) contains every building block needed: `getCallerIdentity`, `admin.generateLink`, Resend delivery, `lastInvitedAt` update, and `recordAuthEvent`. The bulk endpoint extracts these into a shared helper and runs them sequentially per email.

The UI is a two-screen flow: input + chip validation → preview table → result table. All data needed for the preview can be computed client-side using the existing associate roster (email + cohortId already returned by `/api/trainer`). No separate dry-run endpoint is needed.

One flag: the magic-link success criteria (SC 6) specifies redirect to `/associate/[slug]/dashboard`, but that route ships in Phase 23. The exchange route currently redirects to `/associate/[slug]`. Planner must choose: use existing redirect for Phase 19, or add a stub `/associate/[slug]/dashboard` page that redirects to `/associate/[slug]` as a forward-compat shim.

**Primary recommendation:** Extract `inviteAssociate(email, cohortId)` helper from the single-invite route; bulk endpoint calls it in a for-loop. Pre-flight checks aggregate `AuthEvent` count from DB (not the in-memory sliding window). Preview computed client-side from cached roster data.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01:** Trainer pastes emails into a textarea at `/trainer/onboarding`. Comma-separated AND newline-separated accepted (split on both).
**D-02:** Live validation chips below textarea — green chip for valid email, red for malformed, yellow for duplicate within batch. Count summary: "N valid, N invalid, N duplicate".
**D-03:** 50-email cap enforced client-side. Textarea blocks submit when >50 valid emails parsed. Clear error: "Maximum 50 emails per batch".
**D-04:** Trainer can remove individual chips before submit (click X on chip).
**D-05:** Single cohort dropdown (required field). All existing cohorts listed. No "none" option — bulk invite always targets a cohort.
**D-06:** Curriculum auto-assigned from cohort's `CurriculumWeek` records. No separate curriculum picker in the invite flow.
**D-07:** Associates already in the target cohort show as "Skip — same cohort" in preview. Associates in a different cohort show as "Reassign cohort".
**D-08:** Preview screen renders after trainer clicks "Preview". Table columns: Email | Action | Notes.
**D-09:** Action types: New / Reassign / Skip (same cohort) / Skip (invalid) / Skip (recently invited).
**D-10:** Trainer can uncheck individual rows before confirming.
**D-11:** Endpoint: `POST /api/trainer/invites/bulk`. Trainer-only.
**D-12:** Request body: `{ emails: string[], cohortId: number }`. Validated with Zod.
**D-13:** Pre-flight: count AuthEvent rows type=`trainer-invite` last 24h. Reject entire batch if `remaining < actionable emails`. Message: "Would exceed daily limit ({N} remaining of 20)".
**D-14:** Sequential per-email: upsert Associate by email → set cohortId → generateLink → Resend → update lastInvitedAt → recordAuthEvent. Partial failures independent.
**D-15:** Response: `{ results: [{ email, status: 'invited'|'reassigned'|'skipped'|'failed', error? }] }`.
**D-16:** Client replaces preview table with result table. Color-coded badges.

### Claude's Discretion

- Exact chip component implementation (could reuse existing UI primitives or build minimal)
- Toast/notification pattern after bulk complete
- Whether preview data comes from a separate dry-run endpoint or is computed client-side
- Loading state during bulk processing (progress bar vs spinner)
- Exact Zod schema field names and error messages

### Deferred Ideas (OUT OF SCOPE)

- CSV/file upload
- Per-email cohort override
- Invite templates (customizable subject/body)
- Re-invite all button
- Invite history page
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INVITE-01 | Textarea email input at `/trainer/onboarding`, live chip validation, malformed/duplicate surfacing, 50-email cap with clear error | Email regex pattern documented; chip state machine mapped; cap enforced client-side before submit |
| INVITE-02 | Cohort dropdown + curriculum auto-assign + preview screen with per-email action classification | Roster data (email+cohortId) already available from `/api/trainer`; preview computed client-side; `lastInvitedAt` 5-min check drives Skip (recently invited) |
| INVITE-03 | `/api/trainer/invites/bulk` — per-email transaction, partial-failure isolation, result table, 5-min re-invite throttle | Single-invite helper extraction pattern documented; daily limit via AuthEvent DB query; Zod schema defined |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `resend` | `^6.10.0` | Email delivery | Already installed [VERIFIED: package.json] |
| `@supabase/supabase-js` | `^2.103.2` | `admin.generateLink` | Already installed [VERIFIED: package.json] |
| `zod` | `^4.3.6` | Request body validation | Already installed, project standard [VERIFIED: package.json] |
| `prisma` (via `@/lib/prisma`) | project singleton | DB queries | Already installed [VERIFIED: package.json] |
| `react-hot-toast` | `^2.6.0` | Toast after bulk complete | Already installed [VERIFIED: package.json] |

### No New Dependencies Required

All required capabilities exist in the installed stack. Phase 19 is purely new routes + UI on top of Phase 18 infrastructure. [VERIFIED: package.json]

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/trainer/onboarding/
│   └── page.tsx              # New page — client component (form + preview + results)
├── app/api/trainer/invites/
│   └── bulk/
│       └── route.ts          # POST /api/trainer/invites/bulk
└── lib/
    └── inviteHelper.ts       # Extracted shared inviteAssociate() function
```

### Pattern 1: Shared Invite Helper Extraction

**What:** Extract the core single-invite logic from `/api/trainer/associates/[id]/invite/route.ts` into a shared `inviteAssociate(email: string, cohortId: number): Promise<InviteResult>` helper.
**When to use:** Both the single-invite route and the bulk endpoint need identical logic. Shared function prevents drift.

```typescript
// src/lib/inviteHelper.ts
// Source: extracted from src/app/api/trainer/associates/[id]/invite/route.ts [VERIFIED]
export type InviteResult = {
  status: 'invited' | 'reassigned' | 'skipped' | 'failed';
  error?: string;
};

export async function inviteAssociate(
  email: string,
  cohortId: number,
  ip: string,
): Promise<InviteResult> {
  // 1. Upsert Associate by email
  // 2. Check lastInvitedAt (5-min throttle) → 'skipped' if within window
  // 3. Set cohortId (detect reassignment)
  // 4. admin.generateLink({ type: 'magiclink', email, options: { redirectTo: `${SITE}/auth/callback` } })
  // 5. resend.emails.send(...)
  // 6. prisma.associate.update({ lastInvitedAt: new Date() })
  // 7. recordAuthEvent({ type: 'trainer-invite', ... })
  // Returns InviteResult
}
```

### Pattern 2: Pre-flight Daily Limit via AuthEvent DB Count

**What:** D-13 requires aggregate count of `AuthEvent` rows with `type = 'trainer-invite'` in the last 24 hours. This is a DB query, not the in-memory sliding window in `checkAuthRateLimit`.

**Critical note:** The existing `checkAuthRateLimit` function uses an in-memory sliding window with `EMAIL_LIMIT = 3` per hour — it does NOT implement a 20/day cap. [VERIFIED: src/lib/authRateLimit.ts lines 20-22]. The bulk endpoint must implement the 20/day check directly against `AuthEvent`:

```typescript
// src/app/api/trainer/invites/bulk/route.ts
const DAILY_INVITE_LIMIT = 20;
const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
const todayCount = await prisma.authEvent.count({
  where: { type: 'trainer-invite', createdAt: { gte: since } },
});
const remaining = DAILY_INVITE_LIMIT - todayCount;
if (remaining < actionableEmails.length) {
  return NextResponse.json(
    { error: `Would exceed daily limit (${remaining} remaining of ${DAILY_INVITE_LIMIT})` },
    { status: 429 }
  );
}
```

[ASSUMED: `ip` field in AuthEvent is used as trainer identifier in single-invite route — bulk should use same pattern or scope by trainer email]

### Pattern 3: Client-Side Preview Classification

**What:** Preview is computed client-side by comparing the parsed email list against the associate roster fetched from `/api/trainer`. No separate dry-run endpoint needed.
**Data already available from `/api/trainer` response:** associate email, cohortId. [VERIFIED: src/app/api/trainer/associates/route.ts]

Classification logic:
- Email not in roster + valid → **New**
- Email in roster, different cohortId → **Reassign**
- Email in roster, same cohortId → **Skip (same cohort)**
- Malformed email → **Skip (invalid)** (never sent to API)
- `lastInvitedAt` < 5 min ago → **Skip (recently invited)** (checked client-side OR server enforces)

### Pattern 4: Sequential Per-Email Processing

**What:** D-14 requires sequential processing (not `Promise.all`) so partial failures are isolated and errors don't cascade.

```typescript
const results: ResultRow[] = [];
for (const email of actionableEmails) {
  try {
    const result = await inviteAssociate(email, cohortId, ip);
    results.push({ email, ...result });
  } catch (err) {
    results.push({ email, status: 'failed', error: String(err) });
  }
}
```

### Pattern 5: Zod Request Validation

```typescript
// Source: project pattern from src/app/api/auth/magic-link/route.ts [VERIFIED]
import { z } from 'zod';

const BulkInviteSchema = z.object({
  emails: z.array(z.string().email()).min(1).max(50),
  cohortId: z.number().int().positive(),
});
```

### Pattern 6: Associate Upsert by Email

For **New** emails: `prisma.associate.upsert` where `email` is the unique key. Need to auto-generate a slug from the email (e.g., local part + random suffix to avoid collision). [ASSUMED: slug generation strategy — planner should define exact pattern]

```typescript
// Upsert pattern
const associate = await prisma.associate.upsert({
  where: { email },
  update: { cohortId },
  create: {
    email,
    slug: generateSlugFromEmail(email), // e.g. 'jsmith-x4k2'
    cohortId,
  },
});
```

### Pattern 7: Auth Callback Redirect Target

**Important:** SC 6 states invitees land on `/associate/[slug]/dashboard` after click-through. The current `exchange` route redirects to `/associate/${assoc.slug}` (not `/dashboard`). [VERIFIED: src/app/api/auth/exchange/route.ts line 121]

Phase 23 builds the associate dashboard. For Phase 19, two options:
1. Keep existing redirect to `/associate/[slug]` — magic link works, lands on profile page (acceptable for MVP)
2. Add stub `/associate/[slug]/dashboard/page.tsx` that immediately redirects to `/associate/[slug]`

**Recommendation (Claude's discretion):** Option 2 — add a thin stub page. This makes SC 6 literally true without waiting for Phase 23, costs one file, and Phase 23 simply replaces the stub with real content.

### Anti-Patterns to Avoid

- **Using `checkAuthRateLimit` for the 20/day check:** That function is an in-memory sliding window with `EMAIL_LIMIT = 3`. Use DB-level `AuthEvent` count for bulk pre-flight.
- **`Promise.all` for per-email processing:** Partial failures must be isolated. Sequential loop required per D-14.
- **Blocking submit on >50 total emails vs >50 valid emails:** D-03 says block on >50 valid emails parsed. Malformed/duplicate chips don't count toward the cap.
- **Using `admin.generateLink` with type `'invite'`:** Use `'magiclink'` — matches what Phase 18 single-invite uses and what `getMagicLinkEmailHtml` is designed for. [VERIFIED: single-invite route line 59]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email validation regex | Custom regex | `z.string().email()` (Zod) | Zod's email validator handles edge cases; already in stack |
| Magic link generation | Custom JWT / token table | `supabaseAdmin.auth.admin.generateLink` | Phase 18 already implemented and tested |
| Email delivery | Direct SMTP | `resend.emails.send` | Already wired + tested in Phase 18 |
| Auth event logging | Custom audit table | `recordAuthEvent` from `authRateLimit.ts` | Function exists, `AuthEvent` model already in schema |
| Cohort list for dropdown | New endpoint | `prisma.cohort.findMany()` inline in the page | Simple select, no new API surface needed |

**Key insight:** Phase 19 is integration, not invention. Every primitive exists. The work is wiring + UI.

## Common Pitfalls

### Pitfall 1: Daily Limit Check Mismatch

**What goes wrong:** Using `checkAuthRateLimit` for the 20/day pre-flight check gives the wrong result — it's 3/hr per email (in-memory), not 20/day aggregate.
**Why it happens:** Comment in single-invite route says "20/day" but implementation delegates to `checkAuthRateLimit` which has different semantics.
**How to avoid:** Bulk pre-flight queries `AuthEvent` table directly with `prisma.authEvent.count({ where: { type: 'trainer-invite', createdAt: { gte: since24h } } })`.
**Warning signs:** Daily limit not being enforced at 20; limit resets on server restart.

### Pitfall 2: Slug Collision on New Associate Creation

**What goes wrong:** Two invites in rapid succession for emails with the same local part generate identical slugs, causing a Prisma P2002 unique constraint error.
**Why it happens:** `Associate.slug` has `@unique` constraint. Auto-generated slugs from email local parts can collide.
**How to avoid:** Append a random suffix (e.g., 4-char nanoid) during upsert create; or use email hash prefix. Catch P2002 and retry with new suffix.
**Warning signs:** `inviteAssociate` throwing P2002 on sequential batch.

### Pitfall 3: Preview Data Stale for Large Rosters

**What goes wrong:** Preview is computed from roster fetched at page load. If trainer adds associates in another tab, preview may show "New" for an email that already exists.
**Why it happens:** Client-side classification uses snapshot data.
**How to avoid:** Re-fetch roster on preview click (not just on page load). The server enforces correct upsert behavior regardless of stale preview data — preview is informational.
**Warning signs:** Preview says "New" but API returns `reassigned`.

### Pitfall 4: magic-link Redirect Mismatch

**What goes wrong:** SC 6 says invitee lands on `/associate/[slug]/dashboard`. Phase 23 hasn't built that page yet. Without a stub, the redirect 404s.
**Why it happens:** `exchange` route redirects to `/associate/${slug}` not `/associate/${slug}/dashboard`.
**How to avoid:** Add stub `/associate/[slug]/dashboard/page.tsx` that renders or redirects to `/associate/[slug]`.
**Warning signs:** Associate clicks magic link, gets 404.

### Pitfall 5: `generateLink` Called for Email Without Associate Row

**What goes wrong:** Calling `generateLink` before the `prisma.associate.upsert` completes means the auth user exists in Supabase but no Associate row can be linked on callback.
**Why it happens:** Race or error between upsert and generateLink steps.
**How to avoid:** Strict ordering in `inviteAssociate`: upsert first, generateLink second. If generateLink fails, Associate row exists but has no authUserId — acceptable, can be re-invited.

## Code Examples

### Bulk API Route Skeleton

```typescript
// Source: pattern from src/app/api/trainer/associates/[id]/invite/route.ts [VERIFIED]
// src/app/api/trainer/invites/bulk/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCallerIdentity } from '@/lib/identity';
import { prisma } from '@/lib/prisma';
import { inviteAssociate } from '@/lib/inviteHelper';

const DAILY_LIMIT = 20;

const BulkInviteSchema = z.object({
  emails: z.array(z.string().email()).min(1).max(50),
  cohortId: z.number().int().positive(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const caller = await getCallerIdentity();
  if (caller.kind !== 'trainer' && caller.kind !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = BulkInviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { emails, cohortId } = parsed.data;
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';

  // Pre-flight: daily limit
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const todayCount = await prisma.authEvent.count({
    where: { type: 'trainer-invite', createdAt: { gte: since } },
  });
  const remaining = DAILY_LIMIT - todayCount;
  if (remaining < emails.length) {
    return NextResponse.json(
      { error: `Would exceed daily limit (${remaining} remaining of ${DAILY_LIMIT})` },
      { status: 429 }
    );
  }

  // Sequential per-email processing
  const results = [];
  for (const email of emails) {
    try {
      const result = await inviteAssociate(email, cohortId, ip);
      results.push({ email, ...result });
    } catch (err) {
      results.push({ email, status: 'failed', error: String(err) });
    }
  }

  return NextResponse.json({ results });
}
```

### Email Parsing + Validation (Client Side)

```typescript
// Parse textarea value into deduped, classified email list
function parseEmails(raw: string): ParsedEmail[] {
  const parts = raw.split(/[\s,]+/).map(s => s.trim()).filter(Boolean);
  const seen = new Set<string>();
  return parts.map(value => {
    const normalized = value.toLowerCase();
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    const isDuplicate = seen.has(normalized);
    if (isValid) seen.add(normalized);
    return {
      value,
      state: !isValid ? 'invalid' : isDuplicate ? 'duplicate' : 'valid',
    };
  });
}
```

### 5-Minute Re-invite Throttle (in inviteAssociate)

```typescript
// Source: pattern from single-invite route [VERIFIED: lastInvitedAt update]
const THROTTLE_MS = 5 * 60 * 1000;
if (associate.lastInvitedAt) {
  const elapsed = Date.now() - associate.lastInvitedAt.getTime();
  if (elapsed < THROTTLE_MS) {
    return { status: 'skipped', error: 'Recently invited — throttled' };
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom PIN cookie auth | Supabase magic-link via `admin.generateLink` | Phase 18 | Magic links work; `exchange` route handles callback |
| No trainer invite flow | Single-invite route at `/api/trainer/associates/[id]/invite` | Phase 18 | Bulk extends this pattern |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Slug generation for new associates: email local part + random suffix | Architecture Patterns (Pattern 6) | P2002 unique constraint errors on batch if slugs collide; planner needs to define exact strategy |
| A2 | Single-invite route 20/day comment reflects intended limit even though `checkAuthRateLimit` uses 3/hr window | Pitfall 1 | If 20/day is aspirational only, bulk pre-flight limit should match whatever P18 agreed |
| A3 | `/associate/[slug]/dashboard` stub page is the right forward-compat approach | Architecture Patterns (Pattern 7) | If planner defers stub to Phase 23, magic links from P19 land on existing `/associate/[slug]` instead |
| A4 | `ip` field in bulk AuthEvent records should use request `x-forwarded-for` header | Code Examples | Audit trail won't correctly attribute to trainer IP if wrong header used |

## Open Questions (RESOLVED)

1. **Slug auto-generation strategy for new associates**
   - What we know: `Associate.slug` is `@unique`, required (not nullable)
   - What's unclear: No existing pattern for auto-generating slugs from email; existing associates have human-entered slugs
   - Recommendation: `{local-part}-{4-char-random}` e.g. `jsmith-x4k2`. Collision retry on P2002.
   - **RESOLVED:** Adopted in Plan 03 Task 2. `inviteHelper.ts` uses `generateSlug(email)` = local-part + 4-char hex suffix with P2002 retry.

2. **Dashboard redirect target for Phase 19 magic links**
   - What we know: SC 6 says `/associate/[slug]/dashboard`; exchange route currently goes to `/associate/[slug]`; Phase 23 builds the real dashboard
   - What's unclear: Whether trainer accepts `/associate/[slug]` as acceptable landing for now
   - Recommendation: Add stub `page.tsx` in Phase 19 that renders or redirects to `/associate/[slug]` — satisfies SC literally, zero-cost.
   - **RESOLVED:** Adopted in Plan 03 Task 1. Stub `src/app/associate/[slug]/dashboard/page.tsx` redirects to `/associate/[slug]`. Exchange route updated to redirect to `/associate/${slug}/dashboard`.

3. **AuthEvent-based daily limit scoping**
   - What we know: Single-invite route uses `caller.email ?? 'trainer'` as the `ip` field to namespace rate limits; D-13 says "per trainer" daily limit
   - What's unclear: In single-trainer deployments this doesn't matter; in multi-trainer future it does
   - Recommendation: Use `caller.email ?? 'trainer'` as filter on AuthEvent.ip for the daily count, matching single-invite pattern.
   - **RESOLVED:** Adopted in Plan 03 Tasks 2-3. Bulk route filters `AuthEvent` by `ip = caller.email ?? "trainer"` for per-trainer daily count.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase `admin.generateLink` | Magic-link generation | ✓ | Phase 18 configured | — |
| Resend | Email delivery | ✓ | `^6.10.0` | — |
| Prisma / Supabase DB | Associate upsert, AuthEvent | ✓ | Prisma 7.x | — |
| `/api/trainer` roster endpoint | Preview classification | ✓ | Phase 18 (existing) | — |
| `/associate/[slug]` route | Magic link landing | ✓ | Existing | — |
| `/associate/[slug]/dashboard` | SC 6 redirect target | ✗ (Phase 23) | — | Stub page OR use `/associate/[slug]` |

**Missing dependencies with no fallback:** None — all blocking deps available.

**Missing dependencies with fallback:**
- `/associate/[slug]/dashboard` — stub page in Phase 19, or accept `/associate/[slug]` landing until Phase 23.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npm run test -- --run` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INVITE-01 | `parseEmails()` splits on comma+newline, flags malformed, flags duplicates | unit | `npm run test -- --run src/lib/inviteHelper.test.ts` | ❌ Wave 0 |
| INVITE-01 | Client rejects submit when valid count > 50 | unit | `npm run test -- --run src/app/trainer/onboarding/onboarding.test.ts` | ❌ Wave 0 |
| INVITE-02 | Preview classification: New/Reassign/SkipSameCohort/SkipInvalid/SkipThrottled | unit | `npm run test -- --run src/app/trainer/onboarding/onboarding.test.ts` | ❌ Wave 0 |
| INVITE-03 | Bulk API: partial failure isolation (one email fails, others succeed) | integration | `npm run test -- --run src/app/api/trainer/invites/bulk/route.test.ts` | ❌ Wave 0 |
| INVITE-03 | Bulk API: pre-flight rejects when daily limit exceeded | integration | `npm run test -- --run src/app/api/trainer/invites/bulk/route.test.ts` | ❌ Wave 0 |
| INVITE-03 | Bulk API: 5-min throttle skips recently-invited email | integration | `npm run test -- --run src/app/api/trainer/invites/bulk/route.test.ts` | ❌ Wave 0 |
| INVITE-03 | Bulk API: 50-email Zod max enforced | unit | `npm run test -- --run src/app/api/trainer/invites/bulk/route.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test -- --run src/app/api/trainer/invites/bulk/route.test.ts`
- **Per wave merge:** `npm run test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/lib/inviteHelper.test.ts` — covers email parsing + inviteAssociate unit cases
- [ ] `src/app/api/trainer/invites/bulk/route.test.ts` — covers API integration cases
- [ ] `src/app/trainer/onboarding/onboarding.test.ts` — covers UI state machine (chip validation, cap enforcement, preview classification)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Trainer auth via `getCallerIdentity` (Phase 18) |
| V3 Session Management | no | Session managed by Supabase (Phase 18) |
| V4 Access Control | yes | `getCallerIdentity` → `trainer` or `admin` only; Zod validates body |
| V5 Input Validation | yes | Zod schema on request body; email regex client-side; 50-cap client + server |
| V6 Cryptography | no | Magic link generation delegated to Supabase admin SDK |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unauthenticated bulk invite | Elevation of privilege | `getCallerIdentity` → 401 for non-trainer |
| Batch flooding (spam 50 emails/call) | Denial of service | 20/day pre-flight DB count; 50/call Zod max |
| Re-invite bombing via batch | Denial of service | 5-min `lastInvitedAt` throttle per associate |
| Email enumeration via preview | Information disclosure | Preview data from trainer-authenticated roster fetch; no new data exposure |
| Malformed cohortId injection | Tampering | `z.number().int().positive()` Zod validation; Prisma parameterized query |

## Sources

### Primary (HIGH confidence)
- `src/app/api/trainer/associates/[id]/invite/route.ts` — Single invite implementation (generateLink, Resend, lastInvitedAt, recordAuthEvent) [VERIFIED]
- `src/lib/authRateLimit.ts` — Rate limit constants (EMAIL_LIMIT=3/hr, not 20/day) [VERIFIED]
- `src/app/api/auth/exchange/route.ts` — Callback redirect target is `/associate/${slug}` not `/associate/${slug}/dashboard` [VERIFIED]
- `prisma/schema.prisma` — Associate model (email, authUserId, lastInvitedAt, cohortId), AuthEvent model [VERIFIED]
- `package.json` — All required packages already installed (resend ^6.10.0, zod ^4.3.6, react-hot-toast ^2.6.0) [VERIFIED]
- `src/lib/supabase/admin.ts` — `supabaseAdmin` client pattern [VERIFIED]
- `src/lib/email/auth-templates.ts` — `getMagicLinkEmailHtml` reusable as-is [VERIFIED]

### Secondary (MEDIUM confidence)
- `DESIGN.md` — Design tokens for chip colors: success=`--success` (#2D6A4F), warning=`--warning` (#B7791F), danger=`--danger` (#B83B2E), semantic badge background values [VERIFIED]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified in package.json
- Architecture: HIGH — single-invite route is the direct template; patterns are verified extractions
- Pitfalls: HIGH — daily limit mismatch verified by reading authRateLimit.ts constants; redirect mismatch verified from exchange route
- Test map: HIGH — test files don't exist yet (Wave 0 gaps), but locations and behaviors are deterministic from requirements

**Research date:** 2026-04-16
**Valid until:** 2026-05-16 (stable dependencies — no fast-moving packages)
