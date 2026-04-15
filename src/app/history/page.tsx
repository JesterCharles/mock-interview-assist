'use client';

// History page - View past interview sessions and regenerate PDFs

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Calendar,
    User,
    FileDown,
    Trash2,
    Loader2,
    Star,
    ChevronDown,
    ChevronUp,
    History as HistoryIcon,
} from 'lucide-react';
import { InterviewSession } from '@/lib/types';
import { calculateAggregateScores } from '@/lib/langchain';
import { useInterviewStore } from '@/store/interviewStore';
import { useAuth } from '@/lib/auth-context';

const displayFont = { fontFamily: 'var(--font-display)' } as const;
const monoLabel = {
    fontFamily: 'var(--font-mono)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
};
const surfaceCardStyle = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
};

export default function HistoryPage() {
    const router = useRouter();
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    useInterviewStore();

    const [history, setHistory] = useState<InterviewSession[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
            return;
        }
        loadHistory();
    }, [authLoading, isAuthenticated, router]);

    const loadHistory = async () => {
        try {
            const response = await fetch('/api/history');
            if (response.ok) {
                const data = await response.json();
                setHistory(data.history || []);
            }
        } catch (error) {
            console.error('Failed to load history:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (sessionId: string) => {
        if (!confirm('Are you sure you want to delete this interview record?')) {
            return;
        }

        setDeletingId(sessionId);
        try {
            const response = await fetch('/api/history', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId }),
            });

            if (response.ok) {
                setHistory(prev => prev.filter(h => h.id !== sessionId));
            }
        } catch (error) {
            console.error('Failed to delete session:', error);
        } finally {
            setDeletingId(null);
        }
    };

    const handleViewPDF = (session: InterviewSession) => {
        sessionStorage.setItem('pdf-session', JSON.stringify(session));
        router.push('/pdf?from=history');
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getScoreColor = (score: number) => {
        if (score >= 4) return 'var(--success)';
        if (score >= 3) return 'var(--warning)';
        return 'var(--danger)';
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
            </div>
        );
    }

    return (
        <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
            <div className="container mx-auto px-4 py-8 max-w-5xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="flex items-center gap-2 transition-colors text-sm"
                        style={{ color: 'var(--muted)' }}
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Back to Home
                    </button>

                    <h1
                        className="flex items-center gap-3"
                        style={{ ...displayFont, fontWeight: 600, fontSize: '28px', color: 'var(--ink)' }}
                    >
                        <HistoryIcon className="w-6 h-6" style={{ color: 'var(--accent)' }} />
                        Interview History
                    </h1>

                    <div className="w-24 hidden sm:block" /> {/* Spacer for alignment */}
                </div>

                {/* Empty State */}
                {history.length === 0 ? (
                    <div className="rounded-xl p-12 text-center" style={surfaceCardStyle}>
                        <HistoryIcon className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--muted)' }} />
                        <h2
                            className="mb-2"
                            style={{ ...displayFont, fontWeight: 600, fontSize: '28px', color: 'var(--ink)' }}
                        >
                            No Interview History
                        </h2>
                        <p className="mb-6" style={{ color: 'var(--muted)' }}>
                            Completed interviews will appear here after generating a PDF report.
                        </p>
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="btn-accent-flat"
                        >
                            Start an Interview
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {history.map((session) => {
                            const scores = calculateAggregateScores(session.assessments);
                            const isExpanded = expandedId === session.id;
                            const allQuestions = [...session.starterQuestions, ...session.questions];

                            return (
                                <div
                                    key={session.id}
                                    className="rounded-lg overflow-hidden"
                                    style={surfaceCardStyle}
                                >
                                    {/* Header Row */}
                                    <div
                                        className="p-4 cursor-pointer transition-colors hover:bg-[var(--highlight)]"
                                        onClick={() => setExpandedId(isExpanded ? null : session.id)}
                                    >
                                        <div className="flex items-center justify-between flex-wrap gap-3">
                                            <div className="flex items-center gap-6 flex-wrap">
                                                {/* Candidate Info */}
                                                <div>
                                                    <div className="flex items-center gap-2 text-sm mb-1" style={{ color: 'var(--ink)' }}>
                                                        <User className="w-4 h-4" style={{ color: 'var(--muted)' }} />
                                                        {session.candidateName || 'Unnamed Candidate'}
                                                    </div>
                                                    <div
                                                        className="flex items-center gap-2 text-xs"
                                                        style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}
                                                    >
                                                        <Calendar className="w-3 h-3" />
                                                        {formatDate(session.date)}
                                                    </div>
                                                </div>

                                                {/* Score */}
                                                <div
                                                    className="flex items-center gap-2 px-3 py-2 rounded-lg"
                                                    style={{
                                                        background: 'var(--surface-muted)',
                                                        border: '1px solid var(--border-subtle)',
                                                    }}
                                                >
                                                    <div className="flex items-center gap-0.5">
                                                        {[1, 2, 3, 4, 5].map((star) => {
                                                            const filled = star <= scores.averageScore;
                                                            return (
                                                                <Star
                                                                    key={star}
                                                                    className="w-4 h-4 flex-shrink-0"
                                                                    style={{
                                                                        color: filled ? 'var(--accent)' : 'var(--border)',
                                                                        fill: filled ? 'var(--accent)' : 'transparent',
                                                                    }}
                                                                />
                                                            );
                                                        })}
                                                    </div>
                                                    <span
                                                        className="font-bold"
                                                        style={{
                                                            color: getScoreColor(scores.averageScore),
                                                            fontFamily: 'var(--font-mono)',
                                                            fontVariantNumeric: 'tabular-nums',
                                                        }}
                                                    >
                                                        {scores.averageScore}/5
                                                    </span>
                                                </div>

                                                {/* Stats */}
                                                <div className="text-sm" style={{ color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
                                                    {scores.completedCount}/{allQuestions.length} questions
                                                    {scores.skippedCount > 0 && (
                                                        <span>
                                                            , {scores.skippedCount} skipped
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                {/* Actions */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleViewPDF(session);
                                                    }}
                                                    className="btn-accent-flat inline-flex items-center gap-2"
                                                >
                                                    <FileDown className="w-4 h-4" />
                                                    View PDF
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(session.id);
                                                    }}
                                                    disabled={deletingId === session.id}
                                                    className="btn-secondary-flat inline-flex items-center gap-2 disabled:opacity-50"
                                                    style={{ color: 'var(--danger)' }}
                                                    aria-label="Delete session"
                                                >
                                                    {deletingId === session.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-4 h-4" />
                                                    )}
                                                </button>
                                                {isExpanded ? (
                                                    <ChevronUp className="w-5 h-5" style={{ color: 'var(--muted)' }} />
                                                ) : (
                                                    <ChevronDown className="w-5 h-5" style={{ color: 'var(--muted)' }} />
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    {isExpanded && (
                                        <div
                                            className="p-6"
                                            style={{
                                                borderTop: '1px solid var(--border-subtle)',
                                                background: 'var(--surface-muted)',
                                            }}
                                        >
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                                <div className="p-4 rounded-lg" style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)' }}>
                                                    <p className="text-xs mb-1" style={{ ...monoLabel, color: 'var(--muted)' }}>Technical Score</p>
                                                    <p
                                                        className="font-bold"
                                                        style={{
                                                            ...displayFont,
                                                            fontSize: '28px',
                                                            color: getScoreColor(scores.technicalScore),
                                                            fontVariantNumeric: 'tabular-nums',
                                                        }}
                                                    >
                                                        {scores.technicalScore}/5
                                                    </p>
                                                </div>
                                                <div className="p-4 rounded-lg" style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)' }}>
                                                    <p className="text-xs mb-1" style={{ ...monoLabel, color: 'var(--muted)' }}>Soft Skills Score</p>
                                                    <p
                                                        className="font-bold"
                                                        style={{
                                                            ...displayFont,
                                                            fontSize: '28px',
                                                            color: getScoreColor(scores.softSkillScore),
                                                            fontVariantNumeric: 'tabular-nums',
                                                        }}
                                                    >
                                                        {scores.softSkillScore}/5
                                                    </p>
                                                </div>
                                                <div className="p-4 rounded-lg" style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)' }}>
                                                    <p className="text-xs mb-1" style={{ ...monoLabel, color: 'var(--muted)' }}>Weeks Covered</p>
                                                    <p
                                                        className="font-bold"
                                                        style={{
                                                            ...displayFont,
                                                            fontSize: '28px',
                                                            color: 'var(--ink)',
                                                            fontVariantNumeric: 'tabular-nums',
                                                        }}
                                                    >
                                                        {session.selectedWeeks.join(', ')}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Question List */}
                                            <h4
                                                className="mb-3"
                                                style={{ ...displayFont, fontWeight: 600, fontSize: '22px', color: 'var(--ink)' }}
                                            >
                                                Question Feedback
                                            </h4>
                                            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                                                {allQuestions.map((question, index) => {
                                                    const assessment = session.assessments[question.id];
                                                    if (!assessment || assessment.didNotGetTo) return null;

                                                    return (
                                                        <div
                                                            key={question.id}
                                                            className="p-4 rounded-lg"
                                                            style={{
                                                                background: 'var(--surface)',
                                                                border: '1px solid var(--border-subtle)',
                                                            }}
                                                        >
                                                            <div className="flex items-start gap-3">
                                                                <span
                                                                    className="text-xs font-medium mt-0.5"
                                                                    style={{ ...monoLabel, color: 'var(--muted)' }}
                                                                >
                                                                    Q{index + 1}
                                                                </span>
                                                                <div className="flex-1 min-w-0">
                                                                    <p
                                                                        className="font-medium text-sm mb-2"
                                                                        style={{ color: 'var(--ink)' }}
                                                                    >
                                                                        {question.question}
                                                                    </p>
                                                                    <div className="flex items-center gap-1 mb-2">
                                                                        {[1, 2, 3, 4, 5].map((star) => {
                                                                            const filled = star <= (assessment.finalScore || 0);
                                                                            return (
                                                                                <Star
                                                                                    key={star}
                                                                                    className="w-3 h-3"
                                                                                    style={{
                                                                                        color: filled ? 'var(--accent)' : 'var(--border)',
                                                                                        fill: filled ? 'var(--accent)' : 'transparent',
                                                                                    }}
                                                                                />
                                                                            );
                                                                        })}
                                                                    </div>
                                                                    <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
                                                                        {assessment.finalFeedback || assessment.llmFeedback || 'No feedback'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </main>
    );
}
