// API route to manage interview history stored on the file system

import { NextRequest, NextResponse } from 'next/server';
import { InterviewSession } from '@/lib/types';
import { isAuthenticatedSession } from '@/lib/auth-server';
import { readHistory, writeHistory } from '@/lib/historyService';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@/generated/prisma';

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

        // Dual-write to Supabase (D-01: log-and-continue on failure)
        try {
            await prisma.session.upsert({
                where: { id: session.id },
                create: {
                    id: session.id,
                    candidateName: session.candidateName ?? null,
                    interviewerName: session.interviewerName ?? null,
                    date: session.date,
                    status: session.status,
                    questionCount: session.questionCount,
                    selectedWeeks: session.selectedWeeks as unknown as Prisma.InputJsonValue,
                    overallTechnicalScore: session.overallTechnicalScore ?? null,
                    overallSoftSkillScore: session.overallSoftSkillScore ?? null,
                    technicalFeedback: session.technicalFeedback ?? null,
                    softSkillFeedback: session.softSkillFeedback ?? null,
                    questions: session.questions as unknown as Prisma.InputJsonValue,
                    starterQuestions: session.starterQuestions as unknown as Prisma.InputJsonValue,
                    assessments: session.assessments as unknown as Prisma.InputJsonValue,
                },
                update: {
                    candidateName: session.candidateName ?? null,
                    interviewerName: session.interviewerName ?? null,
                    status: session.status,
                    overallTechnicalScore: session.overallTechnicalScore ?? null,
                    overallSoftSkillScore: session.overallSoftSkillScore ?? null,
                    technicalFeedback: session.technicalFeedback ?? null,
                    softSkillFeedback: session.softSkillFeedback ?? null,
                    questions: session.questions as unknown as Prisma.InputJsonValue,
                    starterQuestions: session.starterQuestions as unknown as Prisma.InputJsonValue,
                    assessments: session.assessments as unknown as Prisma.InputJsonValue,
                },
            });
        } catch (dbError) {
            console.error('[dual-write] Supabase write failed:', dbError);
        }

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
