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
import { InterviewSession, ParsedQuestion, StarterQuestion } from '@/lib/types';
import { calculateAggregateScores } from '@/lib/langchain';
import { useInterviewStore } from '@/store/interviewStore';

export default function HistoryPage() {
    const router = useRouter();
    const { session: currentSession } = useInterviewStore();

    const [history, setHistory] = useState<InterviewSession[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        loadHistory();
    }, []);

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
        // Store session temporarily and navigate to PDF page
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
        if (score >= 4) return 'text-green-600';
        if (score >= 3) return 'text-amber-600';
        return 'text-red-600';
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
            <div className="container mx-auto px-4 py-8 max-w-5xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <button
                        onClick={() => router.push('/')}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Back to Home
                    </button>

                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <HistoryIcon className="w-6 h-6 text-indigo-600" />
                        Interview History
                    </h1>

                    <div className="w-24" /> {/* Spacer for alignment */}
                </div>

                {/* Empty State */}
                {history.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                        <HistoryIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-gray-700 mb-2">No Interview History</h2>
                        <p className="text-gray-500 mb-6">
                            Completed interviews will appear here after generating a PDF report.
                        </p>
                        <button
                            onClick={() => router.push('/')}
                            className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
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
                                    className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
                                >
                                    {/* Header Row */}
                                    <div
                                        className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                                        onClick={() => setExpandedId(isExpanded ? null : session.id)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-6">
                                                {/* Candidate Info */}
                                                <div>
                                                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                                                        <User className="w-4 h-4" />
                                                        {session.candidateName || 'Unnamed Candidate'}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-gray-400 text-xs">
                                                        <Calendar className="w-3 h-3" />
                                                        {formatDate(session.date)}
                                                    </div>
                                                </div>

                                                {/* Score */}
                                                <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
                                                    <div className="flex items-center gap-1">
                                                        {[1, 2, 3, 4, 5].map((star) => (
                                                            <Star
                                                                key={star}
                                                                className={`w-4 h-4 ${star <= scores.averageScore
                                                                        ? 'text-amber-400 fill-amber-400'
                                                                        : 'text-gray-300'
                                                                    }`}
                                                            />
                                                        ))}
                                                    </div>
                                                    <span className={`font-bold ${getScoreColor(scores.averageScore)}`}>
                                                        {scores.averageScore}/5
                                                    </span>
                                                </div>

                                                {/* Stats */}
                                                <div className="text-sm text-gray-500">
                                                    {scores.completedCount}/{allQuestions.length} questions
                                                    {scores.skippedCount > 0 && (
                                                        <span className="text-gray-400">
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
                                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
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
                                                    className="p-2 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                                                >
                                                    {deletingId === session.id ? (
                                                        <Loader2 className="w-5 h-5 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-5 h-5" />
                                                    )}
                                                </button>
                                                {isExpanded ? (
                                                    <ChevronUp className="w-5 h-5 text-gray-400" />
                                                ) : (
                                                    <ChevronDown className="w-5 h-5 text-gray-400" />
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    {isExpanded && (
                                        <div className="border-t border-gray-100 p-6 bg-gray-50">
                                            <div className="grid grid-cols-3 gap-4 mb-6">
                                                <div className="bg-white p-4 rounded-lg">
                                                    <p className="text-sm text-gray-500 mb-1">Technical Score</p>
                                                    <p className={`text-2xl font-bold ${getScoreColor(scores.technicalScore)}`}>
                                                        {scores.technicalScore}/5
                                                    </p>
                                                </div>
                                                <div className="bg-white p-4 rounded-lg">
                                                    <p className="text-sm text-gray-500 mb-1">Soft Skills Score</p>
                                                    <p className={`text-2xl font-bold ${getScoreColor(scores.softSkillScore)}`}>
                                                        {scores.softSkillScore}/5
                                                    </p>
                                                </div>
                                                <div className="bg-white p-4 rounded-lg">
                                                    <p className="text-sm text-gray-500 mb-1">Weeks Covered</p>
                                                    <p className="text-2xl font-bold text-gray-700">
                                                        {session.selectedWeeks.join(', ')}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Question List */}
                                            <h4 className="font-semibold text-gray-700 mb-3">Question Feedback</h4>
                                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                                {allQuestions.map((question, index) => {
                                                    const assessment = session.assessments[question.id];
                                                    if (!assessment || assessment.didNotGetTo) return null;

                                                    return (
                                                        <div
                                                            key={question.id}
                                                            className="bg-white p-4 rounded-lg border border-gray-100"
                                                        >
                                                            <div className="flex items-start gap-3">
                                                                <span className="text-sm font-medium text-gray-400 mt-0.5">
                                                                    Q{index + 1}
                                                                </span>
                                                                <div className="flex-1">
                                                                    <p className="font-medium text-gray-800 text-sm mb-2">
                                                                        {question.question}
                                                                    </p>
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        {[1, 2, 3, 4, 5].map((star) => (
                                                                            <Star
                                                                                key={star}
                                                                                className={`w-3 h-3 ${star <= (assessment.finalScore || 0)
                                                                                        ? 'text-amber-400 fill-amber-400'
                                                                                        : 'text-gray-300'
                                                                                    }`}
                                                                            />
                                                                        ))}
                                                                    </div>
                                                                    <p className="text-gray-600 text-sm">
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
