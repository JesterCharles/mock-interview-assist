import fs from 'fs';
import path from 'path';

export interface RateLimitData {
    interviewsCompleted: number;
    lastReset: string; // ISO string
}

export interface RateLimitStore {
    [fingerprint: string]: RateLimitData;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const FILE_PATH = path.join(DATA_DIR, 'rate-limits.json');

const MAX_INTERVIEWS_PER_SESSION = 2;
const GLOBAL_DAILY_LIMIT = 125;
const RESET_INTERVAL_MS = 13 * 60 * 60 * 1000; // 13 hours
const GLOBAL_STATS_KEY = '_GLOBAL_STATS_';

function getStore(): RateLimitStore {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(FILE_PATH)) {
        fs.writeFileSync(FILE_PATH, JSON.stringify({}), 'utf-8');
        return {};
    }

    try {
        const data = fs.readFileSync(FILE_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading rate limits file:', error);
        return {};
    }
}

function saveStore(store: RateLimitStore) {
    fs.writeFileSync(FILE_PATH, JSON.stringify(store, null, 2), 'utf-8');
}

function isMidnightPassed(lastResetStr: string, now: Date): boolean {
    const lastResetDate = new Date(lastResetStr);
    const lastResetMidnight = new Date(lastResetDate);
    lastResetMidnight.setHours(0, 0, 0, 0);
    
    const nowMidnight = new Date(now);
    nowMidnight.setHours(0, 0, 0, 0);
    
    return nowMidnight.getTime() > lastResetMidnight.getTime();
}

export function checkRateLimit(fingerprint: string): {
    allowed: boolean;
    remaining: number;
    nextReset: Date;
    error?: string;
} {
    const store = getStore();
    const now = new Date();

    // 1. Check/Initialize Global Stats
    if (!store[GLOBAL_STATS_KEY]) {
        store[GLOBAL_STATS_KEY] = {
            interviewsCompleted: 0,
            lastReset: now.toISOString(),
        };
    }

    const globalStats = store[GLOBAL_STATS_KEY];
    if (isMidnightPassed(globalStats.lastReset, now)) {
        globalStats.interviewsCompleted = 0;
        globalStats.lastReset = now.toISOString();
        saveStore(store);
    }

    if (globalStats.interviewsCompleted >= GLOBAL_DAILY_LIMIT) {
        return {
            allowed: false,
            remaining: 0,
            nextReset: new Date(new Date(now).setHours(24, 0, 0, 0)), // Reset at next midnight
            error: 'The daily limit for all public interviews has been reached. Please try again tomorrow.'
        };
    }

    // 2. Check/Initialize User Stats
    if (!store[fingerprint]) {
        store[fingerprint] = {
            interviewsCompleted: 0,
            lastReset: now.toISOString(),
        };
        saveStore(store);
    }

    const userData = store[fingerprint];
    const lastResetDate = new Date(userData.lastReset);

    // Check if 13 hours passed OR midnight passed
    if (now.getTime() - lastResetDate.getTime() >= RESET_INTERVAL_MS || isMidnightPassed(userData.lastReset, now)) {
        userData.interviewsCompleted = 0;
        userData.lastReset = now.toISOString();
        saveStore(store);
    }

    const nextResetByTime = new Date(new Date(userData.lastReset).getTime() + RESET_INTERVAL_MS);
    const nextResetByMidnight = new Date(new Date(now).setHours(24, 0, 0, 0));
    
    // nextReset is whichever comes first
    const nextReset = nextResetByTime < nextResetByMidnight ? nextResetByTime : nextResetByMidnight;
    
    const remaining = Math.max(0, MAX_INTERVIEWS_PER_SESSION - userData.interviewsCompleted);

    return {
        allowed: remaining > 0,
        remaining,
        nextReset,
        error: remaining <= 0 ? 'You have reached the maximum number of interviews for this period.' : undefined
    };
}

// ---------------------------------------------------------------------------
// Coding-submit rate limit scope (Phase 39 D-07..D-08)
// Keyed per-user (associate:<id> or trainer:<userId>), hourly + daily windows.
// Namespaced under 'coding-submit:<userKey>' to avoid collision with interview
// fingerprint keys (bare strings).
// ---------------------------------------------------------------------------

const CODING_SUBMIT_HOURLY_DEFAULT = 30;
const CODING_SUBMIT_DAILY_DEFAULT = 200;
const CODING_SUBMIT_HOUR_MS = 60 * 60 * 1000;

interface CodingSubmitBucket {
    hourlyCount: number;
    hourlyWindowStart: string; // ISO
    dailyCount: number;
    dailyWindowStart: string; // ISO
}

function getCodingHourlyLimit(): number {
    const raw = process.env.CODING_SUBMIT_RATE_HOURLY;
    if (!raw) return CODING_SUBMIT_HOURLY_DEFAULT;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : CODING_SUBMIT_HOURLY_DEFAULT;
}

function getCodingDailyLimit(): number {
    const raw = process.env.CODING_SUBMIT_RATE_DAILY;
    if (!raw) return CODING_SUBMIT_DAILY_DEFAULT;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : CODING_SUBMIT_DAILY_DEFAULT;
}

function codingKey(userKey: string): string {
    return `coding-submit:${userKey}`;
}

function getCodingBucket(userKey: string): CodingSubmitBucket | null {
    const store = getStore() as unknown as Record<string, unknown>;
    const entry = store[codingKey(userKey)];
    if (!entry || typeof entry !== 'object') return null;
    return entry as CodingSubmitBucket;
}

function setCodingBucket(userKey: string, bucket: CodingSubmitBucket): void {
    const store = getStore() as unknown as Record<string, unknown>;
    store[codingKey(userKey)] = bucket;
    saveStore(store as unknown as RateLimitStore);
}

function isUtcMidnightPassed(lastResetStr: string, now: Date): boolean {
    const last = new Date(lastResetStr);
    const lastUtcDay = Date.UTC(
        last.getUTCFullYear(),
        last.getUTCMonth(),
        last.getUTCDate(),
    );
    const nowUtcDay = Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
    );
    return nowUtcDay > lastUtcDay;
}

function nextUtcMidnightMs(now: Date): number {
    return Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
        0, 0, 0, 0,
    );
}

function rolloverBucket(
    bucket: CodingSubmitBucket,
    now: Date,
): CodingSubmitBucket {
    const hourlyStart = new Date(bucket.hourlyWindowStart);

    let next = { ...bucket };
    if (now.getTime() - hourlyStart.getTime() >= CODING_SUBMIT_HOUR_MS) {
        next = { ...next, hourlyCount: 0, hourlyWindowStart: now.toISOString() };
    }
    if (isUtcMidnightPassed(bucket.dailyWindowStart, now)) {
        next = { ...next, dailyCount: 0, dailyWindowStart: now.toISOString() };
    }
    return next;
}

export interface CodingSubmitRateResult {
    allowed: boolean;
    hourlyRemaining: number;
    dailyRemaining: number;
    retryAfterSeconds?: number;
    error?: string;
}

export function checkCodingSubmitRateLimit(userKey: string): CodingSubmitRateResult {
    const now = new Date();
    const hourlyLimit = getCodingHourlyLimit();
    const dailyLimit = getCodingDailyLimit();

    let bucket = getCodingBucket(userKey);
    if (!bucket) {
        // No prior usage → full budget available. Do NOT persist here; increment does that.
        return {
            allowed: true,
            hourlyRemaining: hourlyLimit,
            dailyRemaining: dailyLimit,
        };
    }

    // Roll over windows if expired. WR-03 (Phase 39 review): rolloverBucket
    // always returns a fresh spread-copy, so a reference-identity check was
    // ALWAYS true and triggered a disk write on every call. Compare the
    // fields that actually roll (hourly/daily window starts) so we only
    // persist when a window boundary was crossed.
    const rolled = rolloverBucket(bucket, now);
    const windowAdvanced =
        rolled.hourlyWindowStart !== bucket.hourlyWindowStart ||
        rolled.dailyWindowStart !== bucket.dailyWindowStart;
    if (windowAdvanced) {
        setCodingBucket(userKey, rolled);
        bucket = rolled;
    }

    const hourlyRemaining = Math.max(0, hourlyLimit - bucket.hourlyCount);
    const dailyRemaining = Math.max(0, dailyLimit - bucket.dailyCount);

    if (hourlyRemaining <= 0 || dailyRemaining <= 0) {
        // Always pick the soonest of next hour window or next UTC midnight.
        // (earliest reset wins — caller retries whenever capacity opens up first.)
        const nextHourMs = new Date(bucket.hourlyWindowStart).getTime() + CODING_SUBMIT_HOUR_MS;
        const nextMidnightMs = nextUtcMidnightMs(now);
        const soonestResetMs = Math.min(nextHourMs, nextMidnightMs);
        const retryAfterSeconds = Math.max(1, Math.ceil((soonestResetMs - now.getTime()) / 1000));
        return {
            allowed: false,
            hourlyRemaining,
            dailyRemaining,
            retryAfterSeconds,
            error:
                dailyRemaining <= 0
                    ? 'Daily coding-submit limit reached. Try again tomorrow.'
                    : 'Hourly coding-submit limit reached. Try again later.',
        };
    }

    return {
        allowed: true,
        hourlyRemaining,
        dailyRemaining,
    };
}

export function incrementCodingSubmitCount(userKey: string): void {
    const now = new Date();
    const existing = getCodingBucket(userKey);

    let bucket: CodingSubmitBucket;
    if (!existing) {
        bucket = {
            hourlyCount: 1,
            hourlyWindowStart: now.toISOString(),
            dailyCount: 1,
            dailyWindowStart: now.toISOString(),
        };
    } else {
        const rolled = rolloverBucket(existing, now);
        bucket = {
            hourlyCount: rolled.hourlyCount + 1,
            hourlyWindowStart: rolled.hourlyWindowStart,
            dailyCount: rolled.dailyCount + 1,
            dailyWindowStart: rolled.dailyWindowStart,
        };
    }

    setCodingBucket(userKey, bucket);
}

export function incrementInterviewCount(fingerprint: string): void {
    const store = getStore();
    const now = new Date();

    // Increment Global
    if (!store[GLOBAL_STATS_KEY]) {
        store[GLOBAL_STATS_KEY] = {
            interviewsCompleted: 1,
            lastReset: now.toISOString(),
        };
    } else {
        const globalStats = store[GLOBAL_STATS_KEY];
        if (isMidnightPassed(globalStats.lastReset, now)) {
            globalStats.interviewsCompleted = 1;
            globalStats.lastReset = now.toISOString();
        } else {
            globalStats.interviewsCompleted += 1;
        }
    }

    // Increment User
    if (!store[fingerprint]) {
        store[fingerprint] = {
            interviewsCompleted: 1,
            lastReset: now.toISOString(),
        };
    } else {
        const userData = store[fingerprint];
        if (now.getTime() - new Date(userData.lastReset).getTime() >= RESET_INTERVAL_MS || isMidnightPassed(userData.lastReset, now)) {
            userData.interviewsCompleted = 1;
            userData.lastReset = now.toISOString();
        } else {
            userData.interviewsCompleted += 1;
        }
    }

    saveStore(store);
}
