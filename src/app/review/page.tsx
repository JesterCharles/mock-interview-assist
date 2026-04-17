'use client';

// Review page - Validate LLM scores and generate PDF

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    FileDown,
    CheckCircle2,
    AlertCircle,
    Edit3,
    Save,
    Loader2,
    SkipForward,
    Star,
    RefreshCw
} from 'lucide-react';
import { useInterviewStore } from '@/store/interviewStore';
import { calculateAggregateScores } from '@/lib/langchain';
import { ParsedQuestion, StarterQuestion } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';

const surfaceCard: React.CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
};

const surfaceMuted: React.CSSProperties = {
    background: 'var(--surface-muted)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 12,
};

const headingDisplay: React.CSSProperties = {
    fontFamily: "var(--font-clash-display), 'Clash Display', system-ui, sans-serif",
    fontWeight: 600,
    letterSpacing: '-0.01em',
    color: 'var(--ink)',
};

const monoLabel: React.CSSProperties = {
    fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
    fontSize: 11,
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'var(--muted)',
};

const tabularNums: React.CSSProperties = {
    fontVariantNumeric: 'tabular-nums',
};

export default function ReviewPage() {
    const router = useRouter();
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const {
        session,
        getAllQuestions,
        getAssessment,
        validateScore,
        markDidNotGetTo,
        completeReview,
        setOverallScores,
        setOverallFeedback,
        setLLMResult,
    } = useInterviewStore();

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editScore, setEditScore] = useState<number>(3);
    const [editFeedback, setEditFeedback] = useState<string>('');
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [isHydrated, setIsHydrated] = useState(false);
    const [retryingId, setRetryingId] = useState<string | null>(null);

    // Overall scores editing state
    const [editingOverall, setEditingOverall] = useState(false);
    const [overallTechnical, setOverallTechnical] = useState<number>(0);
    const [overallSoftSkill, setOverallSoftSkill] = useState<number>(0);
    const [softSkillWeight, setSoftSkillWeight] = useState<number>(50); // 50% default weight
    const [technicalFeedbackText, setTechnicalFeedbackText] = useState('');
    const [softSkillFeedbackText, setSoftSkillFeedbackText] = useState('');

    // Wait for store hydration before checking session
    useEffect(() => {
        setIsHydrated(true);
    }, []);

    useEffect(() => {
        // Only check after hydration to avoid race condition with persisted store
        if (!isHydrated) return;

        // Auth check first
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
            return;
        }

        // Only allow access to review page if interview is finished
        if (!session || (session.status !== 'review' && session.status !== 'completed')) {
            router.push('/dashboard');
        }
    }, [session, router, isHydrated, isAuthenticated, authLoading]);

    // Auto-generate overall feedback when page loads (if not already set)
    useEffect(() => {
        if (!isHydrated || !session) return;

        // Only generate if feedback hasn't been saved yet
        if (!session.technicalFeedback && !session.softSkillFeedback) {

            const generateFeedback = async () => {
                // Set temporary loading state
                setTechnicalFeedbackText('Generating detailed technical summary with AI...');
                setSoftSkillFeedbackText('Synthesizing soft skills observations...');
                setOverallFeedback(
                    'Generating detailed technical summary with AI...',
                    'Synthesizing soft skills observations...'
                );

                try {
                    const allQs = [...(session.starterQuestions || []), ...(session.questions || [])];
                    const response = await fetch('/api/generate-summary', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            assessments: session.assessments,
                            questions: allQs
                        })
                    });

                    if (response.ok) {
                        const data = await response.json();
                        setOverallFeedback(data.technicalFeedback, data.softSkillFeedback);

                        // If we are currently editing, update the local state too
                        if (editingOverall) {
                            setTechnicalFeedbackText(data.technicalFeedback);
                            setSoftSkillFeedbackText(data.softSkillFeedback);
                        }
                    } else {
                        console.error('Failed to generate summary');
                        setOverallFeedback(
                            'Failed to generate summary. Please try editing manually.',
                            'Failed to generate summary. Please try editing manually.'
                        );
                    }
                } catch (error) {
                    console.error('Summary generation error:', error);
                }
            };

            // Use a small timeout to ensure hydration and avoid blocked UI
            const timer = setTimeout(generateFeedback, 500);
            return () => clearTimeout(timer);
        }
    }, [isHydrated, session, setOverallFeedback, editingOverall]);

    if (!session) {
        return (
            <div
                className="min-h-screen flex items-center justify-center"
                style={{ background: 'var(--bg)' }}
            >
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
            </div>
        );
    }

    const allQuestions = getAllQuestions();
    const aggregateScores = calculateAggregateScores(session.assessments);

    const handleStartEdit = (questionId: string) => {
        const assessment = getAssessment(questionId);
        if (assessment) {
            setEditingId(questionId);
            setEditScore(assessment.llmScore || assessment.finalScore || 3);
            setEditFeedback(assessment.llmFeedback || assessment.finalFeedback || '');
        }
    };

    const handleSaveEdit = () => {
        if (editingId) {
            validateScore(editingId, editScore, editFeedback);
            setEditingId(null);
        }
    };

    const handleValidateAll = () => {
        allQuestions.forEach(q => {
            const assessment = getAssessment(q.id);
            if (assessment && !assessment.didNotGetTo && assessment.status !== 'validated') {
                validateScore(
                    q.id,
                    assessment.llmScore || 3,
                    assessment.llmFeedback || 'No feedback available.'
                );
            }
        });
    };

    // Retry LLM scoring for a specific question
    const handleRetryScoring = async (questionId: string) => {
        if (!session) return;

        const question = allQuestions.find(q => q.id === questionId);
        const assessment = getAssessment(questionId);
        if (!question || !assessment) return;

        setRetryingId(questionId);

        try {
            const isStarter = 'type' in question;

            const response = await fetch('/api/score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: {
                        question: question.question,
                        modelAnswer: 'modelAnswer' in question ? (question as ParsedQuestion).modelAnswer : undefined,
                        type: isStarter ? (question as StarterQuestion).type : undefined,
                        guidelines: isStarter ? (question as StarterQuestion).guidelines : undefined,
                    },
                    assessment: {
                        keywordsHit: assessment.keywordsHit,
                        keywordsMissed: assessment.keywordsMissed,
                        softSkills: assessment.softSkills,
                        interviewerNotes: assessment.interviewerNotes,
                    },
                }),
            });

            if (response.ok) {
                const result = await response.json();
                setLLMResult(questionId, result.score, result.feedback);
            } else {
                console.error('Retry failed:', response.statusText);
            }
        } catch (error) {
            console.error('Retry scoring failed:', error);
        } finally {
            setRetryingId(null);
        }
    };

    const handleGeneratePDF = async () => {
        setIsGeneratingPDF(true);

        try {
            // Save session to history
            if (session) {
                await fetch('/api/history', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(session),
                });
            }

            // Navigate to PDF generation page
            completeReview();
            router.push('/pdf');
        } catch (error) {
            console.error('PDF generation failed:', error);
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    const getStatusInfo = (status: string, didNotGetTo: boolean) => {
        // DESIGN.md Semantic Badge Colors
        if (didNotGetTo) {
            return {
                icon: SkipForward,
                bg: 'var(--surface-muted)',
                border: 'var(--border-subtle)',
                text: 'var(--muted)',
                label: 'Skipped',
            };
        }
        switch (status) {
            case 'validated':
                return {
                    icon: CheckCircle2,
                    bg: 'var(--success-bg)',
                    border: 'var(--success)',
                    text: 'var(--success)',
                    label: 'Validated',
                };
            case 'ready':
                return {
                    icon: AlertCircle,
                    bg: 'var(--warning-bg)',
                    border: 'var(--warning)',
                    text: 'var(--warning)',
                    label: 'Needs Review',
                };
            case 'processing':
                return {
                    icon: Loader2,
                    bg: 'var(--highlight)',
                    border: 'var(--accent)',
                    text: 'var(--accent)',
                    label: 'Processing',
                };
            default:
                return {
                    icon: AlertCircle,
                    bg: 'var(--surface-muted)',
                    border: 'var(--border-subtle)',
                    text: 'var(--muted)',
                    label: 'Pending',
                };
        }
    };

    const allValidated = allQuestions.every(q => {
        const assessment = getAssessment(q.id);
        return assessment?.didNotGetTo || assessment?.status === 'validated';
    });

    return (
        <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
            <div className="container mx-auto px-4 py-8 max-w-5xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <button
                        onClick={() => router.push('/interview')}
                        className="flex items-center gap-2 transition-colors text-sm font-medium hover:underline"
                        style={{ color: 'var(--muted)' }}
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Back to Interview
                    </button>

                    <h1 style={{ ...headingDisplay, fontSize: 28 }}>Review &amp; Validate Scores</h1>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleValidateAll}
                            className="btn-secondary-flat text-sm"
                        >
                            Accept All
                        </button>
                        <button
                            onClick={handleGeneratePDF}
                            disabled={!allValidated || isGeneratingPDF}
                            className="btn-accent-flat text-sm"
                        >
                            {isGeneratingPDF ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <FileDown className="w-5 h-5" />
                            )}
                            Generate PDF
                        </button>
                    </div>
                </div>

                {/* Summary Cards - Editable */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="p-6" style={surfaceCard}>
                        <p style={{ ...monoLabel, marginBottom: 6 }}>Overall Score</p>
                        {editingOverall ? (
                            <>
                                <p style={{ ...headingDisplay, fontSize: 28, color: 'var(--accent)', ...tabularNums }}>
                                    {(
                                        (overallTechnical * (100 - softSkillWeight) + overallSoftSkill * softSkillWeight) / 100
                                    ).toFixed(1)}/5
                                </p>
                                <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                                    Tech {100 - softSkillWeight}% / Soft {softSkillWeight}%
                                </p>
                            </>
                        ) : (
                            <p style={{ ...headingDisplay, fontSize: 28, color: 'var(--accent)', ...tabularNums }}>
                                {aggregateScores.averageScore}/5
                            </p>
                        )}
                    </div>
                    <div className="p-6" style={surfaceCard}>
                        <p style={{ ...monoLabel, marginBottom: 6 }}>Technical Score</p>
                        {editingOverall ? (
                            <input
                                type="number"
                                min="1"
                                max="5"
                                step="0.1"
                                value={overallTechnical}
                                onChange={(e) => setOverallTechnical(parseFloat(e.target.value) || 0)}
                                className="w-20 text-2xl font-bold rounded px-2 py-1 outline-none"
                                style={{
                                    ...headingDisplay,
                                    fontSize: 24,
                                    color: 'var(--ink)',
                                    background: 'var(--bg)',
                                    border: '1px solid var(--border)',
                                    ...tabularNums,
                                }}
                            />
                        ) : (
                            <p style={{ ...headingDisplay, fontSize: 28, color: 'var(--ink)', ...tabularNums }}>
                                {(session?.overallTechnicalScore ?? aggregateScores.technicalScore).toFixed(1)}/5
                            </p>
                        )}
                    </div>
                    <div className="p-6" style={surfaceCard}>
                        <p style={{ ...monoLabel, marginBottom: 6 }}>Soft Skills Score</p>
                        {editingOverall ? (
                            <>
                                <input
                                    type="number"
                                    min="1"
                                    max="5"
                                    step="0.1"
                                    value={overallSoftSkill}
                                    onChange={(e) => setOverallSoftSkill(parseFloat(e.target.value) || 0)}
                                    className="w-20 rounded px-2 py-1 outline-none"
                                    style={{
                                        ...headingDisplay,
                                        fontSize: 24,
                                        color: 'var(--ink)',
                                        background: 'var(--bg)',
                                        border: '1px solid var(--border)',
                                        ...tabularNums,
                                    }}
                                />
                                <div className="mt-3">
                                    <label style={{ ...monoLabel, display: 'block', marginBottom: 4 }}>
                                        Soft Skills Weight: {softSkillWeight}%
                                    </label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="50"
                                        step="5"
                                        value={softSkillWeight}
                                        onChange={(e) => setSoftSkillWeight(parseInt(e.target.value))}
                                        className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
                                        style={{
                                            background: 'var(--border-subtle)',
                                            accentColor: 'var(--accent)',
                                        }}
                                    />
                                </div>
                            </>
                        ) : (
                            <p style={{ ...headingDisplay, fontSize: 28, color: 'var(--ink)', ...tabularNums }}>
                                {(session?.overallSoftSkillScore ?? aggregateScores.softSkillScore).toFixed(1)}/5
                            </p>
                        )}
                    </div>
                    <div className="p-6" style={surfaceCard}>
                        <p style={{ ...monoLabel, marginBottom: 6 }}>Questions</p>
                        <p style={{ ...headingDisplay, fontSize: 28, color: 'var(--ink)', ...tabularNums }}>
                            {aggregateScores.completedCount}
                            <span style={{ fontSize: 16, color: 'var(--muted)', fontWeight: 400 }}>
                                /{allQuestions.length}
                            </span>
                        </p>
                    </div>
                </div>

                {/* Edit Overall Scores Toggle */}
                <div className="flex justify-end mb-4">
                    {editingOverall ? (
                        <div className="flex gap-2">
                            <button
                                onClick={() => setEditingOverall(false)}
                                className="btn-secondary-flat text-xs"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    setOverallScores(overallTechnical, overallSoftSkill);
                                    setOverallFeedback(technicalFeedbackText, softSkillFeedbackText);
                                    setEditingOverall(false);
                                }}
                                className="btn-accent-flat text-xs"
                            >
                                <Save className="w-3 h-3" />
                                Save
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => {
                                setOverallTechnical(session?.overallTechnicalScore ?? aggregateScores.technicalScore);
                                setOverallSoftSkill(session?.overallSoftSkillScore ?? aggregateScores.softSkillScore);

                                // Auto-generate combined feedback if not already set
                                if (!session?.technicalFeedback || !session?.softSkillFeedback) {
                                    // Trigger the effect by clearing them if somehow they are empty strings
                                    setOverallFeedback('', '');
                                    // The effect will catch this next render and start generation
                                } else {
                                    setTechnicalFeedbackText(session?.technicalFeedback ?? '');
                                    setSoftSkillFeedbackText(session?.softSkillFeedback ?? '');
                                }

                                setEditingOverall(true);
                            }}
                            className="btn-secondary-flat text-xs"
                        >
                            <Edit3 className="w-3 h-3" />
                            Edit Overall Scores &amp; Generate Feedback
                        </button>
                    )}
                </div>

                {/* Overall Feedback Sections */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <div className="p-6" style={surfaceMuted}>
                        <h3 style={{ ...monoLabel, color: 'var(--accent)', marginBottom: 8 }}>
                            Overall Technical Feedback
                        </h3>
                        {editingOverall ? (
                            <textarea
                                value={technicalFeedbackText}
                                onChange={(e) => setTechnicalFeedbackText(e.target.value)}
                                placeholder="Summarize the candidate's technical strengths and areas for improvement..."
                                className="w-full h-32 p-3 rounded-lg text-sm resize-none outline-none transition-colors"
                                style={{
                                    background: 'var(--surface)',
                                    border: '1px solid var(--border)',
                                    color: 'var(--ink)',
                                }}
                            />
                        ) : (
                            <p style={{ color: 'var(--ink)', fontSize: 14, lineHeight: 1.6 }}>
                                {session?.technicalFeedback || 'No overall technical feedback provided yet. Click "Edit Overall Scores" to add.'}
                            </p>
                        )}
                    </div>
                    <div className="p-6" style={surfaceMuted}>
                        <h3 style={{ ...monoLabel, color: 'var(--accent)', marginBottom: 8 }}>
                            Overall Soft Skills Feedback
                        </h3>
                        {editingOverall ? (
                            <textarea
                                value={softSkillFeedbackText}
                                onChange={(e) => setSoftSkillFeedbackText(e.target.value)}
                                placeholder="Summarize the candidate's communication, confidence, and presentation..."
                                className="w-full h-32 p-3 rounded-lg text-sm resize-none outline-none transition-colors"
                                style={{
                                    background: 'var(--surface)',
                                    border: '1px solid var(--border)',
                                    color: 'var(--ink)',
                                }}
                            />
                        ) : (
                            <p style={{ color: 'var(--ink)', fontSize: 14, lineHeight: 1.6 }}>
                                {session?.softSkillFeedback || 'No overall soft skills feedback provided yet. Click "Edit Overall Scores" to add.'}
                            </p>
                        )}
                    </div>
                </div>

                {/* Questions List */}
                <div className="space-y-4">
                    {allQuestions.map((question, index) => {
                        const assessment = getAssessment(question.id);
                        if (!assessment) return null;

                        const statusInfo = getStatusInfo(assessment.status, assessment.didNotGetTo);
                        const StatusIcon = statusInfo.icon;
                        const isEditing = editingId === question.id;
                        const isParsedQuestion = 'modelAnswer' in question;

                        return (
                            <div
                                key={question.id}
                                className={`overflow-hidden ${assessment.didNotGetTo ? 'opacity-60' : ''}`}
                                style={surfaceCard}
                            >
                                <div className="p-6">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span style={{ ...monoLabel, color: 'var(--muted)' }}>
                                                    Q{index + 1}
                                                </span>
                                                <span
                                                    className="px-2 py-1 text-xs font-medium inline-flex items-center gap-1"
                                                    style={{
                                                        background: statusInfo.bg,
                                                        border: `1px solid ${statusInfo.border}`,
                                                        borderRadius: 9999,
                                                        color: statusInfo.text,
                                                    }}
                                                >
                                                    <StatusIcon className={`w-3 h-3 ${assessment.status === 'processing' ? 'animate-spin' : ''}`} />
                                                    {statusInfo.label}
                                                </span>
                                            </div>
                                            <h3 style={{ ...headingDisplay, fontSize: 18, marginBottom: 12, lineHeight: 1.5 }}>
                                                {isParsedQuestion ? (question as ParsedQuestion).question : (question as StarterQuestion).question}
                                            </h3>

                                            {!assessment.didNotGetTo && (
                                                <>
                                                    {/* Score Display/Edit */}
                                                    {isEditing ? (
                                                        <div className="space-y-4 p-4" style={surfaceMuted}>
                                                            <div>
                                                                <label style={{ ...monoLabel, display: 'block', marginBottom: 8 }}>
                                                                    Score (1-5)
                                                                </label>
                                                                <div className="flex items-center gap-2">
                                                                    {[1, 2, 3, 4, 5].map((score) => (
                                                                        <button
                                                                            key={score}
                                                                            onClick={() => setEditScore(score)}
                                                                            className="w-10 h-10 rounded-lg font-medium transition-colors"
                                                                            style={{
                                                                                background: editScore === score ? 'var(--accent)' : 'var(--surface)',
                                                                                border: `1px solid ${editScore === score ? 'var(--accent)' : 'var(--border)'}`,
                                                                                color: editScore === score ? 'var(--surface)' : 'var(--ink)',
                                                                                ...tabularNums,
                                                                            }}
                                                                        >
                                                                            {score}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <label style={{ ...monoLabel, display: 'block', marginBottom: 8 }}>
                                                                    Feedback
                                                                </label>
                                                                <textarea
                                                                    value={editFeedback}
                                                                    onChange={(e) => setEditFeedback(e.target.value)}
                                                                    className="w-full h-24 p-3 rounded-lg resize-none outline-none"
                                                                    style={{
                                                                        background: 'var(--surface)',
                                                                        border: '1px solid var(--border)',
                                                                        color: 'var(--ink)',
                                                                    }}
                                                                />
                                                            </div>
                                                            <div className="flex justify-end gap-3">
                                                                <button
                                                                    onClick={() => setEditingId(null)}
                                                                    className="btn-secondary-flat text-sm"
                                                                >
                                                                    Cancel
                                                                </button>
                                                                <button
                                                                    onClick={handleSaveEdit}
                                                                    className="btn-accent-flat text-sm"
                                                                >
                                                                    <Save className="w-4 h-4" />
                                                                    Save
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-start gap-4">
                                                            <div className="flex items-center gap-1">
                                                                {[1, 2, 3, 4, 5].map((star) => {
                                                                    const filled = star <= (assessment.finalScore || assessment.llmScore || 0);
                                                                    return (
                                                                        <Star
                                                                            key={star}
                                                                            className="w-5 h-5"
                                                                            style={{
                                                                                color: filled ? 'var(--accent)' : 'var(--border)',
                                                                                fill: filled ? 'var(--accent)' : 'none',
                                                                            }}
                                                                        />
                                                                    );
                                                                })}
                                                            </div>
                                                            <p style={{ flex: 1, color: 'var(--ink)', fontSize: 14, lineHeight: 1.6 }}>
                                                                {assessment.finalFeedback || assessment.llmFeedback || 'Awaiting feedback...'}
                                                            </p>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        {!assessment.didNotGetTo && !isEditing && (
                                            <div className="flex items-center gap-2">
                                                {/* Retry button - show if feedback looks like an error */}
                                                {(assessment.llmFeedback?.includes('unavailable') ||
                                                    assessment.llmFeedback?.includes('Unable to') ||
                                                    assessment.llmFeedback?.includes('could not be parsed') ||
                                                    assessment.llmFeedback?.includes('retry')) && (
                                                        <button
                                                            onClick={() => handleRetryScoring(question.id)}
                                                            disabled={retryingId === question.id}
                                                            className="p-2 transition-colors disabled:opacity-50"
                                                            style={{ color: 'var(--warning)' }}
                                                            title="Retry AI scoring"
                                                        >
                                                            <RefreshCw className={`w-5 h-5 ${retryingId === question.id ? 'animate-spin' : ''}`} />
                                                        </button>
                                                    )}
                                                <button
                                                    onClick={() => handleStartEdit(question.id)}
                                                    className="p-2 transition-colors"
                                                    style={{ color: 'var(--muted)' }}
                                                    title="Edit score"
                                                >
                                                    <Edit3 className="w-5 h-5" />
                                                </button>
                                                {assessment.status !== 'validated' && (
                                                    <button
                                                        onClick={() => validateScore(
                                                            question.id,
                                                            assessment.llmScore || 3,
                                                            assessment.llmFeedback || 'No feedback available.'
                                                        )}
                                                        className="p-2 transition-colors"
                                                        style={{ color: 'var(--success)' }}
                                                        title="Accept score"
                                                    >
                                                        <CheckCircle2 className="w-5 h-5" />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Keywords Summary */}
                                    {isParsedQuestion && !assessment.didNotGetTo && (
                                        <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                                            <p style={{ fontSize: 13, color: 'var(--muted)', ...tabularNums }}>
                                                Keywords: {assessment.keywordsHit.length} hit, {assessment.keywordsMissed.length} missed
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Bottom Action */}
                <div className="mt-8 text-center">
                    {!allValidated && (
                        <p style={{ color: 'var(--warning)', marginBottom: 16, fontSize: 14 }}>
                            Please validate all scores before generating the PDF report.
                        </p>
                    )}
                </div>
            </div>
        </main>
    );
}
