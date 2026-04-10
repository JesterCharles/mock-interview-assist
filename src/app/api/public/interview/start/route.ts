import { NextResponse } from 'next/server';
import { checkRateLimit, incrementInterviewCount } from '@/lib/rateLimitService';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { fingerprint, action } = body;

        if (!fingerprint) {
            return NextResponse.json(
                { error: 'Fingerprint is required' },
                { status: 400 }
            );
        }

        const rateLimit = checkRateLimit(fingerprint);

        if (action === 'start') {
            if (!rateLimit.allowed) {
                return NextResponse.json(
                    {
                        error: rateLimit.error || 'Rate limit exceeded. You have reached the maximum number of interviews for this period.',
                        nextReset: rateLimit.nextReset.toISOString()
                    },
                    { status: 429 }
                );
            }

            // We explicitly increment here to consume one interview slot
            incrementInterviewCount(fingerprint);

            return NextResponse.json({
                success: true,
                remaining: rateLimit.remaining - 1,
                nextReset: rateLimit.nextReset.toISOString()
            });
        }

        // Default action: just check status
        return NextResponse.json({
            allowed: rateLimit.allowed,
            remaining: rateLimit.remaining,
            nextReset: rateLimit.nextReset.toISOString()
        });

    } catch (error) {
        console.error('Error in public interview start API:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
