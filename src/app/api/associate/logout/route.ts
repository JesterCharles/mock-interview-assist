import { NextResponse } from 'next/server';

export async function POST(): Promise<NextResponse> {
  const response = NextResponse.json({ ok: true }, { status: 200 });
  response.cookies.set('associate_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
  return response;
}
