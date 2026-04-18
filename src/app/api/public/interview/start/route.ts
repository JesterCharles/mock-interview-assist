import { NextResponse } from 'next/server';
import { checkRateLimit, incrementInterviewCount } from '@/lib/rateLimitService';
import { log } from '@/lib/logger';

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
                log.warn('public.interview.start.rate_limited', {
                    route: '/api/public/interview/start',
                    action,
                });
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

            log.info('public.interview.start', {
                route: '/api/public/interview/start',
                action,
                remaining: rateLimit.remaining - 1,
            });
            return NextResponse.json({
                success: true,
                remaining: rateLimit.remaining - 1,
                nextReset: rateLimit.nextReset.toISOString()
            });
        }

        // Default action: just check status
        log.info('public.interview.start.status', {
            route: '/api/public/interview/start',
            allowed: rateLimit.allowed,
            remaining: rateLimit.remaining,
        });
        return NextResponse.json({
            allowed: rateLimit.allowed,
            remaining: rateLimit.remaining,
            nextReset: rateLimit.nextReset.toISOString()
        });

    } catch (error) {
        log.error('public.interview.start.error', {
            route: '/api/public/interview/start',
            err: String(error),
        });
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
