/**
 * Phase 50 (JUDGE-INTEG-02 / D-05): canonical 503 response used by every
 * /api/coding/* route (except /api/coding/status, the probe) when the
 * feature flag is off.
 *
 * Underscore-prefixed filename is the Next.js convention for colocated
 * non-route modules inside app/.
 */
import { NextResponse } from 'next/server';
import { CODING_COMING_SOON_MESSAGE } from '@/lib/codingFeatureFlag';

export function codingDisabledResponse(): NextResponse {
  return NextResponse.json(
    { enabled: false, message: CODING_COMING_SOON_MESSAGE },
    { status: 503 },
  );
}
