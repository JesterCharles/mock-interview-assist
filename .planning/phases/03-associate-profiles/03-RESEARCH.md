# Phase 3: Associate Profiles - Research

**Researched:** 2026-04-13
**Domain:** Prisma schema extension, slug-based identity, Next.js App Router dynamic routes, Zustand state extension
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Trainer-assigned slugs — simple text identifiers (e.g., "john-doe", "jsmith"). No auto-generation, no login. Trainer types slug during interview setup wizard (Phase 2 of dashboard, alongside candidateName).
- **D-02:** Slug input added to dashboard setup wizard Phase 2 (participant details step). Optional — sessions without a slug are anonymous (backward compatible).
- **D-03:** New `Associate` Prisma model: id (auto), slug (unique), displayName, createdAt, updatedAt. Session model gets a foreign key to Associate (nullable).
- **D-04:** New `/associate/[slug]` route showing all sessions for that associate. Simple list view — no charts or gap scores (Phase 4+). Shows session date, score summary, status.
- **D-05:** Slugs are lowercased, trimmed, alphanumeric + hyphens only. Validated on input. If slug exists, sessions attach to existing associate. If new, create associate record.

### Claude's Discretion

- Whether to add slug to the Zustand store or handle entirely server-side
- Profile page layout details (simple list is sufficient)
- Error handling for invalid slugs

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PERSIST-02 | Associate profiles persist with trainer-assigned slug/ID (no login required) | Prisma `Associate` model with unique slug, upsert-on-save pattern, `/associate/[slug]` Server Component page querying Prisma directly |

</phase_requirements>

---

## Summary

Phase 3 extends the Prisma schema with a new `Associate` model linked to `Session` by a nullable foreign key. The data flow has two insertion points: (1) the dashboard setup wizard's Phase 2 panel captures a slug input alongside candidate name, and (2) the `/api/history` POST handler, which already receives the full `InterviewSession`, uses Prisma `upsert` to create-or-find the associate record and then links the session to it on DB write.

The profile view is a Next.js App Router Server Component at `/associate/[slug]` that reads sessions from Prisma. It is protected by the same `isAuthenticatedSession()` guard used throughout the codebase. No client-side state or additional API routes are needed for the read path — Server Component + Prisma is sufficient and keeps the implementation minimal.

The key design tension is **where the slug travels before it reaches the API**. Since the Zustand store already persists `candidateName` to localStorage and passes it to `createSession`, the simplest approach is to add `associateSlug` alongside `candidateName` in both the store and the `InterviewSession` type, matching the established pattern exactly. The slug then reaches `/api/history` POST in the session payload — no new API surface required.

**Primary recommendation:** Extend `InterviewSession` with optional `associateSlug`, add it to Zustand store state and `createSession` signature, add the Prisma `Associate` model, wire upsert logic in the history POST handler, and render `/associate/[slug]` as a Server Component.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma CLI | 7.7.0 | Schema migrations, type generation | Locked in CLAUDE.md — Phase 1 installs it |
| @prisma/client | 7.7.0 | Type-safe DB queries | Locked in CLAUDE.md |
| zod | 4.3.6 | Slug input validation | Locked in CLAUDE.md §Validation |
| Next.js App Router | 16.1.1 | Dynamic `[slug]` Server Component route | Already in project |
| Zustand 5 | 5.0.9 | Store state (slug travels with session) | Already in project |

### No New Dependencies

This phase adds no new npm packages. All required tools (Prisma, zod, Next.js) are either already installed or will be installed by Phase 1. [VERIFIED: package.json inspection]

**Installation:** None required for Phase 3 itself.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   └── associate/
│       └── [slug]/
│           └── page.tsx          # Server Component — profile list view
├── app/api/
│   └── history/
│       └── route.ts              # Existing — extend POST to upsert associate
├── lib/
│   └── types.ts                  # Add associateSlug?: string to InterviewSession
└── store/
    └── interviewStore.ts         # Add associateSlug state + pass to createSession
prisma/
└── schema.prisma                 # Add Associate model + Session.associateId FK
```

### Pattern 1: Associate Upsert on Session Save

**What:** On every `/api/history` POST, when `associateSlug` is present, upsert the `Associate` record (create if missing, find if exists) then write the session with `associateId` populated.

**When to use:** Eliminates a separate "create associate" endpoint. Keeps the dual-write path as the single insertion point (as established in Phase 2 D-01).

**Example:**
```typescript
// In /api/history POST, after the file write succeeds:
// Source: [ASSUMED] — Prisma upsert pattern from training knowledge
if (session.associateSlug) {
  const associate = await prisma.associate.upsert({
    where: { slug: session.associateSlug },
    update: { displayName: session.candidateName ?? undefined },
    create: {
      slug: session.associateSlug,
      displayName: session.candidateName ?? null,
    },
  });
  // Then use associate.id when writing the Session row to Prisma
}
```

**Key detail:** `update` only sets `displayName` if a candidateName is provided — prevents overwriting a previously set display name with `undefined` from an anonymous session that happens to reuse the slug.

### Pattern 2: Slug in Zustand Store (Alongside candidateName)

**What:** `associateSlug` is stored in Zustand `InterviewStore` exactly like `candidateName` — local state in dashboard Page component, passed as arg to `createSession`, stored on `session` object, persisted to localStorage.

**When to use:** This mirrors the established pattern exactly. The slug travels to the API in the session payload — no separate fetch or state management needed. [VERIFIED: interviewStore.ts inspection — candidateName follows this exact path]

**Example:**
```typescript
// In interviewStore.ts — extend InterviewSession type
// src/lib/types.ts
export interface InterviewSession {
  // ... existing fields
  associateSlug?: string;  // optional — backward compatible
}

// Store: add state + pass through createSession
// Dashboard: add local state `associateSlug`, pass to createSession
```

**Zustand store recommendation (Claude's Discretion):** Add `associateSlug` to Zustand store, not server-side only. Rationale: the slug must be captured client-side in the dashboard wizard and stored for the duration of the session (user might navigate away mid-session). Zustand with `persist` already handles this for `candidateName`. Server-side-only would require an extra POST before the session starts, adding complexity and a new API surface. Store wins on simplicity.

### Pattern 3: Server Component Profile Page

**What:** `/associate/[slug]/page.tsx` is a Next.js App Router Server Component. It calls Prisma directly (no API route needed for reads), checks auth, and renders a session list.

**When to use:** Standard Next.js 16 App Router pattern for data-fetching pages. No client interactivity required (list view). Avoids an extra API route. [VERIFIED: Next.js App Router docs — Server Components can import Prisma directly]

**Example:**
```typescript
// src/app/associate/[slug]/page.tsx
// Source: [ASSUMED] — Next.js App Router Server Component pattern
import { prisma } from '@/lib/db'; // Phase 1 singleton
import { isAuthenticatedSession } from '@/lib/auth-server';
import { redirect } from 'next/navigation';

export default async function AssociateProfilePage({
  params,
}: {
  params: { slug: string };
}) {
  if (!(await isAuthenticatedSession())) {
    redirect('/login');
  }

  const associate = await prisma.associate.findUnique({
    where: { slug: params.slug },
    include: {
      sessions: {
        orderBy: { date: 'desc' },
        select: {
          id: true,
          date: true,
          status: true,
          overallTechnicalScore: true,
          overallSoftSkillScore: true,
          candidateName: true,
        },
      },
    },
  });

  if (!associate) {
    // Return 404 or empty state
  }

  return (/* JSX list view */);
}
```

### Pattern 4: Slug Validation with Zod

**What:** Validate slug on client (dashboard input onChange) and on server (history POST handler before upsert).

**When to use:** D-05 requires slug to be lowercase, trimmed, alphanumeric + hyphens. Zod schema is the standard approach per CLAUDE.md.

**Example:**
```typescript
// Source: [ASSUMED] — Zod 4 string validation
const slugSchema = z.string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens');

// Client: validate on blur/submit, show inline error
// Server: parse before upsert, return 400 if invalid
```

**Note:** Client-side transformation (toLowerCase + trim) before sending means server receives normalized value. Both sides should validate — client for UX, server for security.

### Anti-Patterns to Avoid

- **Separate "create associate" endpoint:** Don't add a `POST /api/associates` route. The upsert-on-session-save pattern handles creation lazily and keeps the Phase 2 dual-write path as the sole insertion point.
- **Blocking session save on associate DB failure:** Phase 2 D-01 established that DB write failures must not fail the file-write response. Associate upsert must follow the same log-and-continue pattern.
- **Server-only slug (no Zustand):** Requires an extra API call before session creation and state threading through URL/cookies. More complex than extending existing Zustand state.
- **Eager associate creation:** Don't create the Associate record when the trainer types the slug. Create it only when the session is saved. Prevents orphan Associate records from abandoned setup wizard flows.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Slug uniqueness | Custom uniqueness check + manual insert | Prisma `upsert` with `where: { slug }` | Prisma handles the race condition — the `@@unique` constraint on slug + upsert is atomic |
| Slug normalization | Manual string transforms scattered | Zod `.trim().toLowerCase()` in schema | One place, composable, testable |
| Associate-session linkage | Manual ID lookup + update | Prisma `connect` on relation in session create | Type-safe, handles FK constraints cleanly |
| Auth guard on profile route | Custom middleware/checks | Existing `isAuthenticatedSession()` helper | Already battle-tested, matches all other protected routes |

**Key insight:** The upsert pattern eliminates the need for a "does this associate exist?" check-then-insert sequence, which would be a race condition in a concurrent environment.

---

## Common Pitfalls

### Pitfall 1: Slug Not Reaching the API

**What goes wrong:** Slug is captured in dashboard local state but not passed to `createSession`, so `session.associateSlug` is `undefined` and the session saves anonymously.

**Why it happens:** `candidateName` and `interviewerName` are local state in `DashboardPage` — easy to forget to thread `associateSlug` through `createSession`'s signature and into `set({ session: ... })`.

**How to avoid:** Extend `createSession` signature with `associateSlug?: string` parameter in the same diff as adding the field to `InterviewSession`. The TypeScript compiler will surface missing usages.

**Warning signs:** `/api/history` POST receives sessions with `associateSlug: undefined` even when slug was entered — check `handleStartInterview` passes the value.

### Pitfall 2: Associate Record Created with Wrong displayName

**What goes wrong:** First session for slug "jsmith" has no `candidateName` (trainer forgot). Associate record created with `displayName: null`. Later sessions have candidateName but the `upsert` `update` block blindly overwrites with `undefined`.

**How to avoid:** In the upsert `update` block, only set `displayName` when `session.candidateName` is a non-empty string. Use conditional spread or explicit `undefined` exclusion.

**Warning signs:** Associates show up with `null` display names even after sessions with candidate names.

### Pitfall 3: Profile Page Auth Redirect Loop

**What goes wrong:** `/associate/[slug]` calls `isAuthenticatedSession()` which reads cookies — works in Server Components in Next.js 15+, but the import path for `cookies()` must come from `next/headers`, not from a client module.

**How to avoid:** Follow the exact pattern in `src/lib/auth-server.ts` (already imports from `next/headers`). Import `isAuthenticatedSession` from `@/lib/auth-server` in the Server Component.

**Warning signs:** TypeScript error "cookies() called in client context" or auth guard not working on profile page.

### Pitfall 4: Slug Normalization Mismatch

**What goes wrong:** Trainer enters "John-Doe" in setup. Client lowercases to "john-doe" and stores in Zustand. But if slug is read back from Zustand state (e.g. from a resumed session), it may still be the un-normalized original value if normalization only happens on submit.

**How to avoid:** Normalize the slug at the point of Zustand state write (on `setAssociateSlug` action), not only on form submit. Zod `.transform(val => val.toLowerCase().trim())` is the cleanest approach.

**Warning signs:** Two Associate records created for "John-Doe" and "john-doe" slugs.

### Pitfall 5: Associate Upsert Fails Silently in Dual-Write Error Path

**What goes wrong:** Associate upsert succeeds but the subsequent Session Prisma write fails. The associate record now exists but has no sessions linked.

**How to avoid:** Log the failure. The next session for the same slug will upsert the existing associate (no duplicate) and the session will link correctly. This is acceptable eventual consistency — the associate record is not "dirty", just has zero sessions temporarily.

**Warning signs:** Associate profile page shows no sessions for a known slug despite sessions having been saved.

---

## Code Examples

### Prisma Schema Addition
```prisma
// Source: [ASSUMED] — Prisma schema syntax from training knowledge
// Add to prisma/schema.prisma (after Session model from Phase 2)

model Associate {
  id          Int       @id @default(autoincrement())
  slug        String    @unique
  displayName String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  sessions    Session[]
}

// In Session model (from Phase 2), add:
// associateId  Int?
// associate    Associate? @relation(fields: [associateId], references: [id])
```

### Dashboard Wizard — Slug Input Field
```tsx
// Source: [VERIFIED: dashboard/page.tsx inspection] — matches existing candidateName pattern
// In renderPhase2() alongside the candidateName input:

const [associateSlug, setAssociateSlug] = useState('');
const [slugError, setSlugError] = useState<string | null>(null);

const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const raw = e.target.value;
  const normalized = raw.toLowerCase().trim();
  setAssociateSlug(normalized);
  // Inline validation
  if (normalized && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) {
    setSlugError('Only lowercase letters, numbers, and hyphens');
  } else {
    setSlugError(null);
  }
};

// JSX (same glass-card styling as candidateName):
<div className="space-y-2">
  <label className="text-sm text-gray-300">
    Associate ID <span className="text-gray-500">(optional)</span>
  </label>
  <input
    type="text"
    value={associateSlug}
    onChange={handleSlugChange}
    placeholder="e.g. jane-doe"
    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white outline-none focus:border-indigo-500 transition-colors"
  />
  {slugError && <p className="text-xs text-red-400">{slugError}</p>}
  <p className="text-xs text-gray-500">Links this session to an associate's history</p>
</div>
```

### Extending createSession Signature
```typescript
// Source: [VERIFIED: interviewStore.ts inspection]
// Current signature (line 41-48 of interviewStore.ts):
createSession: (
  questions: ParsedQuestion[],
  questionCount: number,
  selectedWeeks: number[],
  candidateName?: string,
  interviewerName?: string,
  interviewLevel?: 'entry' | 'experienced'
) => void;

// Extended signature — add associateSlug as last optional param:
createSession: (
  questions: ParsedQuestion[],
  questionCount: number,
  selectedWeeks: number[],
  candidateName?: string,
  interviewerName?: string,
  interviewLevel?: 'entry' | 'experienced',
  associateSlug?: string     // NEW
) => void;
```

### History POST — Associate Upsert
```typescript
// Source: [ASSUMED] — Prisma upsert + Phase 2 dual-write pattern
// In /api/history POST handler, after file write, inside the Prisma write block:

let associateId: number | null = null;

if (session.associateSlug) {
  try {
    const associate = await prisma.associate.upsert({
      where: { slug: session.associateSlug },
      update: session.candidateName
        ? { displayName: session.candidateName }
        : {},
      create: {
        slug: session.associateSlug,
        displayName: session.candidateName ?? null,
      },
    });
    associateId = associate.id;
  } catch (associateErr) {
    console.error('Associate upsert failed:', associateErr);
    // Do not fail the request — file write already succeeded
  }
}

// Pass associateId into the Session create/upsert:
await prisma.session.upsert({
  where: { id: session.id },
  update: { /* ... session fields ... */, associateId },
  create: { /* ... session fields ... */, associateId },
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Next.js `getServerSideProps` for data fetching | App Router Server Components import Prisma directly | Next.js 13+ | No API route needed for `/associate/[slug]` read |
| `params` as `Promise<{ slug: string }>` in Next.js 15 | Must `await params` in async Server Components | Next.js 15 breaking change | Profile page must `await params` before accessing `slug` |

**Next.js 15 params change:** In Next.js 15+ App Router, route params in Server Components are async — `params` is a `Promise`. Must use `const { slug } = await params` not `params.slug` directly. [ASSUMED — based on Next.js 15 breaking changes in training knowledge; verify against actual Next.js 16.1.1 behavior during implementation]

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Prisma `upsert` with `@@unique(slug)` is atomic — no race condition between check and insert | Architecture Patterns, Don't Hand-Roll | Low: single-trainer use case means concurrent sessions with same slug are unlikely, but an explicit `try/catch` around upsert handles the edge case |
| A2 | Next.js 16 (based on Next.js 15) requires `await params` in async Server Components | State of the Art | Medium: if wrong, `params.slug` will be a Promise object, not a string — easy to detect in dev |
| A3 | Prisma singleton from Phase 1 is importable as `@/lib/db` in Server Components | Architecture Patterns | Low: if path differs, it's a one-line fix; Phase 1 plan will document the exact export path |
| A4 | `isAuthenticatedSession()` works correctly when called from a Server Component (not API route) | Common Pitfalls, Code Examples | Low: `auth-server.ts` already uses `next/headers` `cookies()` which is designed for Server Components |

**If this table is empty:** N/A — 4 assumed claims identified above.

---

## Open Questions

1. **Phase 1 Prisma singleton export path**
   - What we know: Phase 1 will create the Prisma client singleton in `src/lib/`
   - What's unclear: Exact filename (`db.ts` vs `prisma.ts` vs `prismaClient.ts`)
   - Recommendation: Phase 3 plan should reference "the Phase 1 Prisma singleton" without hardcoding the path; executor reads Phase 1 plan to confirm filename before implementing

2. **Phase 2 Session Prisma schema field names**
   - What we know: Phase 2 defines the full Session Prisma schema (D-02 in Phase 2 CONTEXT)
   - What's unclear: Exact column names for `overallTechnicalScore`, `overallSoftSkillScore` in the DB schema — may be snake_case in DB
   - Recommendation: Profile page SELECT query should align with Phase 2 schema; Phase 3 executor must read Phase 2 PLAN before writing the Prisma query

3. **`await params` behavior in Next.js 16.1.1**
   - What we know: Next.js 15 made params async
   - What's unclear: Whether `next@16.1.1` maintains this behavior or reverts
   - Recommendation: Test in dev immediately after creating the route; adjust if `params` is synchronous

---

## Environment Availability

Step 2.6: SKIPPED — Phase 3 has no new external dependencies. All tools (Prisma, Zustand, Next.js, Zod) are either already installed or installed by Phase 1. The phase is code/config changes only.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — no test config files found in repo [VERIFIED: Glob scan] |
| Config file | None — Wave 0 must add framework |
| Quick run command | TBD — Wave 0 decision |
| Full suite command | TBD — Wave 0 decision |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PERSIST-02 | Slug input captured in dashboard wizard | manual / e2e | Playwright — `npm run test:e2e` (if configured) | Wave 0 |
| PERSIST-02 | `Associate` upsert creates new record for unknown slug | unit | `jest/vitest test associateUpsert` | Wave 0 |
| PERSIST-02 | `Associate` upsert attaches session to existing associate for known slug | unit | `jest/vitest test associateUpsert` | Wave 0 |
| PERSIST-02 | Anonymous session (no slug) saves without error, no associate record created | unit | `jest/vitest test anonymousSession` | Wave 0 |
| PERSIST-02 | `/associate/[slug]` returns 401 for unauthenticated requests | integration | Route handler test | Wave 0 |
| PERSIST-02 | `/associate/[slug]` returns 404 for unknown slug | integration | Route handler test | Wave 0 |
| PERSIST-02 | `/associate/[slug]` shows all sessions for known slug | integration | Route handler test | Wave 0 |
| PERSIST-02 | Slug with uppercase letters is normalized to lowercase before save | unit | `jest/vitest test slugValidation` | Wave 0 |

### Sampling Rate
- **Per task commit:** Unit tests for the changed module
- **Per wave merge:** All unit + integration tests green
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/associate-upsert.test.ts` — covers associate create/find/link logic
- [ ] `tests/slug-validation.test.ts` — covers Zod slug schema
- [ ] `tests/associate-profile.test.ts` — covers route auth guard + query
- [ ] Test framework install: no test runner detected — recommend `vitest` (compatible with Next.js 16 + TypeScript 5, no separate tsconfig needed)

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Existing `isAuthenticatedSession()` cookie guard — profile route must use it |
| V3 Session Management | no | No new session management introduced |
| V4 Access Control | yes | Profile route must be trainer-only; no associate self-service access |
| V5 Input Validation | yes | Zod slug schema validates format before DB write |
| V6 Cryptography | no | No new crypto surface |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Slug enumeration (brute-force `/associate/alice`, `/associate/bob`) | Information Disclosure | Route requires `isAuthenticatedSession()` — unauthenticated requests get 401/redirect |
| Slug injection (SQL via slug field) | Tampering | Prisma parameterized queries — slug value never interpolated into raw SQL |
| Overlong slug DoS | DoS | Zod `.max(64)` on slug schema — reject before DB query |
| Anonymous session incorrectly linked to associate | Tampering | Server-side: only run upsert when `associateSlug` is present and passes Zod validation |

---

## Sources

### Primary (HIGH confidence)
- `src/store/interviewStore.ts` [VERIFIED: direct file read] — candidateName pattern, createSession signature, Zustand persist structure
- `src/app/dashboard/page.tsx` [VERIFIED: direct file read] — renderPhase2 wizard panel, candidateName local state pattern, handleStartInterview
- `src/app/api/history/route.ts` [VERIFIED: direct file read] — POST handler structure, file-write pattern, auth guard
- `src/lib/types.ts` [VERIFIED: direct file read] — InterviewSession shape, existing optional fields
- `src/lib/auth-server.ts` [VERIFIED: direct file read] — isAuthenticatedSession implementation
- `package.json` [VERIFIED: direct file read] — no Prisma or zod installed yet
- `.planning/phases/03-associate-profiles/03-CONTEXT.md` [VERIFIED: direct file read] — all locked decisions
- `.planning/phases/02-session-persistence/02-CONTEXT.md` [VERIFIED: direct file read] — dual-write pattern, Session schema decisions
- `CLAUDE.md` [VERIFIED: direct file read] — technology stack, Prisma versions, zod requirement, DESIGN.md mandate
- `DESIGN.md` [VERIFIED: direct file read] — visual direction for profile page UI

### Secondary (MEDIUM confidence)
- Next.js App Router Server Component data fetching pattern — standard documented pattern, consistent with Next.js 15/16 direction [ASSUMED — not verified against Next.js 16.1.1 docs in this session]
- Prisma `upsert` atomicity with unique constraint — well-established Prisma pattern [ASSUMED — not verified against Prisma 7.7.0 docs in this session]

### Tertiary (LOW confidence)
- Next.js 16 `await params` requirement — carried forward from Next.js 15 breaking change; needs verification at implementation time

---

## Project Constraints (from CLAUDE.md)

| Directive | Impact on Phase 3 |
|-----------|-------------------|
| Prisma 7.7.0 + @prisma/client 7.7.0 | Schema must use Prisma 7 syntax |
| zod 4.3.6 for validation | Slug validation uses Zod 4 API |
| No new deps beyond stack | Phase 3 adds zero new packages |
| Backwards compatible | `associateSlug` is optional on `InterviewSession` — existing flows unchanged |
| Dual-write in `/api/history` POST | Associate upsert happens in same handler, same error-boundary pattern |
| DESIGN.md must be read before UI | Profile page uses warm editorial design system: DM Sans body, Clash Display for names/scores, `--surface` cards, `--accent` (#C85A2E) CTAs, no glass morphism, no glow |
| Auth: single-password HttpOnly cookie | `/associate/[slug]` uses `isAuthenticatedSession()` redirect pattern |
| Codex owns code review | No self-review — submit to Codex after implementation |
| GSD owns planning | This research feeds the planner, not direct implementation |

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already locked, no new choices
- Architecture: HIGH — clear precedent from existing codebase patterns; upsert-on-save is idiomatic Prisma
- Pitfalls: MEDIUM — slug threading and Next.js params behavior are LOW individually, overall MEDIUM
- Security: HIGH — threats are well-understood, mitigations are standard

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (stable stack — 30 days)
