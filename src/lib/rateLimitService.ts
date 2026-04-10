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
