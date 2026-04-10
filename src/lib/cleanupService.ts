import fs from 'fs';
import path from 'path';
import { InterviewSession } from './types';
import { RateLimitStore } from './rateLimitService';

const DATA_DIR = path.join(process.cwd(), 'data');
const HISTORY_FILE = path.join(DATA_DIR, 'interview-history.json');
const RATE_LIMIT_FILE = path.join(DATA_DIR, 'rate-limits.json');

export function cleanRateLimits(): void {
    if (!fs.existsSync(RATE_LIMIT_FILE)) return;
    
    try {
        const content = fs.readFileSync(RATE_LIMIT_FILE, 'utf-8');
        if (!content) return;
        
        const store: RateLimitStore = JSON.parse(content);
        let modified = false;
        
        const now = new Date();
        const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
        const GLOBAL_STATS_KEY = '_GLOBAL_STATS_';
        
        for (const fingerprint in store) {
            if (fingerprint === GLOBAL_STATS_KEY) continue;
            
            const userData = store[fingerprint];
            const lastResetDate = new Date(userData.lastReset);
            
            // Remove entries that are older than 24 hours
            if (now.getTime() - lastResetDate.getTime() > TWENTY_FOUR_HOURS_MS) {
                delete store[fingerprint];
                modified = true;
            }
        }
        
        if (modified) {
            fs.writeFileSync(RATE_LIMIT_FILE, JSON.stringify(store, null, 2), 'utf-8');
            console.log(`[Cleanup] Cleaned up old rate limits at ${new Date().toISOString()}`);
        }
    } catch (error) {
        console.error('Error cleaning rate limits:', error);
    }
}

export function cleanInterviewHistory(): void {
    if (!fs.existsSync(HISTORY_FILE)) return;
    
    try {
        const content = fs.readFileSync(HISTORY_FILE, 'utf-8');
        if (!content) return;
        
        const history: InterviewSession[] = JSON.parse(content);
        
        const now = new Date();
        const SEVENTY_TWO_HOURS_MS = 72 * 60 * 60 * 1000;
        
        const initialLength = history.length;
        const filteredHistory = history.filter(session => {
            const sessionDate = new Date(session.date);
            return now.getTime() - sessionDate.getTime() <= SEVENTY_TWO_HOURS_MS;
        });
        
        if (filteredHistory.length !== initialLength) {
            fs.writeFileSync(HISTORY_FILE, JSON.stringify(filteredHistory, null, 2), 'utf-8');
            console.log(`[Cleanup] Removed ${initialLength - filteredHistory.length} old interview sessions at ${new Date().toISOString()}`);
        }
    } catch (error) {
        console.error('Error cleaning interview history:', error);
    }
}

export function runCleanupJob(): void {
    cleanRateLimits();
    cleanInterviewHistory();
}
