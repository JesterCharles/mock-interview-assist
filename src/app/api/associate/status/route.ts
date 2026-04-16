import { NextResponse } from 'next/server';

/**
 * Associate auth is always enabled with Supabase. Returns static { enabled: true }.
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ enabled: true });
}
