import fs from 'fs';
import path from 'path';
import { InterviewSession } from '@/lib/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const HISTORY_FILE = path.join(DATA_DIR, 'interview-history.json');

export function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function readHistory(): InterviewSession[] {
  ensureDataDir();
  if (!fs.existsSync(HISTORY_FILE)) {
    return [];
  }
  try {
    const content = fs.readFileSync(HISTORY_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error reading history file:', error);
    return [];
  }
}

export function writeHistory(history: InterviewSession[]): void {
  ensureDataDir();
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}
