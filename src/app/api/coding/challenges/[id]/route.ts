/**
 * GET /api/coding/challenges/[id] — Phase 40 Plan 03
 *
 * Returns the full challenge detail (description markdown, starters, visible
 * test cases, languages) for the solve view at /coding/[challengeId].
 *
 * Auth:
 *   - anonymous → 401
 *   - associate → must be in matching cohort OR challenge is global (cohortId=null)
 *   - trainer / admin → full access
 *
 * Hidden tests are NEVER returned — loaded separately by /submit for Judge0.
 *
 * `id` accepts EITHER the CUID primary key OR the slug; we try both so the
 * UI can link via either form (Phase 39 list returns id; challenge cards may
 * link via slug).
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCallerIdentity } from '@/lib/identity';
import { prisma } from '@/lib/prisma';
import { loadChallenge } from '@/lib/coding-challenge-service';
import { codingApiError } from '@/lib/codingApiErrors';

// IN-03: reject degenerate inputs (empty, oversized) before hitting Prisma.
const IdSchema = z.string().min(1).max(64);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id: rawId } = await params;
  const parsed = IdSchema.safeParse(rawId);
  if (!parsed.success) {
    return codingApiError('VALIDATION_ERROR', 'Invalid challenge identifier');
  }
  const id = parsed.data;

  const caller = await getCallerIdentity();
  if (caller.kind === 'anonymous') {
    return codingApiError('AUTH_REQUIRED', 'Sign-in required');
  }

  // Try id (cuid) first, fall back to slug.
  const challenge =
    (await prisma.codingChallenge.findUnique({ where: { id } })) ??
    (await prisma.codingChallenge.findUnique({ where: { slug: id } }));

  if (!challenge) {
    return codingApiError('NOT_FOUND', 'Challenge not found');
  }

  // Authorization (associate only; trainer/admin bypass).
  if (caller.kind === 'associate' && challenge.cohortId !== null) {
    const associate = await prisma.associate.findUnique({
      where: { id: caller.associateId },
      select: { cohortId: true },
    });
    if (associate?.cohortId !== challenge.cohortId) {
      return codingApiError(
        'FORBIDDEN',
        'Challenge is not available for your cohort',
      );
    }
  }

  // Load full content from coding-challenge-service (GitHub-backed). For
  // locally-seeded demo challenges (no GitHub repo), fall back to DB-stored
  // description + language-default starter.
  let full: {
    readme: string;
    starters: Record<string, string>;
    meta: { languages: string[] };
  };
  try {
    full = await loadChallenge(challenge.slug);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const isMissingRepo = /GITHUB_CODING_PUBLIC_REPO not set|GITHUB_TOKEN not set/.test(msg);
    if (!isMissingRepo) {
      console.error('[coding/challenges/[id]] loadChallenge failed:', err);
      return codingApiError('INTERNAL', 'Failed to load challenge content');
    }
    console.warn('[coding/challenges/[id]] GitHub repo not configured — using DB description');
    const starterByLang: Record<string, string> = {
      python: '# Write your solution below\nimport sys\ndata = sys.stdin.read()\n',
      javascript: "// Write your solution below\nconst input = require('fs').readFileSync(0, 'utf-8');\n",
      typescript: "// Write your solution below\nimport * as fs from 'fs';\nconst input = fs.readFileSync(0, 'utf-8');\n",
      java: 'import java.util.Scanner;\n\npublic class Main {\n  public static void main(String[] args) {\n    Scanner in = new Scanner(System.in);\n    // Your code here\n  }\n}\n',
      sql: "-- Write your query. Wrap the answer between sentinel markers:\nSELECT '---BEGIN-ANSWER---';\n-- your SELECT here\nSELECT '---END-ANSWER---';\n",
      csharp: 'using System;\n\nclass Program {\n  static void Main() {\n    // Your code here\n  }\n}\n',
    };
    full = {
      readme: challenge.description,
      starters: { [challenge.language]: starterByLang[challenge.language] ?? '' },
      meta: { languages: [challenge.language] },
    };
  }

  // Also fetch visible test cases from DB (they're already synced per Phase 37).
  const visibleCases = await prisma.codingTestCase.findMany({
    where: { challengeId: challenge.id, isHidden: false },
    orderBy: { orderIndex: 'asc' },
    select: { id: true, stdin: true, expectedStdout: true },
  });

  const body = {
    id: challenge.id,
    slug: challenge.slug,
    title: challenge.title,
    description: full.readme,
    difficulty: challenge.difficulty,
    skillSlug: challenge.skillSlug,
    language: challenge.language,
    languages: full.meta.languages,
    starters: full.starters,
    visibleTests: visibleCases.map((c) => ({
      caseId: c.id,
      stdin: c.stdin,
      expectedStdout: c.expectedStdout,
    })),
  };

  return NextResponse.json(body, { status: 200 });
}
