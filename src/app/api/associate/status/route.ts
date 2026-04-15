import { NextResponse } from 'next/server';
import { isAssociateAuthEnabled } from '@/lib/featureFlags';

/**
 * Public boolean indicating whether the associate auth flow is available in
 * this environment. Consumed by client components that need to hide/show
 * PIN-related CTAs without dragging server-only imports across the boundary.
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ enabled: isAssociateAuthEnabled() });
}
