# Phase 9: Associate PIN Auth - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning
**Mode:** --auto (auto-selected all recommended defaults)

<domain>
## Phase Boundary

Add a lightweight PIN-based auth system for associates that coexists with the existing single-password trainer auth. Trainer generates a 6-digit PIN per associate (displayed once, stored hashed). Associate enters PIN at the public interview entry to create an `associate_session` HttpOnly cookie. Middleware is refactored to enumerate identity (`trainer | associate | anonymous`) with strictly separate cookie namespaces. `/associate/[slug]` becomes auth-guarded — matching associate session OR trainer session grants access; mismatched slugs return 403; unauthenticated requests redirect to PIN entry.

Implements AUTH-01, AUTH-02, AUTH-03, AUTH-04. Depends on Phase 8 (schema foundation). Does NOT wire the authenticated interview pipeline — that is Phase 10.

</domain>

<decisions>
## Implementation Decisions

### PIN Generation & Storage
- **D-01:** PIN is 6-digit numeric, generated with `crypto.randomInt(0, 1_000_000)` and zero-padded. Uniform distribution, no modulo bias.
- **D-02:** PINs are stored hashed using `bcryptjs` (pure JS — no native build step, works in Docker Alpine). Cost factor 10 (fast enough for trainer generation, slow enough to resist brute force).
- **D-03:** Store on `Associate` model: add nullable `pinHash String?` and `pinGeneratedAt DateTime?`. Nullable because existing v1.0 associates have no PIN until one is assigned.
- **D-04:** The plaintext PIN is returned to the trainer **once** in the generation response and never persisted or re-derivable. Regeneration overwrites `pinHash` and resets `pinGeneratedAt`.
- **D-05:** No PIN expiry in v1.1 (out of scope — deferred to v1.2 rotation). Trainer regenerates manually if compromised.

### Cookie & Session
- **D-06:** Cookie name: `associate_session`. Strictly separate namespace from `nlm_session` (trainer). No cookie reuse, no role field.
- **D-07:** Cookie attributes: `HttpOnly`, `Secure` (prod only), `SameSite=Strict`, `Path=/`, `Max-Age=86400` (24 hours — matches trainer session duration for consistency).
- **D-08:** Cookie value is an opaque signed token: `{associateId}.{signature}` where signature = HMAC-SHA256 over `associateId + issuedAt` using `APP_PASSWORD` as key (same secret already present in env — no new env var in this phase). Format: base64url-encoded JSON `{aid, iat, sig}`.
- **D-09:** No JWT library. Hand-rolled HMAC via Node `crypto` — minimal surface area. If token tampered or signature mismatches, treat as anonymous.

### Middleware Identity Enum
- **D-10:** Introduce `src/lib/identity.ts` exporting `getCallerIdentity(request): { type: 'trainer' | 'associate' | 'anonymous', associateId?: number }`. Reads both cookies; trainer cookie takes precedence if both present (trainers impersonating associates is out of scope — treat as trainer).
- **D-11:** Middleware becomes a per-path permission table. Trainer-only paths (`/dashboard`, `/interview`, `/review`, `/trainer`, `/trainer/*`) require `type === 'trainer'`. Associate-accessible paths (`/associate/*`, `/interview/public/pin`) require `type === 'associate' | 'trainer'`.
- **D-12:** Violations on trainer paths while holding only associate cookie → redirect to `/login` (trainer login), NOT 200 and NOT silent pass. `/associate/[slug]` slug mismatch → 403 page (handled in route handler, not middleware, since middleware doesn't know DB identity-to-slug mapping without a query).
- **D-13:** Existing `isAuthenticatedSession()` in `auth-server.ts` remains **trainer-only** (do not broaden). Add sibling `isAssociateAuthenticated()` and `getAssociateIdentity()` helpers. Protects existing trainer routes from silent privilege confusion.

### API Endpoints
- **D-14:** `POST /api/associate/pin/generate` — trainer-auth-only. Body: `{ associateId }`. Response: `{ pin: "123456" }` (one-time). Regenerate-on-repeat supported.
- **D-15:** `POST /api/associate/pin/verify` — public (rate-limited). Body: `{ slug, pin }`. Looks up associate by slug, compares hash. On success: issues `associate_session` cookie, returns `{ ok: true, slug }`. On failure: returns `{ ok: false }` with 401.
- **D-16:** `POST /api/associate/logout` — clears `associate_session` cookie. Public.
- **D-17:** PIN verification endpoint rate-limited via existing `rateLimitService.ts` pattern: 5 failed attempts per fingerprint per 15 min, then 429. Successful verification resets the counter for that fingerprint.

### PIN Entry UI
- **D-18:** New route `/associate/login` (dedicated, separate from trainer `/login` per pitfall guidance). Page accepts `slug` and `pin`. Success redirects to `?next=` param or `/associate/{slug}`.
- **D-19:** Trainer dashboard gets a "Generate PIN" button per associate row (in `/trainer` roster OR `/trainer/[slug]` detail). Button calls `/api/associate/pin/generate` and shows the PIN in a modal with copy-to-clipboard + clear "shown once" warning.
- **D-20:** Styling is utilitarian for this phase — Tailwind-only, matches existing trainer UI visual language. Full DESIGN.md cohesion is Phase 14.

### `/associate/[slug]` Auth Guard
- **D-21:** Server component checks `getCallerIdentity()`. Rules:
  - `trainer` → allow (trainers view any associate)
  - `associate` with matching `associateId → slug` → allow
  - `associate` with mismatched slug → return 403
  - `anonymous` → redirect to `/associate/login?next=/associate/{slug}`
- **D-22:** Slug-to-associateId lookup uses the existing Associate query — add a small helper `getAssociateIdBySlug(slug)` in `src/lib/associateService.ts` (create if absent) to keep the guard check clean.

### Security Posture
- **D-23:** No slug enumeration protection in this phase (slugs are not secrets in v1.0). Associate-existence oracle via PIN endpoint is mitigated by rate limiting.
- **D-24:** Constant-time PIN comparison via `bcrypt.compare()` (built-in timing-safe).
- **D-25:** Never log PINs. Never return PIN in any response except the single generation response. Verification endpoint never echoes PIN back.

### Claude's Discretion
- Exact visual treatment of PIN display modal (copy button position, auto-dismiss timing).
- Error message wording on PIN verification failures (balance clarity vs. enumeration protection).
- Whether to add a trainer UI confirmation before PIN regeneration (minor UX polish).
- File layout under `src/app/api/associate/` — one folder per route is preferred but planner may consolidate.

</decisions>

<specifics>
## Specific Ideas

- Cookie signing reuses `APP_PASSWORD` as HMAC secret — avoids new env var in this phase. If/when associate auth scales, swap to dedicated `ASSOCIATE_SESSION_SECRET`.
- `bcryptjs` over `bcrypt` — no native module compilation, works cleanly with Next.js standalone output + node:22-alpine Docker image.
- Keep middleware synchronous and fast. No DB queries in middleware. Identity resolution is cookie-only; DB validation happens in route handlers and server components.
- Write route handlers as server-only modules. No client bundles should import hashing or cookie-signing code.

</specifics>

<canonical_refs>
## Canonical References

### Phase Foundations
- `.planning/ROADMAP.md` §"Phase 9: Associate PIN Auth" — goal, success criteria
- `.planning/REQUIREMENTS.md` §Auth — AUTH-01..04
- `.planning/research/ARCHITECTURE.md` §"Auth" sections — existing pattern + v1.1 guidance
- `.planning/research/PITFALLS.md` §Pitfall 1-3 — middleware conflation, slug origin, IDOR on public endpoint
- `.planning/phases/08-schema-migration/08-CONTEXT.md` — additive migration strategy (this phase follows same posture)

### Existing Code Anchors
- `src/middleware.ts` — current single-cookie protected-paths pattern (will be refactored)
- `src/lib/auth-server.ts` — `isAuthenticatedSession()` (remains trainer-only)
- `src/lib/auth-context.tsx` — trainer client auth hook (unchanged)
- `prisma/schema.prisma` — `Associate` model gets `pinHash`, `pinGeneratedAt`
- `src/lib/rateLimitService.ts` — existing fingerprint rate limit, reused for PIN verification
- `src/app/associate/[slug]/page.tsx` — current public profile page (becomes auth-guarded)

### External Libraries
- `bcryptjs` ^2.4.3 — pure-JS bcrypt
- Node `crypto` built-in — `randomInt`, `createHmac`, `timingSafeEqual`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `rateLimitService.ts` fingerprint pattern — apply to PIN verify endpoint directly.
- `isAuthenticatedSession()` — keep as trainer-only; add sibling helpers for associate.
- Prisma singleton (`src/lib/prisma.ts`) — use for all associate lookups.

### Established Patterns
- HttpOnly cookie set via `Response` header in route handlers (existing trainer pattern in `/api/auth`).
- `cookies()` from `next/headers` for server component reads.
- Middleware reads `request.cookies.get(name)` — stay consistent.

### Integration Points
- `/trainer` roster page — add "Generate PIN" action.
- `/associate/[slug]/page.tsx` — add server-side identity guard.
- `src/middleware.ts` — replace protected-paths array with per-identity permission map.

### Files This Phase Touches
- `prisma/schema.prisma` (add fields)
- `src/lib/pinService.ts` (new)
- `src/lib/associateSession.ts` (new — cookie signing/verifying)
- `src/lib/identity.ts` (new — `getCallerIdentity`)
- `src/lib/auth-server.ts` (add associate helpers)
- `src/middleware.ts` (refactor)
- `src/app/api/associate/pin/generate/route.ts` (new)
- `src/app/api/associate/pin/verify/route.ts` (new)
- `src/app/api/associate/logout/route.ts` (new)
- `src/app/associate/login/page.tsx` (new)
- `src/app/associate/[slug]/page.tsx` (guard)
- `src/app/trainer/` — add generate-PIN UI control

</code_context>

<deferred>
## Deferred Ideas

- PIN expiry / rotation policy — v1.2.
- Magic-link / OTP auth for associates — v1.2 (AUTH-FUTURE-01).
- Associate password reset / self-service PIN regeneration — out of scope (trainer-mediated only).
- Full DESIGN.md styling of PIN entry and login pages — Phase 14.
- Per-associate lockout after N failures (vs. fingerprint) — acceptable trade-off for v1.1; fingerprint is sufficient.
- Wiring authenticated associate sessions into the automated interview complete pipeline — Phase 10 (PIPE-01, PIPE-02).
- Dedicated `ASSOCIATE_SESSION_SECRET` env var — deferred; reuse `APP_PASSWORD` for v1.1.

</deferred>

---

*Phase: 09-associate-pin-auth*
*Context gathered: 2026-04-14 (--auto mode)*
