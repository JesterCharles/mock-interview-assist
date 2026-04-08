import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { password } = await request.json();

        const correctPassword = process.env.APP_PASSWORD;

        if (!correctPassword) {
            console.error('APP_PASSWORD environment variable not set');
            return NextResponse.json(
                { error: 'Authentication not configured' },
                { status: 500 }
            );
        }

        if (password === correctPassword) {
            const response = NextResponse.json({ success: true });
            
            // Set HttpOnly cookie for backend security
            response.cookies.set('nlm_session', 'authenticated', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 60 * 60 * 24 // 24 hours
            });
            
            return response;
        } else {
            return NextResponse.json(
                { error: 'Invalid password' },
                { status: 401 }
            );
        }
    } catch (error) {
        console.error('Auth error:', error);
        return NextResponse.json(
            { error: 'Authentication failed' },
            { status: 500 }
        );
    }
}
