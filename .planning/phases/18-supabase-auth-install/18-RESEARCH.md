# Phase 18: Supabase Auth Install — Research

**Researched:** 2026-04-15
**Domain:** Supabase Auth (@supabase/ssr + @supabase/supabase-js), Next.js 16 App Router middleware, PKCE magic links, Resend delivery
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Supabase Auth is the sole auth provider. Email/password for trainer/admin; magic link (PKCE, 7-day expiry, Resend delivery) for associates.
- Three roles: `admin` | `trainer` | `associate` stored in `auth.users.user_metadata.role`.
- PIN grace flag REMOVED from scope. `getCallerIdentity()` reads Supabase session only — no legacy PIN path.
- PIN files (`pinService.ts`, `pinAttemptLimiter.ts`, `associateSession.ts`, `/api/associate/pin/*`) remain untouched — Phase 25 owns deletion.
- Admin seeded manually via Supabase dashboard. Admin-promote UI deferred to Phase 21.
- Magic link: PKCE enabled, 7-day expiry, delivered via Resend using `admin.generateLink` (not Supabase SMTP).
- Callback path: `/auth/callback`.
- Password reset: via Resend, rate limited 3/hr/email + 10/hr/IP, flag at 5/day to ADMIN_EMAILS. Advisory only.
- Self-serve magic link rate limits: 3/hr/email + 10/hr/IP (mirrors reset limits).
- Middleware: session refresh BEFORE route guard; refresh failure bounces to `/signin`. Return same mutated `NextResponse`.
- Boot-time assert: `NEXT_PUBLIC_SITE_URL` must not be localhost in production. Fail fast.
- Three Supabase client files: `src/lib/supabase/server.ts`, `src/lib/supabase/middleware.ts`, `src/lib/supabase/admin.ts`.
- `getCallerIdentity()` returns `{ kind: 'admin' | 'trainer' | 'associate' | 'anonymous', userId?, email?, associateSlug? }`.
- Associate linkage: `Associate.authUserId` FK (added in Phase 17).
- `AuthEvent` table for rate-limit abuse logging.
- Deduplicate flag emails (no re-send to same admin within 24h).

### Claude's Discretion

- Exact file layout for reset/magic-link rate-limit storage (suggest Supabase table or in-memory+DB hybrid matching `rateLimitService.ts` pattern).
- Resend email template HTML/text content (follow DESIGN.md language).
- Route handler paths: suggest `/api/auth/reset/request` + `/auth/callback?type=recovery`.
- Sign-in form UX: error messages, loading states, "Check your email" copy.
- `requireRole('admin')` helper placement.
- Where `AuthEvent` table stores abuse log (suggest lightweight Prisma model).

### Deferred Ideas (OUT OF SCOPE)

- Admin-promote UI → Phase 21.
- `/trainer/*` → `/app/*` route restructure → Phase 21.
- Bulk invite UI at `/trainer/onboarding` → Phase 19.
- RLS policies on Session/GapScore/Cohort/CurriculumWeek → Phase 20.
- Removal of trainer-password legacy auth code → Phase 20.
- PIN code deletion → Phase 25.
- OAuth providers (Google, GitHub) — future.
- Passkey/WebAuthn — future.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-05 | Install `@supabase/ssr` + `@supabase/supabase-js`. Scaffold `src/lib/supabase/{server,middleware,admin}.ts`. Add 4 env vars. Boot-time assert on `NEXT_PUBLIC_SITE_URL`. | Standard Stack section; Package Versions; Boot Assert Pattern |
| AUTH-06 | Trainer signs in via Supabase email/password at `/signin`. Session refresh in middleware BEFORE route guard; mutated `NextResponse` returned. | Middleware Pattern; SignInTabs Replacement; `getCallerIdentity` Rewrite |
| AUTH-07 | Associate requests magic link at `/signin`. PKCE. 7-day expiry. Delivered via Resend via `admin.generateLink`. `/auth/callback` handles PKCE exchange. | Magic Link Pattern; Resend Delivery; PKCE Callback Route |
| AUTH-08 | `getCallerIdentity()` reads Supabase session as sole source; no PIN fallback; returns `trainer \| associate \| anonymous` shape. | Identity Rewrite; Associate Linkage via `authUserId` |
</phase_requirements>

---

## Summary

Phase 18 is a **greenfield Supabase Auth install** — neither `@supabase/supabase-js` nor `@supabase/ssr` are in `package.json` today. [VERIFIED: package.json direct read] The install adds two packages and scaffolds three client files. No migration of existing data is required for this phase; `Associate.authUserId` was added as a nullable field in Phase 17 and will be backfilled during Phase 19 bulk invite.

The main complexity is the **middleware rewrite**: current `src/middleware.ts` is purely cookie-based and synchronous-feeling. It must be replaced with a Supabase session refresh pattern that mutates `NextResponse` before the route guard runs — the #1 footgun in Supabase+Next.js integrations. The `getCallerIdentity()` function in `src/lib/identity.ts` is fully replaced: it drops `NextRequest` (moves to `cookies()` from `next/headers`) and resolves identity from the Supabase session.

The `SignInTabs` component undergoes the most visible change: the Trainer tab switches from single-password (`nlm_session` cookie via `/api/auth`) to Supabase `signInWithPassword`; the Associate tab switches from 6-digit PIN to email + magic link request. The `AuthProvider` / `useAuth()` context is replaced by Supabase browser client's `onAuthStateChange`.

**Primary recommendation:** Install `@supabase/ssr@0.10.2` + `@supabase/supabase-js@2.103.2` (current npm latest), scaffold three clients following the exact Supabase Next.js App Router canonical pattern, rewrite middleware + identity in a single atomic wave, and replace SignInTabs in the same wave.

---

## Standard Stack

### Core (new installs)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/ssr` | `0.10.2` | Cookie-aware Supabase clients for Next.js server components, route handlers, middleware | The replacement for deprecated `@supabase/auth-helpers-nextjs`. Provides `createServerClient` + `createBrowserClient` with correct cookie adapters. Only way to get SSR-safe Supabase auth in Next.js 16 App Router. |
| `@supabase/supabase-js` | `2.103.2` | Supabase JS SDK; used for admin API (`generateLink`, `createUser`), browser client (`signInWithPassword`, `signInWithOtp`), auth state listener | Core Supabase SDK. Admin operations require this; `@supabase/ssr` wraps it for SSR context. |

[VERIFIED: `npm view @supabase/ssr version` → `0.10.2`, `npm view @supabase/supabase-js version` → `2.103.2`]

### Already in Stack (no changes)

| Library | Version | Role in Phase 18 |
|---------|---------|-----------------|
| `resend` | `^6.10.0` | Email delivery for magic links + password reset. Use existing client config; add new email templates. |
| `zod` | `^4.3.6` | Validate `/api/auth/magic-link` + `/api/auth/reset/request` request bodies |
| `next` | `^16.2.3` | App Router `cookies()`, `NextRequest`/`NextResponse`, `middleware.ts` |
| Prisma | `^7.7.0` | Associate lookup by `authUserId` FK in `getCallerIdentity` |

### Installation

```bash
npm install @supabase/supabase-js@2.103.2 @supabase/ssr@0.10.2
```

**Post-install verification:**
```bash
npx tsc --noEmit   # confirm no type regressions
npm run build      # confirm standalone Docker output resolves
```

---

## Architecture Patterns

### Recommended File Structure (Phase 18 additions)

```
src/
├── lib/
│   ├── supabase/
│   │   ├── server.ts      # createServerClient for Server Components + Route Handlers
│   │   ├── middleware.ts   # createServerClient variant for src/middleware.ts
│   │   └── admin.ts        # service-role client — server-only, never browser
│   ├── identity.ts         # REPLACE body — Supabase session → CallerIdentity
│   ├── env.ts              # NEW — boot-time env assertions
│   └── authRateLimit.ts    # NEW — magic-link + reset rate limiter
├── app/
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts    # NEW — PKCE code exchange → session
│   ├── api/
│   │   ├── auth/
│   │   │   ├── route.ts    # KEEP existing trainer-password flow (not deleted until Phase 20)
│   │   │   ├── magic-link/
│   │   │   │   └── route.ts  # NEW — associate self-serve magic link request
│   │   │   └── reset/
│   │   │       └── request/
│   │   │           └── route.ts  # NEW — trainer password reset request
│   └── signin/
│       └── SignInTabs.tsx  # REPLACE: Trainer tab → email/password; Associate tab → magic link
├── instrumentation.ts      # EXTEND — add boot-time env assert call
└── middleware.ts            # REWRITE — Supabase session refresh BEFORE route guard
```

### Pattern 1: Supabase Server Client (Route Handlers + Server Components)

```typescript
// src/lib/supabase/server.ts
// Source: @supabase/ssr docs + ARCHITECTURE.md VERIFIED pattern
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component read-only context — ignore writes
            // Session persistence happens in middleware
          }
        },
      },
    }
  );
}
```

[CITED: supabase.com/docs/guides/auth/server-side/nextjs — canonical Next.js App Router pattern]

### Pattern 2: Middleware Client (CRITICAL — mutate same response)

```typescript
// src/lib/supabase/middleware.ts
// Source: ARCHITECTURE.md + PITFALLS.md (Pitfall 2 + 3)
import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

export async function createSupabaseMiddlewareClient(request: NextRequest) {
  // CRITICAL: create response ONCE and mutate it throughout
  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write to BOTH request (for downstream server components) AND response
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // THIS must come BEFORE route guard. Refreshes token and writes new cookies.
  const { data: { user } } = await supabase.auth.getUser();

  return { supabase, user, response };
}
```

### Pattern 3: Admin Client (Service-Role — Server-Only)

```typescript
// src/lib/supabase/admin.ts
import 'server-only';
import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
```

`import 'server-only'` causes a build error if this module is ever imported from a Client Component. [CITED: Next.js server-only package docs]

### Pattern 4: Middleware Rewrite (auth THEN guard)

```typescript
// src/middleware.ts — full replacement
import { createSupabaseMiddlewareClient } from '@/lib/supabase/middleware';
import { NextResponse, type NextRequest } from 'next/server';

const TRAINER_PATHS = ['/dashboard', '/interview', '/review', '/trainer'];
const ASSOCIATE_PATH = '/associate';
const PUBLIC_PATHS = ['/', '/signin', '/auth/callback', '/associate/login'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths — still need session refresh but no guard
  const isPublic = PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(`${p}/`));

  // STEP 1: Always refresh Supabase session — mutates response cookies
  const { user, response } = await createSupabaseMiddlewareClient(request);
  const role = user?.user_metadata?.role ?? (user ? 'associate' : null);

  if (isPublic) return response;

  // STEP 2: Trainer-only paths
  if (TRAINER_PATHS.some(p => pathname === p || pathname.startsWith(`${p}/`))) {
    if (role === 'trainer' || role === 'admin') return response;
    const url = new URL('/signin', request.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // STEP 3: Associate paths
  if (pathname.startsWith(ASSOCIATE_PATH)) {
    if (user) return response; // trainer or associate both allowed
    const url = new URL('/signin', request.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // STEP 4: Refresh failure or anything else — bounce to /signin
  if (!user) {
    return NextResponse.redirect(new URL('/signin', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/interview/:path*',
    '/review/:path*',
    '/trainer/:path*',
    '/associate/:path*',
  ],
};
```

**CRITICAL:** Return the same `response` object returned by `createSupabaseMiddlewareClient`. Do NOT create a new `NextResponse.next()` — it discards the refreshed session cookies. [PITFALLS.md Pitfall 2, Anti-Pattern 4 in ARCHITECTURE.md]

### Pattern 5: getCallerIdentity Replacement

```typescript
// src/lib/identity.ts — full replacement
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export type CallerIdentity =
  | { kind: 'admin';     userId: string; email: string }
  | { kind: 'trainer';   userId: string; email: string }
  | { kind: 'associate'; userId: string; email: string; associateId: number; associateSlug: string }
  | { kind: 'anonymous' };

export async function getCallerIdentity(): Promise<CallerIdentity> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { kind: 'anonymous' };

  const role = user.user_metadata?.role ?? 'associate';

  if (role === 'admin') {
    return { kind: 'admin', userId: user.id, email: user.email! };
  }
  if (role === 'trainer') {
    return { kind: 'trainer', userId: user.id, email: user.email! };
  }

  // Associate: resolve via authUserId FK
  const associate = await prisma.associate.findUnique({
    where: { authUserId: user.id },
    select: { id: true, slug: true },
  });
  if (!associate) return { kind: 'anonymous' };

  return {
    kind: 'associate',
    userId: user.id,
    email: user.email!,
    associateId: associate.id,
    associateSlug: associate.slug,
  };
}
```

**Breaking change from current:** signature drops `NextRequest` parameter. All callers in route handlers/server components must remove the argument. Middleware still uses `user` from `createSupabaseMiddlewareClient` directly (not via `getCallerIdentity`) to avoid double `getUser()` calls. [ARCHITECTURE.md §1.4]

### Pattern 6: PKCE Auth Callback Route

```typescript
// src/app/auth/callback/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const type = searchParams.get('type'); // 'magiclink' | 'recovery'
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Redirect based on type
      if (type === 'recovery') {
        return NextResponse.redirect(new URL('/auth/update-password', origin));
      }
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  // Exchange failed — redirect to error page or signin
  return NextResponse.redirect(new URL('/signin?error=auth-callback-failed', origin));
}
```

[CITED: supabase.com/docs/guides/auth/server-side/nextjs — PKCE code exchange pattern]

### Pattern 7: Admin generateLink for Magic Links

```typescript
// src/app/api/auth/magic-link/route.ts (associate self-serve)
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { Resend } from 'resend';
import { z } from 'zod';
import { checkAuthRateLimit } from '@/lib/authRateLimit';

const schema = z.object({ email: z.string().email() });

export async function POST(request: Request) {
  const body = await request.json();
  const { email } = schema.parse(body);

  // Rate limit: 3/hr/email + 10/hr/IP
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  const limit = await checkAuthRateLimit({ email, ip, type: 'magic-link' });
  if (!limit.allowed) return NextResponse.json({ error: 'Rate limited' }, { status: 429 });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: {
      redirectTo: `${siteUrl}/auth/callback`,
      // 7-day expiry set in Supabase dashboard (OTP expiry setting)
    },
  });

  if (error || !data.properties?.action_link) {
    return NextResponse.json({ error: 'Failed to generate link' }, { status: 500 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: `Next Level Mock <auth@yourdomain.com>`,
    to: email,
    subject: 'Sign in to Next Level Mock',
    html: magicLinkEmailHtml(data.properties.action_link),
  });

  return NextResponse.json({ ok: true });
}
```

**Key detail:** `admin.generateLink({ type: 'magiclink' })` generates a PKCE-compatible link that Supabase validates on callback. Supabase does NOT send the email — we send it via Resend. [CITED: supabase.com/docs/reference/javascript/auth-admin-generatelink]

### Pattern 8: Boot-Time Env Assert

```typescript
// src/lib/env.ts
export function assertProductionEnv(): void {
  if (process.env.NODE_ENV !== 'production') return;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? '';
  const localhostPatterns = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];

  if (!siteUrl || localhostPatterns.some(p => siteUrl.includes(p))) {
    throw new Error(
      `[FATAL] NEXT_PUBLIC_SITE_URL is "${siteUrl}" in production. ` +
      'Set it to the production HTTPS domain before starting the server.'
    );
  }

  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_SITE_URL',
  ];
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`[FATAL] Required env var ${key} is not set.`);
    }
  }
}
```

Call from `src/instrumentation.ts` in the `register()` function (existing boot hook). [VERIFIED: src/instrumentation.ts exists at /Users/jestercharles/mock-interview-assist/src/instrumentation.ts]

### Pattern 9: SignInTabs Replacement Sketch

The current `SignInTabs.tsx` uses:
- Trainer: single password → `/api/auth` POST → `nlm_session` cookie → `useAuth()` context
- Associate: 6-digit PIN → `/api/associate/pin/verify` POST

Phase 18 replaces:
- Trainer: email + password → `supabase.auth.signInWithPassword({ email, password })` (browser client)
- Associate: email field → POST to `/api/auth/magic-link` → "Check your email" confirmation state

`useAuth()` from `auth-context.tsx` is replaced by reading `supabase.auth.getUser()` or `onAuthStateChange`. The `AuthProvider` wraps can be replaced with Supabase's `createBrowserClient` pattern.

**Key: `auth-context.tsx` and `auth-server.ts` are NOT deleted in Phase 18.** Phase 20 deletes legacy trainer-password code. Phase 18 only stops calling into them from the new sign-in surface — the old `/api/auth` route and `nlm_session` cookie remain as parallel infrastructure until Phase 20 removes them.

### Anti-Patterns to Avoid

- **Creating fresh `NextResponse.next()` after session refresh.** [PITFALLS.md Pitfall 2] Session cookies are written onto the response object from `createSupabaseMiddlewareClient`. Returning a new response discards them.
- **Calling `getSession()` instead of `getUser()` in server code.** `getSession()` reads from the cookie without validating with Supabase's server — `getUser()` hits the auth server and is authoritative for server-side decisions.
- **Running route guard before `getUser()`.** The guard will see a stale/expired JWT as anonymous and redirect before the refresh has a chance to run. [PITFALLS.md Pitfall 3]
- **Exposing `SUPABASE_SERVICE_ROLE_KEY` to the browser.** The admin client must use `import 'server-only'`. The service role key bypasses RLS and can delete any user.
- **Hardcoded `emailRedirectTo` in magic link generation.** Always derive from `NEXT_PUBLIC_SITE_URL` env var. [PITFALLS.md Pitfall 10]
- **Using `inviteUserByEmail` for magic links.** That sends via Supabase SMTP (rate-limited, no branding control). Use `generateLink` + Resend. [STACK.md]
- **Removing `import 'server-only'` from admin.ts.** Build will silently include the service role key in client bundles.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session cookie management (chunked, SameSite, rotation) | Custom HttpOnly cookie serialize/parse | `@supabase/ssr` `createServerClient` with `getAll`/`setAll` | Supabase chunks tokens that exceed cookie size limit (4KB). Hand-rolling misses this and causes intermittent "signed out" bugs. |
| JWT validation in middleware | Custom JWKS fetch + `jose` verify | `supabase.auth.getUser()` | `getUser()` validates against Supabase auth server and handles key rotation automatically. |
| Magic link token generation | Custom signed tokens + expiry | `supabaseAdmin.auth.admin.generateLink` | Supabase tracks the token lifecycle, invalidates on use, and enforces expiry via its own DB. |
| PKCE verifier / challenge | Custom `crypto.subtle` PKCE flow | `@supabase/ssr` automatic PKCE via `createServerClient` | SSR package handles code verifier storage in cookies automatically when `flowType: 'pkce'` is set in Supabase project settings. |
| Rate limiting state (auth-specific) | Extend `rateLimitService.ts` file-based store | Lightweight in-memory `Map` + Prisma `AuthEvent` table (per decisions) | File-based store for auth limits adds I/O on every auth request; in-memory handles hot path, DB handles persistence + admin visibility. |
| Email DKIM/SPF authentication | DNS + header hand-roll | Resend verified domain setup (already in stack) | Resend handles DKIM signing automatically once domain is verified. |

---

## Common Pitfalls

### Pitfall 1: Returning Wrong `NextResponse` from Middleware
**What goes wrong:** New `NextResponse.next()` created after Supabase session refresh discards the refreshed cookies. Users see intermittent auth loss after JWT expiry.
**Why it happens:** `setAll` in the cookies adapter writes to the `response` object created inside `createSupabaseMiddlewareClient`. Any new response object does not have those cookies.
**How to avoid:** One response object, created once, returned at every code path. Redirects must forward cookies: `NextResponse.redirect(url, { headers: response.headers })`.
**Warning signs:** Users report being signed out after ~60 minutes despite being active.

### Pitfall 2: Using `getSession()` Instead of `getUser()` Server-Side
**What goes wrong:** `getSession()` reads the cookie JWT without verifying with Supabase's auth server. A tampered or replayed JWT passes server checks.
**Why it happens:** `getSession()` is cheaper; developers use it assuming it's equivalent.
**How to avoid:** Always `getUser()` in server code (middleware, route handlers, server components). `getSession()` is only appropriate in client components where network latency matters more than security.
**Warning signs:** Security audit finds server components accepting unvalidated session claims.

### Pitfall 3: Magic Link Consumed by Email Scanner
**What goes wrong:** Corporate email security proxies (Outlook ATP, Proofpoint) follow every link to scan for malware. Single-use magic link is consumed by the scanner; associate click fails "Link already used."
**Why it happens:** Standard magic links use a one-time token in the URL. PKCE is the mitigation.
**How to avoid:** Enable PKCE flow in Supabase Auth settings. With PKCE, the callback URL contains a `code` parameter that requires the browser's code verifier to exchange — scanner can't complete the exchange.
**Warning signs:** Associates report "link already used" without clicking.

### Pitfall 4: `NEXT_PUBLIC_SITE_URL` Not Set in Production
**What goes wrong:** Magic links in emails point to `http://localhost:3000/auth/callback`. Associates click and get connection refused.
**Why it happens:** Dev env uses localhost; if the env var is missing in production, fallback might use `request.headers.host` which could still be localhost if behind a proxy.
**How to avoid:** Boot-time assert in `instrumentation.ts` rejects localhost in production. Env var is required in `.env.example`. [SC-2 requirement]
**Warning signs:** Build passes but first magic link in prod goes nowhere.

### Pitfall 5: `authUserId` Not Populated for New Users
**What goes wrong:** Associate signs in via magic link successfully (Supabase session valid), but `getCallerIdentity()` returns `anonymous` because `Associate.authUserId` is still null.
**Why it happens:** Phase 17 added the nullable FK but did not backfill. Phase 19 handles bulk backfill. For Phase 18, the `/auth/callback` route must handle the "new Supabase user, no Associate row" case.
**How to avoid:** On PKCE callback completion, check if `Associate.authUserId = user.id` exists. If not, attempt to match by email (`Associate.email = user.email`). If match found, update `authUserId`. If no match, return an informative error (associate not yet onboarded).
**Warning signs:** Associate successfully clicks magic link but sees "anonymous" or 401 on protected routes.

### Pitfall 6: `admin.generateLink` with Default 1-Hour Expiry
**What goes wrong:** Decision says 7-day expiry for magic links. But `generateLink` alone doesn't set expiry — it uses the Supabase project's OTP expiry setting.
**Why it happens:** Per-call expiry override is not supported in all Supabase versions. The dashboard setting is the authoritative control.
**How to avoid:** Set OTP expiry to 604800 seconds (7 days) in Supabase dashboard → Authentication → Email → OTP Expiry. Verify this setting is configured before testing. Document in deployment runbook.
**Warning signs:** Associate reports link expired before they could use it.

### Pitfall 7: Rate Limiter Key Collision Between Reset and Magic-Link
**What goes wrong:** Shared rate-limit key prefix causes password-reset attempts to count against magic-link quota and vice versa.
**Why it happens:** Both use `email` + `ip` composite keys; if namespaced poorly, a trainer doing password reset exhausts the associate's magic-link allowance.
**How to avoid:** Key schema: `auth:magic-link:email:{hash}`, `auth:magic-link:ip:{ip}`, `auth:reset:email:{hash}`, `auth:reset:ip:{ip}`. Separate namespaces per operation type.
**Warning signs:** Rate limit errors appear after fewer attempts than configured.

### Pitfall 8: `getCallerIdentity()` Signature Change Breaks Callers
**What goes wrong:** Current signature is `getCallerIdentity(request: NextRequest)`. New signature takes no arguments (uses `cookies()` from next/headers). Every existing caller in route handlers and server components passes `request` — TypeScript error on every callsite.
**Why it happens:** Necessary API change — `cookies()` from `next/headers` only works in server context, while middleware still needs `NextRequest`.
**How to avoid:** Update all callers in the same PR. Grep: `getCallerIdentity(` to find all 5-10 callsites. Middleware uses `user` from `createSupabaseMiddlewareClient` directly, not `getCallerIdentity`.
**Warning signs:** TypeScript errors flood build output after `identity.ts` is changed before callers are updated.

---

## Code Examples

### Auth Callback (PKCE Exchange)

```typescript
// src/app/auth/callback/route.ts
// Source: Supabase Next.js App Router guide [CITED: supabase.com/docs/guides/auth/server-side/nextjs]
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const type = searchParams.get('type');

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const redirectTo = type === 'recovery'
        ? new URL('/auth/update-password', origin)
        : new URL('/trainer', origin); // or /associate/[slug]/dashboard for associates
      return NextResponse.redirect(redirectTo);
    }
  }
  return NextResponse.redirect(new URL('/signin?error=invalid-link', origin));
}
```

### Supabase Auth Dashboard: Required Configuration

Before testing, set in Supabase dashboard:
- **Auth → URL Configuration:** Add `https://yourdomain.com/**` and `http://localhost:3000/**` to allowed redirects.
- **Auth → Email → OTP Expiry:** Set to `604800` (7 days).
- **Auth → PKCE:** Ensure PKCE is enabled (default on for new projects).
- **Auth → Custom SMTP:** Point to Resend SMTP credentials (`smtp.resend.com`, port 587, API key as password).

[CITED: supabase.com/docs/guides/auth/auth-smtp]

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | ~2023 | Auth Helpers deprecated; `@supabase/ssr` is the replacement with proper `getAll`/`setAll` cookie API |
| `getSession()` for server-side auth | `getUser()` for server-side, `getSession()` client-only | 2024 | `getUser()` validates against Supabase server; `getSession()` is unvalidated from cookie — security difference |
| Implicit flow for magic links | PKCE flow required for server-side | 2023+ | Implicit flow sends tokens in URL fragment (not readable server-side); PKCE sends code in query param, enables server-side exchange |
| `inviteUserByEmail` (Supabase SMTP) | `generateLink` + custom SMTP | N/A (architectural choice) | Supabase SMTP has ~2 emails/hour rate limit on free tier; `generateLink` + Resend = branded email + high deliverability |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs`: deprecated, replaced by `@supabase/ssr`. Do not install.
- `signInWithMagicLink()`: renamed to `signInWithOtp()` in supabase-js v2. Use `signInWithOtp`.
- Implicit OAuth flow: removed from Supabase in favor of PKCE. PKCE is now the default.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | ✓ | v24.2.0 (Docker: 22-alpine) | — |
| `@supabase/ssr` | AUTH-05 | ✗ (not installed) | — | Must install |
| `@supabase/supabase-js` | AUTH-05, AUTH-07 | ✗ (not installed) | — | Must install |
| Supabase project (cloud) | All auth | Unknown | — | Must verify credentials exist in `.env` |
| Resend API | AUTH-07 (magic link delivery) | ✓ (in stack, `^6.10.0`) | `^6.10.0` | — |
| `NEXT_PUBLIC_SUPABASE_URL` | AUTH-05 | ✗ (not in .env.example) | — | Must add |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | AUTH-05 | ✗ (not in .env.example) | — | Must add |
| `SUPABASE_SERVICE_ROLE_KEY` | AUTH-07 (admin.generateLink) | ✗ (not in .env.example) | — | Must add |
| `NEXT_PUBLIC_SITE_URL` | AUTH-05 (boot assert), magic links | ✗ (not in .env.example) | — | Must add |
| `ADMIN_EMAILS` | Password reset abuse flag | ✗ (not in .env.example) | — | Must add |

**Missing dependencies that block execution:**
- Supabase credentials (URL, anon key, service role key) — planner must include a Wave 0 task or note that developer must supply these from the Supabase dashboard before testing
- `@supabase/ssr` and `@supabase/supabase-js` — install in Wave 0

[VERIFIED: `.env.example` read directly — no Supabase vars present as of 2026-04-15]

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4 |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npm run test -- --run` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-05 | npm run build succeeds with packages installed | build | `npm run build` | N/A |
| AUTH-05 | Boot assert throws when NEXT_PUBLIC_SITE_URL is localhost in production | unit | `npm run test -- --run src/lib/env.test.ts` | ❌ Wave 0 |
| AUTH-05 | Three Supabase client modules export expected functions | unit | `npm run test -- --run src/lib/supabase/*.test.ts` | ❌ Wave 0 |
| AUTH-06 | Middleware calls getUser() BEFORE route guard | unit | `npm run test -- --run src/middleware.test.ts` | ❌ Wave 0 (rewrite existing) |
| AUTH-06 | Middleware returns mutated response with refreshed cookies | unit | `npm run test -- --run src/middleware.test.ts` | ❌ Wave 0 |
| AUTH-07 | `/api/auth/magic-link` rate limits: 3/hr/email, 10/hr/IP | unit | `npm run test -- --run src/app/api/auth/magic-link/route.test.ts` | ❌ Wave 0 |
| AUTH-07 | `/api/auth/magic-link` calls `admin.generateLink` then Resend, not `inviteUserByEmail` | unit | `npm run test -- --run src/app/api/auth/magic-link/route.test.ts` | ❌ Wave 0 |
| AUTH-07 | `/auth/callback` exchanges code for session via `exchangeCodeForSession` | unit | `npm run test -- --run src/app/auth/callback/route.test.ts` | ❌ Wave 0 |
| AUTH-08 | `getCallerIdentity()` returns `admin` shape for admin role | unit | `npm run test -- --run src/lib/identity.test.ts` | ❌ Wave 0 (rewrite existing) |
| AUTH-08 | `getCallerIdentity()` returns `trainer` shape for trainer role | unit | `npm run test -- --run src/lib/identity.test.ts` | ❌ Wave 0 |
| AUTH-08 | `getCallerIdentity()` returns `associate` shape with `associateId` from `authUserId` FK | unit | `npm run test -- --run src/lib/identity.test.ts` | ❌ Wave 0 |
| AUTH-08 | `getCallerIdentity()` returns `anonymous` for unauthenticated user | unit | `npm run test -- --run src/lib/identity.test.ts` | ❌ Wave 0 |
| AUTH-08 | `getCallerIdentity()` returns `anonymous` when `authUserId` has no matching Associate row | unit | `npm run test -- --run src/lib/identity.test.ts` | ❌ Wave 0 |

### Sampling Rate
- Per task commit: `npm run test -- --run`
- Per wave merge: `npm run test`
- Phase gate: Full suite green + `npm run build` before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/lib/env.test.ts` — covers boot assert (AUTH-05 SC-2)
- [ ] `src/middleware.test.ts` — rewrite existing to cover Supabase session refresh ordering (AUTH-06 SC-6)
- [ ] `src/lib/identity.test.ts` — rewrite existing to cover new Supabase-based CallerIdentity (AUTH-08)
- [ ] `src/app/api/auth/magic-link/route.test.ts` — rate limit + generateLink + Resend (AUTH-07)
- [ ] `src/app/auth/callback/route.test.ts` — PKCE code exchange (AUTH-07)
- [ ] Install: `npm install @supabase/ssr@0.10.2 @supabase/supabase-js@2.103.2`

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase Auth (email/password with bcrypt, magic link with PKCE) |
| V3 Session Management | yes | `@supabase/ssr` HttpOnly chunked cookies, SameSite=Lax, secure in prod |
| V4 Access Control | yes | `getCallerIdentity()` role check in every route handler; middleware role gate |
| V5 Input Validation | yes | Zod on `/api/auth/magic-link` and `/api/auth/reset/request` bodies |
| V6 Cryptography | yes | Supabase Auth owns password hashing (bcrypt), token signing (JWT RS256 via JWKS), PKCE verifier — never hand-roll |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Magic link email scanner consuming token | Spoofing | PKCE flow — scanner cannot complete exchange without browser's code verifier |
| Brute-force password reset | Denial of Service | 3/hr/email + 10/hr/IP rate limit in `authRateLimit.ts` |
| Service role key exposure | Information Disclosure | `import 'server-only'` in `src/lib/supabase/admin.ts`; never in NEXT_PUBLIC_* env vars |
| Session fixation via stale cookie | Elevation of Privilege | `supabase.auth.getUser()` validates with Supabase server on each request |
| Middleware returning fresh response (discarding refreshed session) | Elevation of Privilege | Return same mutated response; enforced by `createSupabaseMiddlewareClient` pattern |
| Magic link redirect to localhost in prod | Spoofing | Boot-time assert on `NEXT_PUBLIC_SITE_URL` (SC-2) |
| Trainer impersonation via role claim tampering | Elevation of Privilege | `user_metadata.role` read from Supabase-signed JWT; only Supabase admin can set |
| Associate accessing another associate's data | Information Disclosure | `getCallerIdentity()` returns `associateSlug`; route handlers must verify slug matches URL param |

---

## Open Questions

1. **Supabase project credentials availability**
   - What we know: `.env.example` and `.env.docker` contain no Supabase vars
   - What's unclear: Does the developer have an existing Supabase project configured, or does one need to be created?
   - Recommendation: Wave 0 task must include "confirm Supabase project exists and obtain URL/anon/service-role keys from dashboard". Planner should note this as a human prerequisite.

2. **OTP expiry setting in Supabase dashboard**
   - What we know: Magic link 7-day expiry is a locked decision; `generateLink` uses project-level OTP expiry
   - What's unclear: Current OTP expiry setting in the project dashboard
   - Recommendation: Deployment task must include "set Supabase Auth OTP Expiry to 604800 seconds" as an explicit step.

3. **Resend sending domain configuration**
   - What we know: Resend is installed and used for interview report emails; domain verification status unknown
   - What's unclear: Whether the sending domain for magic-link/reset emails is already verified in Resend
   - Recommendation: Planner should include "verify Resend sending domain for auth emails" as a Wave 0 or deployment prerequisite. Magic links landing in spam = AUTH-07 SC-4 fails.

4. **Callback redirect after magic link for associate**
   - What we know: PKCE callback is `/auth/callback`; associates should land somewhere useful post-sign-in
   - What's unclear: Associates don't have a dashboard yet (Phase 23) — where should callback redirect them?
   - Recommendation: Callback redirects associate to `/associate/{slug}/interview` for now (existing pre-auth interview entry point); planner should confirm.

5. **`AuthEvent` table schema**
   - What we know: Context.md calls for `AuthEvent` table for abuse logging; deduplication within 24h
   - What's unclear: Exact fields needed — at minimum `email`, `eventType`, `ip`, `createdAt`
   - Recommendation: Planner should define this as a new Prisma model added via idempotent migration in Wave 0 or Wave 1.

---

## Project Constraints (from CLAUDE.md)

| Directive | Impact on Phase 18 |
|-----------|-------------------|
| Use `@supabase/ssr` (not deprecated auth-helpers) | Client scaffold must use `createServerClient` from `@supabase/ssr` only |
| Prisma stays on service-role + Transaction Pooler (BYPASSRLS) | `getCallerIdentity()` Prisma query goes through existing prisma singleton; no RLS context injection |
| `Associate.authUserId` additive nullable FK (no PK swap) | Associate linkage in `getCallerIdentity` uses `findUnique({ where: { authUserId: user.id } })` |
| Trainer role marker in `user_metadata.role` | Middleware and identity read `user.user_metadata?.role` — NOT `app_metadata` |
| Magic link via `generateLink` + Resend (NOT `inviteUserByEmail`) | `/api/auth/magic-link` must use `supabaseAdmin.auth.admin.generateLink`, then send via `Resend` |
| PIN files remain (Phase 25 owns deletion) | `pinService.ts`, `pinAttemptLimiter.ts`, etc. are untouched; only `getCallerIdentity` stops calling into them |
| Idempotent migrations (`IF NOT EXISTS` + DO-block guards) | `AuthEvent` table migration must follow this convention |
| DESIGN.md is the single source of truth for all UI | SignInTabs replacement must use `var(--nlm-*)` tokens and follow existing form style; read DESIGN.md before writing |
| Vitest 4 for all tests | All new test files use Vitest syntax (`describe`, `it`, `vi.mock`, etc.) |
| Health stack: typecheck + lint + test before commit | Each wave commit must pass `npx tsc --noEmit && npm run lint && npm run test -- --run` |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `@supabase/ssr` `setAll` second argument (cache headers) in v0.10.2 is passed automatically; no manual Cache-Control handling needed | Middleware Pattern | CDN may cache auth responses; add `Cache-Control: no-store` to middleware response if headers are not auto-set |
| A2 | `admin.generateLink({ type: 'magiclink' })` generates a PKCE-compatible link without additional configuration | Magic Link Pattern | If PKCE is not applied to generateLink tokens, email scanner consumption is a live threat; fallback: use `signInWithOtp` via server-side Supabase client (different approach) |
| A3 | Supabase project OTP expiry can be set to 604800s (7 days) in all plan tiers | Open Questions | If plan caps expiry at a lower value, 7-day magic links are not achievable; check dashboard before committing |
| A4 | `user.user_metadata?.role` is the correct path for `user_metadata` in the JWT claims returned by `getUser()` | getCallerIdentity Pattern | If Supabase changes claim structure, role check silently falls to 'associate' for everyone |
| A5 | `src/instrumentation.ts` `register()` runs on server boot before any requests are handled, making it a valid boot-assert location | Boot Assert Pattern | If Next.js changes when `register()` is called (e.g., lazy evaluation), assertion may not fire until first request; fallback: add assert to `src/lib/prisma.ts` singleton init |

---

## Sources

### Primary (HIGH confidence)
- [VERIFIED: `npm view @supabase/ssr version`] → `0.10.2` — current npm latest
- [VERIFIED: `npm view @supabase/supabase-js version`] → `2.103.2` — current npm latest
- [VERIFIED: `package.json` direct read] — neither `@supabase/ssr` nor `@supabase/supabase-js` installed
- [VERIFIED: `prisma/schema.prisma` direct read] — `Associate.authUserId String? @unique` present (Phase 17 applied)
- [VERIFIED: `src/middleware.ts` direct read] — current middleware is cookie-only, no Supabase session refresh
- [VERIFIED: `src/lib/identity.ts` direct read] — current identity reads `nlm_session` + `associate_session` cookies
- [VERIFIED: `src/instrumentation.ts` direct read] — boot hook exists, calls `runCleanupJob`
- [VERIFIED: `.env.example` direct read] — no Supabase env vars present
- `.planning/research/PITFALLS.md` — Supabase SSR/RLS pitfalls, PKCE scanner pitfall
- `.planning/research/ARCHITECTURE.md` — Identity replacement pattern, middleware rewrite, three client factories
- `.planning/research/STACK.md` — generateLink vs inviteUserByEmail tradeoff, version pins

### Secondary (MEDIUM confidence)
- [CITED: supabase.com/docs/guides/auth/server-side/nextjs] — canonical Next.js App Router integration
- [CITED: supabase.com/docs/reference/javascript/auth-admin-generatelink] — `admin.generateLink` API
- [CITED: supabase.com/docs/guides/auth/auth-smtp] — custom SMTP + rate limits
- [CITED: supabase.com/docs/guides/auth/server-side/oauth-with-pkce-flow] — PKCE magic link scanner protection

---

## Metadata

**Confidence breakdown:**
- Standard stack versions: HIGH — verified via `npm view` at research time
- @supabase/ssr client patterns: HIGH — canonical pattern documented in project ARCHITECTURE.md + cross-checked with official docs
- Middleware rewrite approach: HIGH — direct code inspection of `src/middleware.ts` + ARCHITECTURE.md pattern
- getCallerIdentity replacement: HIGH — direct code inspection of `src/lib/identity.ts` + ARCHITECTURE.md §1.4
- Rate limit implementation: MEDIUM — approach aligned with CONTEXT.md decision; exact in-memory vs DB storage is Claude's discretion
- AuthEvent table: MEDIUM — schema not yet defined; fields inferred from use case

**Research date:** 2026-04-15
**Valid until:** 2026-05-15 (Supabase SDK APIs are stable; `@supabase/ssr` 0.10.x series is current as of research date)
