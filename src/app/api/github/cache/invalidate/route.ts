import { NextRequest, NextResponse } from 'next/server';
import { getCallerIdentity } from '@/lib/identity';
import { invalidate } from '@/lib/githubManifestCache';

const OWNER = 'JesterCharles';
const REPO = 'mock-question-bank';
const BRANCH = 'main';

type InvalidateBody =
  | { scope?: 'all' }
  | { scope: { owner: string; repo: string; branch: string } };

export async function POST(request: NextRequest) {
  const caller = await getCallerIdentity(request);
  if (caller.type !== 'trainer') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: InvalidateBody = {};
  try {
    body = (await request.json()) as InvalidateBody;
  } catch {
    // Empty body is OK — falls through to default-key clear.
  }

  let cleared: number;
  if (body && (body as { scope?: unknown }).scope === 'all') {
    cleared = invalidate('all');
  } else if (
    body &&
    typeof (body as { scope?: unknown }).scope === 'object' &&
    (body as { scope?: unknown }).scope !== null
  ) {
    cleared = invalidate(
      (body as { scope: { owner: string; repo: string; branch: string } }).scope,
    );
  } else {
    // Omit body → clear default repo/branch key (per CONTEXT D7).
    cleared = invalidate({ owner: OWNER, repo: REPO, branch: BRANCH });
  }

  console.log('[manifest-cache] invalidate cleared=' + cleared);
  return NextResponse.json({ cleared });
}
