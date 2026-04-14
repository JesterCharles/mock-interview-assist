/**
 * Phase 10 Plan 02 — Integration tests
 *
 * Goal-backward verification of the automated-interview completion pipeline
 * against a REAL Postgres test database. Unlike the route `*.test.ts` files
 * which mock Prisma/auth at the module boundary, these tests exercise the
 * full stack:
 *
 *     Request -> route handler -> persistSessionToDb -> gapPersistence ->
 *     readinessService -> Associate.readinessStatus update
 *
 * ## Required environment
 *
 *     TEST_DATABASE_URL    — Postgres connection for an ISOLATED test DB.
 *                            NEVER point at production. Integration tests
 *                            TRUNCATE `Session`, `GapScore`, `Associate`,
 *                            `Settings` between runs.
 *
 * If `TEST_DATABASE_URL` is unset these tests are SKIPPED so the default
 * `npm run test` run stays green on developer machines without a local DB.
 * CI can opt-in once infra lands by exporting `TEST_DATABASE_URL`.
 *
 * ## Safety guard
 *
 * Before any DB work we fail loudly if the chosen URL matches obviously
 * production-looking patterns (T-10-07). This is a belt-and-braces check;
 * the primary guard is the operator supplying a dedicated test URL.
 *
 * ## Running locally
 *
 *     TEST_DATABASE_URL="postgresql://.../nlm_test" \
 *       npm run test -- pipeline.integration
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

const TEST_DB_URL = process.env.TEST_DATABASE_URL;
const skipIntegration = !TEST_DB_URL;

// Wire DATABASE_URL to the test DB BEFORE prisma client is instantiated.
if (TEST_DB_URL) {
  if (/prod|production|supabase\.co(?!.*test)/i.test(TEST_DB_URL)) {
    throw new Error(
      '[pipeline.integration] Refusing to run: TEST_DATABASE_URL looks production-like. ' +
      'Point at an isolated test database.',
    );
  }
  process.env.DATABASE_URL = TEST_DB_URL;
}

// Mock ONLY the cookie-identity boundary — real Prisma, real pipeline.
vi.mock('@/lib/auth-server', () => ({
  getAssociateSession: vi.fn(),
}));

// Rate limit would block repeat calls in-process; stub to always allow.
vi.mock('@/lib/rateLimitService', () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true, nextReset: new Date() })),
}));

// Dynamic imports happen inside the describe block so the skip guard
// above takes effect before Prisma attempts to connect.
const describeIntegration = skipIntegration ? describe.skip : describe;

describeIntegration('Phase 10 pipeline integration (requires TEST_DATABASE_URL)', () => {
  // Lazily resolved after env wiring.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prisma: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let publicPOST: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let assocPOST: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let getAssociateSession: any;

  beforeAll(async () => {
    ({ prisma } = await import('@/lib/prisma'));
    ({ POST: publicPOST } = await import('@/app/api/public/interview/complete/route'));
    ({ POST: assocPOST } = await import('@/app/api/associate/interview/complete/route'));
    ({ getAssociateSession } = await import('@/lib/auth-server'));
  });

  afterAll(async () => {
    if (prisma?.$disconnect) await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Truncate between tests — FK chain requires child tables first.
    await prisma.gapScore.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.associate.deleteMany({});
    // Ensure a known threshold — upsert singleton Settings row.
    await prisma.settings.upsert({
      where: { id: 1 },
      update: { readinessThreshold: 75 },
      create: { id: 1, readinessThreshold: 75 },
    });
    (getAssociateSession as ReturnType<typeof vi.fn>).mockReset();
  });

  // --- helpers ---------------------------------------------------------------

  function makeReq(url: string, body: unknown): Request {
    return new Request(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  function basePayloadSession(id: string, overrides: Record<string, unknown> = {}) {
    return {
      id,
      status: 'completed',
      questions: [
        { id: 'q1', questionNumber: 1, question: 'Q', keywords: [], modelAnswer: '', difficulty: 'beginner', weekNumber: 1 },
      ],
      questionCount: 1,
      starterQuestions: [],
      assessments: {
        q1: {
          questionId: 'q1',
          keywordsHit: [],
          keywordsMissed: [],
          softSkills: { clearlySpoken: true, eyeContact: true, confidence: true, structuredThinking: true },
          interviewerNotes: '',
          didNotGetTo: false,
          finalScore: 80,
          status: 'validated',
        },
      },
      currentQuestionIndex: 0,
      selectedWeeks: [1],
      date: '2026-04-14',
      techMap: { 1: 'react' },
      overallTechnicalScore: 80,
      overallSoftSkillScore: 80,
      ...overrides,
    };
  }

  async function seedAssociateWithPriorSessions(slug: string, count: number) {
    const assoc = await prisma.associate.create({
      data: { slug, displayName: `${slug}-display` },
    });
    for (let i = 0; i < count; i++) {
      await prisma.session.create({
        data: {
          id: `${slug}-prior-${i}-${Date.now()}`,
          date: `2026-04-0${i + 1}`,
          status: 'completed',
          questionCount: 1,
          selectedWeeks: [1],
          overallTechnicalScore: 70 + i,
          overallSoftSkillScore: 70 + i,
          questions: [{ id: 'q1', questionNumber: 1, question: 'Q', keywords: [], modelAnswer: '', difficulty: 'beginner', weekNumber: 1 }],
          starterQuestions: [],
          assessments: {
            q1: {
              questionId: 'q1',
              keywordsHit: [],
              keywordsMissed: [],
              softSkills: { clearlySpoken: true, eyeContact: true, confidence: true, structuredThinking: true },
              interviewerNotes: '',
              didNotGetTo: false,
              finalScore: 70 + i,
              status: 'validated',
            },
          },
          techMap: { 1: 'react' },
          associateId: assoc.id,
          mode: 'automated',
          readinessRecomputeStatus: 'done',
        },
      });
    }
    return assoc;
  }

  /**
   * Fan-out is fire-and-forget. Poll the DB for up to `timeoutMs` ms until a
   * GapScore row appears for the associate, or throw.
   */
  async function waitForGapScores(associateId: number, timeoutMs = 3000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const found = await prisma.gapScore.findFirst({ where: { associateId } });
      if (found) return;
      await new Promise((r) => setTimeout(r, 50));
    }
    throw new Error(`Timeout: no GapScore rows appeared for associate ${associateId}`);
  }

  async function waitForSessionStatus(sessionId: string, status: string, timeoutMs = 3000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const s = await prisma.session.findUnique({ where: { id: sessionId } });
      if (s?.readinessRecomputeStatus === status) return;
      await new Promise((r) => setTimeout(r, 50));
    }
    throw new Error(`Timeout: session ${sessionId} never reached readinessRecomputeStatus=${status}`);
  }

  // --- Test A ---------------------------------------------------------------

  it('A: authenticated session writes Session+GapScore+readiness end-to-end', async () => {
    const assoc = await seedAssociateWithPriorSessions('test-assoc', 2);
    (getAssociateSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      associateId: assoc.id,
      slug: assoc.slug,
    });

    const sessionId = `sess-A-${Date.now()}`;
    const res = await assocPOST(
      makeReq(
        'http://localhost/api/associate/interview/complete',
        { fingerprint: 'fp-A', session: basePayloadSession(sessionId) },
      ),
    );
    expect(res.status).toBe(200);

    // Session row persisted with associate linkage
    const persisted = await prisma.session.findUnique({ where: { id: sessionId } });
    expect(persisted).not.toBeNull();
    expect(persisted.associateId).toBe(assoc.id);
    expect(persisted.mode).toBe('automated');

    // Fan-out completes
    await waitForSessionStatus(sessionId, 'done');
    await waitForGapScores(assoc.id);

    // GapScore row exists for the 'react' skill we emitted
    const gaps = await prisma.gapScore.findMany({ where: { associateId: assoc.id } });
    expect(gaps.length).toBeGreaterThan(0);
    const reactGap = gaps.find((g: { skill: string }) => g.skill === 'react');
    expect(reactGap).toBeDefined();

    // Readiness recomputed
    const after = await prisma.associate.findUnique({ where: { id: assoc.id } });
    expect(after.readinessStatus).toMatch(/^(ready|improving|not_ready)$/);
    expect(after.lastComputedAt).not.toBeNull();
    expect(Date.now() - new Date(after.lastComputedAt).getTime()).toBeLessThan(60_000);
  });

  // --- Test B ---------------------------------------------------------------

  it('B: anonymous session writes Session with associateId=null and NO gap scores', async () => {
    const sessionId = `sess-B-${Date.now()}`;
    const res = await publicPOST(
      makeReq(
        'http://localhost/api/public/interview/complete',
        { fingerprint: 'fp-B', session: basePayloadSession(sessionId) },
      ),
    );
    expect(res.status).toBe(200);

    const persisted = await prisma.session.findUnique({ where: { id: sessionId } });
    expect(persisted).not.toBeNull();
    expect(persisted.associateId).toBeNull();

    // Give any would-be fan-out a chance — there should be NO gap scores anywhere.
    await new Promise((r) => setTimeout(r, 200));
    const anyGaps = await prisma.gapScore.count();
    expect(anyGaps).toBe(0);
  });

  // --- Test C (spoofing) ----------------------------------------------------

  it('C: authenticated route — cookie identity WINS over client-supplied associateSlug', async () => {
    const attacker = await prisma.associate.create({
      data: { slug: 'attacker', displayName: 'attacker' },
    });
    const victim = await prisma.associate.create({
      data: { slug: 'victim', displayName: 'victim' },
    });

    // Cookie says "attacker"; client payload tries to spoof "victim".
    (getAssociateSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      associateId: attacker.id,
      slug: attacker.slug,
    });

    const sessionId = `sess-C-${Date.now()}`;
    const res = await assocPOST(
      makeReq(
        'http://localhost/api/associate/interview/complete',
        {
          fingerprint: 'fp-C',
          session: basePayloadSession(sessionId, { associateSlug: 'victim' }),
        },
      ),
    );
    expect(res.status).toBe(200);

    const persisted = await prisma.session.findUnique({ where: { id: sessionId } });
    expect(persisted.associateId).toBe(attacker.id);

    // Victim is untouched
    const victimAfter = await prisma.associate.findUnique({ where: { id: victim.id } });
    expect(victimAfter.readinessStatus).toBeNull();
    const victimSessions = await prisma.session.count({ where: { associateId: victim.id } });
    expect(victimSessions).toBe(0);
  });

  // --- Test D (regression guard: public route strips client slug) ----------

  it('D: public route strips client-supplied associateSlug even without cookie', async () => {
    // Pre-existing associate that a malicious client tries to attach to.
    const assoc = await prisma.associate.create({
      data: { slug: 'self-id', displayName: 'self-id' },
    });

    const sessionId = `sess-D-${Date.now()}`;
    const res = await publicPOST(
      makeReq(
        'http://localhost/api/public/interview/complete',
        {
          fingerprint: 'fp-D',
          session: basePayloadSession(sessionId, { associateSlug: 'self-id' }),
        },
      ),
    );
    expect(res.status).toBe(200);

    // Hardened public route (Plan 10-01 / Codex #3) MUST null associateId.
    const persisted = await prisma.session.findUnique({ where: { id: sessionId } });
    expect(persisted.associateId).toBeNull();

    // Pre-existing associate is untouched.
    const after = await prisma.associate.findUnique({ where: { id: assoc.id } });
    expect(after.readinessStatus).toBeNull();
  });
});
