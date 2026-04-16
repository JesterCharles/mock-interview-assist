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
  // CSRF defense-in-depth: reject cross-origin POSTs before touching the cache.
  // The nlm_session cookie is SameSite=strict (see src/app/api/auth/route.ts),
  // but verifying Origin/Referer here blocks same-site subdomain attackers and
  // any future SameSite relaxation from silently widening blast radius.
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (origin !== null && host !== null) {
    let originHost: string | null = null;
    try {
      originHost = new URL(origin).host;
    } catch {
      originHost = null;
    }
    if (originHost !== host) {
      return NextResponse.json({ error: 'cross-origin' }, { status: 403 });
    }
  }

  const caller = await getCallerIdentity();
  if (caller.kind !== 'trainer' && caller.kind !== 'admin') {
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
