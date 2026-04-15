# Technology Stack

**Project:** Next Level Mock — Readiness Engine (v1.1 Cohort Readiness System)
**Researched:** 2026-04-14
**Confidence:** HIGH for new additions (all versions verified from npm registry)
**Scope:** Stack ADDITIONS only for v1.1 features. Existing stack (Next.js 16, React 19, Prisma 7, Zustand 5, recharts 3, Resend, Zod 4, Vitest 4) is validated and unchanged.

---

## What v1.1 Needs That v1.0 Doesn't

| Feature | Need | Decision |
|---------|------|----------|
| Associate auth (magic link / password) | Session issuance, cookie management, JWT tokens | `@supabase/supabase-js` + `@supabase/ssr` — use Supabase Auth email OTP |
| Cohort management | New Prisma models (Cohort, CurriculumWeek, Enrollment) | Schema additions only — no new library |
| Curriculum scheduling | Associate interview unlocks based on taught weeks | Logic in existing Next.js API routes — no new library |
| Email notifications on readiness changes | Triggered emails when status changes to ready/not_ready | Already have Resend (`resend@6.10.0`) — upgrade to 6.11.0 and add batch sends |
| Scheduled notification delivery | Run notification checks periodically | `node-cron@4.2.1` registered in `src/instrumentation.ts` — same pattern as cleanup job |

---

## New Stack Additions

### Associate Authentication

**Decision: Supabase Auth with email OTP (magic link), not passwords.**

Rationale:
- Associates are internal training org members — they have email addresses on file
- Passwords require password reset flows, hashing infrastructure, and forgotten-password UX — all complexity that adds nothing for an internal tool
- Magic links / OTP are stateless to implement and eliminate credential management
- Supabase Auth integrates directly with the existing Supabase Postgres instance — no second identity system
- The `Associate` record already exists in Prisma; Supabase Auth provides a `user.id` (UUID) that can be linked to `Associate.authId` via a new column

**Packages:**

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @supabase/supabase-js | 2.103.0 | Supabase Auth client — OTP send/verify, session management | Already planned in v1.0 STACK.md as prep for auth. Not yet installed. Current stable confirmed from npm registry. |
| @supabase/ssr | 0.10.2 | Cookie-based session handling for Next.js App Router | Required for App Router server components to read Supabase auth session from HttpOnly cookies. Peer requires `@supabase/supabase-js ^2.102.1` — satisfied by 2.103.0. No React peer dep. |

**What these replace / complement:**
- The existing trainer single-password auth (`nlm_session` cookie, `auth-context.tsx`) stays unchanged — trainers keep password login
- Associates get a separate auth flow: OTP email → Supabase session → `associate_session` HttpOnly cookie
- Two auth domains coexist: trainer (password) + associate (OTP). Both use HttpOnly cookies. Middleware routes are separate.

**Confidence:** HIGH — versions verified from npm registry. `@supabase/ssr@0.10.2` peer dep confirmed compatible with `@supabase/supabase-js@2.103.0`.

---

### Scheduled Notifications (Readiness Change Emails)

**Decision: `node-cron` registered in `src/instrumentation.ts` — same pattern as existing cleanup job.**

Rationale:
- The app already uses `setInterval` in `instrumentation.ts` for the 12-hour cleanup job — this proves the pattern works in the persistent Docker container
- `node-cron` is a strict upgrade: cron syntax (`0 8 * * *`) is far more readable and maintainable than millisecond intervals for daily/weekly notification windows
- This app runs as `node server.js` in Docker (not serverless) — the Node.js process stays alive, so cron jobs persist
- No external scheduling service (Vercel Cron, Inngest, etc.) needed — adding a hosted scheduler for a Docker-deployed solo project is unnecessary complexity and cost

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| node-cron | 4.2.1 | Cron-syntax scheduled jobs for readiness notification checks | Latest stable. Node >=6. TypeScript types included (`dist/cjs/node-cron.d.ts`). No `@types/node-cron` needed. Works in persistent Node.js process — Docker deployment pattern confirmed compatible. |

**Registration pattern (extends existing `src/instrumentation.ts`):**

```typescript
// src/instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { runCleanupJob } = await import('./lib/cleanupService');
    const cron = await import('node-cron');

    runCleanupJob();
    setInterval(() => runCleanupJob(), 12 * 60 * 60 * 1000);

    // Daily 8am readiness notification check
    cron.schedule('0 8 * * *', async () => {
      const { runReadinessNotifications } = await import('./lib/notificationService');
      await runReadinessNotifications();
    });
  }
}
```

**What this does NOT need:**
- Inngest — event-driven workflow orchestration; overkill for one daily email job
- Vercel Cron — only works on Vercel deployments; this app runs on GCE Docker
- BullMQ / Redis — job queue for at-scale retry logic; unnecessary for a single-tenant internal tool
- `@vercel/cron` — same deployment constraint as Vercel Cron

**Confidence:** HIGH — `node-cron@4.2.1` version verified from npm. Instrumentation.ts persistent-process pattern is live and proven in codebase.

---

### Email Notifications (Resend — Already Installed)

**Decision: No new library. Upgrade Resend from 6.10.0 to 6.11.0 and add notification email templates.**

Rationale:
- `resend@6.10.0` is already in `package.json` and the send-email route is working
- `resend@6.11.0` is current stable (confirmed from npm registry)
- Resend supports batch sends via `resend.batch.send([...])` in v2+ API — available in 6.x
- Readiness notifications are simple transactional emails (status change → email to associate + trainer) — no scheduling service, no template engine beyond what already exists in `src/lib/email-templates.ts`

**Upgrade:**

```bash
npm install resend@6.11.0
```

**What to build in-code (no new dependency):**
- `src/lib/notificationService.ts` — queries associates whose readiness changed since last notification, calls `resend.batch.send()` for batched delivery
- New email template functions in `src/lib/email-templates.ts` alongside existing `getReportEmailHtml()`

**Confidence:** HIGH — version verified from npm registry. Batch send API confirmed in Resend changelog (available since resend v2.x, well within 6.x scope).

---

### Prisma Schema Additions (No New Library)

New models needed for cohort management. These extend the existing `prisma/schema.prisma` — no library change, just schema migration.

**New models:**

```prisma
model Cohort {
  id          Int           @id @default(autoincrement())
  name        String        @unique
  trainerId   String?       // links to trainer identifier (not auth system in v1.1 — string ref)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  enrollments Enrollment[]
  weeks       CurriculumWeek[]
}

model CurriculumWeek {
  id        Int      @id @default(autoincrement())
  cohortId  Int
  weekNum   Int
  topic     String
  taughtAt  DateTime?  // null = not yet taught; set when trainer marks week complete
  cohort    Cohort   @relation(fields: [cohortId], references: [id], onDelete: Cascade)

  @@unique([cohortId, weekNum])
}

model Enrollment {
  id          Int       @id @default(autoincrement())
  associateId Int
  cohortId    Int
  enrolledAt  DateTime  @default(now())
  associate   Associate @relation(fields: [associateId], references: [id], onDelete: Cascade)
  cohort      Cohort    @relation(fields: [cohortId], references: [id], onDelete: Cascade)

  @@unique([associateId, cohortId])
}
```

**Associate model additions:**

```prisma
// Add to existing Associate model
authId              String?   @unique  // Supabase Auth user.id (UUID) — populated on first OTP login
email               String?   @unique  // needed for OTP delivery
lastNotifiedAt      DateTime? // tracks when last readiness notification was sent
```

**Confidence:** HIGH — these are straightforward relational extensions to the existing schema. No new ORM or migration tooling needed; `prisma migrate dev` handles it.

---

## What NOT to Add

| Avoid | Why | What to Use Instead |
|-------|-----|---------------------|
| NextAuth.js / Auth.js | Adds a full auth framework for a feature (associate OTP) that Supabase Auth handles natively with 2 packages already planned | `@supabase/supabase-js` + `@supabase/ssr` |
| Inngest | Event-driven workflow service — valuable for complex retry logic and fan-out, overkill for one daily notification cron | `node-cron` in `instrumentation.ts` |
| BullMQ + Redis | Persistent job queue — adds a Redis deployment dependency for a Docker-on-GCE app with no queue depth requirements | `node-cron` for scheduling; Resend handles delivery retries |
| @sendgrid/mail | Adding a second email provider when Resend is already installed and working | Resend `resend@6.11.0` |
| react-email | Template rendering library — adds React SSR overhead for email templates already handled with simple HTML template functions | Extend `src/lib/email-templates.ts` |
| jose | JWT signing/verification library — only needed if issuing custom JWTs; Supabase Auth handles token issuance | `@supabase/supabase-js` session management |
| bcryptjs | Password hashing — only needed for password auth; OTP approach eliminates this entirely | Not needed with magic link / OTP |
| TanStack Query | Client-side cache for cohort dashboard data — read-heavy, no optimistic updates in v1.1 | Next.js App Router RSC + fetch |

---

## Full v1.1 Install Commands

```bash
# Associate authentication (Supabase Auth + App Router session helpers)
npm install @supabase/supabase-js@2.103.0 @supabase/ssr@0.10.2

# Scheduled notifications (cron jobs in persistent Node.js process)
npm install node-cron@4.2.1

# Resend upgrade (minor — batch send API improvement)
npm install resend@6.11.0
```

**Total additions: 3 packages (2 Supabase, 1 cron). 1 upgrade (Resend minor version).**

---

## New Environment Variables

```bash
# Supabase Auth (OTP delivery needs Supabase project URL + anon key)
NEXT_PUBLIC_SUPABASE_URL="https://[project].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[anon-key]"
SUPABASE_SERVICE_ROLE_KEY="[service-role-key]"   # server-side only — admin operations

# Already exists — no change needed
RESEND_API_KEY="..."
```

Note: `SUPABASE_SERVICE_ROLE_KEY` is needed server-side for admin operations (e.g., creating a user session on behalf of an associate who completes OTP). NEVER expose to the client.

---

## Version Compatibility Matrix

| Package | Version | React Peer | Node Peer | Compatible With Existing Stack |
|---------|---------|-----------|-----------|-------------------------------|
| @supabase/supabase-js | 2.103.0 | none | none | YES |
| @supabase/ssr | 0.10.2 | none | none | YES — only peers on `@supabase/supabase-js ^2.102.1` |
| node-cron | 4.2.1 | none | >=6.0.0 | YES — Docker uses node:22-alpine |
| resend | 6.11.0 | none | none | YES — minor upgrade from 6.10.0 |

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Associate auth | Supabase Auth OTP | NextAuth.js | Full framework overhead for a feature Supabase handles natively; NextAuth adds session DB tables that duplicate what Supabase Auth already manages |
| Associate auth | Supabase Auth OTP | Password-based (bcryptjs) | Passwords require reset flows, email verification, and ongoing credential management — unnecessary for internal training tool |
| Associate auth | Supabase Auth OTP | Custom JWT (jose) | Re-inventing what Supabase Auth already provides with better security defaults and built-in refresh token rotation |
| Scheduling | node-cron | Inngest | Inngest is a hosted service — adds external dependency and cost for one daily job; Docker-deployed app doesn't benefit from Vercel-optimized scheduling |
| Scheduling | node-cron | Vercel Cron | Only works on Vercel — app deploys to GCE Docker |
| Scheduling | node-cron | setInterval (existing pattern) | `setInterval` drifts and lacks cron semantics (exact time-of-day scheduling for "notify at 8am daily") |
| Email notifications | Resend (existing) | SendGrid | Adding a second email provider when Resend is already installed and working |

---

## Sources

- npm registry (version queries): `@supabase/supabase-js@2.103.0`, `@supabase/ssr@0.10.2`, `node-cron@4.2.1`, `resend@6.11.0`
- Peer dependency verification: `@supabase/ssr@0.10.2` peers `@supabase/supabase-js ^2.102.1` — confirmed compatible with 2.103.0
- `node-cron@4.2.1` ships its own TypeScript types (`dist/cjs/node-cron.d.ts`) — no `@types/node-cron` needed
- Existing codebase analysis: `src/instrumentation.ts` confirms persistent-process cron pattern is live and proven; `resend@6.10.0` confirmed in `node_modules`; `@supabase/supabase-js` and `node-cron` confirmed NOT yet installed

---

*Stack research for: Next Level Mock v1.1 Cohort Readiness System*
*Researched: 2026-04-14*
