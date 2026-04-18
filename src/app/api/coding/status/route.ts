/**
 * GET /api/coding/status — Phase 50 (JUDGE-INTEG-02 / D-06)
 *
 * Public feature-availability probe. Used by /coding + /coding/[id] + SubmitBar
 * to decide whether to render the normal workspace or the ComingSoon card.
 *
 * - NO auth: rendering cost of ComingSoon card must not require sign-in
 * - Cache-Control public, s-maxage=60 (D-07): bounded load if traffic spikes
 * - ALWAYS 200: this is a probe, never 503 (callers branch on body.enabled)
 * - Response shape: { enabled: boolean } — nothing else leaked
 */

import { NextResponse } from 'next/server';
import { isCodingEnabled } from '@/lib/codingFeatureFlag';

export async function GET(): Promise<NextResponse> {
  const enabled = isCodingEnabled();
  return NextResponse.json(
    { enabled },
    {
      status: 200,
      headers: { 'Cache-Control': 'public, s-maxage=60' },
    },
  );
}
