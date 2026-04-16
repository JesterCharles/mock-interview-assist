/**
 * /api/settings — Trainer-configurable settings
 *
 * GET  /api/settings  — Returns current readiness threshold (default 75)
 * PUT  /api/settings  — Updates readiness threshold and triggers bulk recompute
 *
 * Both endpoints require authentication (HttpOnly session cookie).
 * PUT input is validated with zod: readinessThreshold must be a number 0-100.
 *
 * Security: T-05-04 (auth guard), T-05-05 (zod validation), T-05-06 (auth blocks bulk recompute trigger)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCallerIdentity } from '@/lib/identity';
import { getSettings, updateThreshold } from '@/lib/settingsService';

const updateSettingsSchema = z.object({
  readinessThreshold: z.number().min(0).max(100),
});

export async function GET() {
  const caller = await getCallerIdentity()
  if (caller.kind !== 'trainer' && caller.kind !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const settings = await getSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error('[settings] GET failed:', error);
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest | Request) {
  const caller = await getCallerIdentity()
  if (caller.kind !== 'trainer' && caller.kind !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = updateSettingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid threshold. Must be a number between 0 and 100.', details: parsed.error.issues },
        { status: 400 },
      );
    }

    await updateThreshold(parsed.data.readinessThreshold);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[settings] PUT failed:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
