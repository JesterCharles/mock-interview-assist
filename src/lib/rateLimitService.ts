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

const MAX_INTERVIEWS_PER_24H = 2;
const RESET_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

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

export function checkRateLimit(fingerprint: string): {
    allowed: boolean;
    remaining: number;
    nextReset: Date;
} {
    const store = getStore();
    const now = new Date();

    if (!store[fingerprint]) {
        store[fingerprint] = {
            interviewsCompleted: 0,
            lastReset: now.toISOString(),
        };
        saveStore(store);
    }

    const userData = store[fingerprint];
    const lastResetDate = new Date(userData.lastReset);

    // Check if 24 hours have passed since last reset
    if (now.getTime() - lastResetDate.getTime() >= RESET_INTERVAL_MS) {
        // Reset the count
        userData.interviewsCompleted = 0;
        userData.lastReset = now.toISOString();
        saveStore(store);
    }

    const nextReset = new Date(new Date(userData.lastReset).getTime() + RESET_INTERVAL_MS);
    const remaining = Math.max(0, MAX_INTERVIEWS_PER_24H - userData.interviewsCompleted);

    return {
        allowed: remaining > 0,
        remaining,
        nextReset
    };
}

export function incrementInterviewCount(fingerprint: string): void {
    const store = getStore();
    const now = new Date();

    if (!store[fingerprint]) {
        store[fingerprint] = {
            interviewsCompleted: 1,
            lastReset: now.toISOString(),
        };
    } else {
        // Before incrementing, make sure we aren't due for a reset
        const lastResetDate = new Date(store[fingerprint].lastReset);
        if (now.getTime() - lastResetDate.getTime() >= RESET_INTERVAL_MS) {
            store[fingerprint].interviewsCompleted = 1;
            store[fingerprint].lastReset = now.toISOString();
        } else {
            store[fingerprint].interviewsCompleted += 1;
        }
    }

    saveStore(store);
}
