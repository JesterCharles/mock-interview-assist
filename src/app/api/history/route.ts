// API route to manage interview history stored on the file system

import { NextRequest, NextResponse } from 'next/server';
import { InterviewSession } from '@/lib/types';
import { isAuthenticatedSession } from '@/lib/auth-server';
import { readHistory, writeHistory } from '@/lib/historyService';

// GET - Retrieve all interview history
export async function GET() {
    try {
        if (!(await isAuthenticatedSession())) {
            return NextResponse.json({ error: 'Unauthorized access' }, { status: 401 });
        }
        const history = readHistory();
        return NextResponse.json({ history });
    } catch (error) {
        console.error('Error loading history:', error);
        return NextResponse.json({ error: 'Failed to load history' }, { status: 500 });
    }
}

// POST - Save a completed interview to history
export async function POST(request: NextRequest) {
    try {
        if (!(await isAuthenticatedSession())) {
            return NextResponse.json({ error: 'Unauthorized access' }, { status: 401 });
        }
        const session: InterviewSession = await request.json();

        const history = readHistory();

        // Check if session already exists (update it) or add new
        const existingIndex = history.findIndex(h => h.id === session.id);
        if (existingIndex >= 0) {
            history[existingIndex] = session;
        } else {
            // Add to beginning of array (newest first)
            history.unshift(session);
        }

        // Keep only last 100 sessions to prevent file from growing too large
        const trimmedHistory = history.slice(0, 100);
        writeHistory(trimmedHistory);

        return NextResponse.json({ success: true, totalSessions: trimmedHistory.length });
    } catch (error) {
        console.error('Error saving to history:', error);
        return NextResponse.json({ error: 'Failed to save to history' }, { status: 500 });
    }
}

// DELETE - Remove a session from history
export async function DELETE(request: NextRequest) {
    try {
        if (!(await isAuthenticatedSession())) {
            return NextResponse.json({ error: 'Unauthorized access' }, { status: 401 });
        }
        const { sessionId } = await request.json();

        const history = readHistory();
        const filteredHistory = history.filter(h => h.id !== sessionId);
        writeHistory(filteredHistory);

        return NextResponse.json({ success: true, totalSessions: filteredHistory.length });
    } catch (error) {
        console.error('Error deleting from history:', error);
        return NextResponse.json({ error: 'Failed to delete from history' }, { status: 500 });
    }
}
