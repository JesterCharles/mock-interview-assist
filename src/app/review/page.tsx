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

export default function ReviewPage() {
    const router = useRouter();
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
    const [technicalFeedbackText, setTechnicalFeedbackText] = useState('');
    const [softSkillFeedbackText, setSoftSkillFeedbackText] = useState('');

    // Wait for store hydration before checking session
    useEffect(() => {
        setIsHydrated(true);
    }, []);

    useEffect(() => {
        // Only check after hydration to avoid race condition with persisted store
        if (!isHydrated) return;

        // Only allow access to review page if interview is finished
        if (!session || (session.status !== 'review' && session.status !== 'completed')) {
            router.push('/');
        }
    }, [session, router, isHydrated]);

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
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    const allQuestions = getAllQuestions();
    const aggregateScores = calculateAggregateScores(session.assessments);

    // Generate GENERALIZED feedback across all questions


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
        if (didNotGetTo) {
            return { icon: SkipForward, color: 'text-gray-400', bg: 'bg-gray-100', label: 'Skipped' };
        }
        switch (status) {
            case 'validated':
                return { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100', label: 'Validated' };
            case 'ready':
                return { icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-100', label: 'Needs Review' };
            case 'processing':
                return { icon: Loader2, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Processing' };
            default:
                return { icon: AlertCircle, color: 'text-gray-400', bg: 'bg-gray-100', label: 'Pending' };
        }
    };

    const allValidated = allQuestions.every(q => {
        const assessment = getAssessment(q.id);
        return assessment?.didNotGetTo || assessment?.status === 'validated';
    });

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
            <div className="container mx-auto px-4 py-8 max-w-5xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <button
                        onClick={() => router.push('/interview')}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Back to Interview
                    </button>

                    <h1 className="text-2xl font-bold text-gray-900">Review & Validate Scores</h1>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleValidateAll}
                            className="px-4 py-2 text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
                        >
                            Accept All
                        </button>
                        <button
                            onClick={handleGeneratePDF}
                            disabled={!allValidated || isGeneratingPDF}
                            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <p className="text-sm text-gray-500 mb-1">Overall Score</p>
                        <p className="text-3xl font-bold text-indigo-600">{aggregateScores.averageScore}/5</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 relative group">
                        <p className="text-sm text-gray-500 mb-1">Technical Score</p>
                        {editingOverall ? (
                            <input
                                type="number"
                                min="1"
                                max="5"
                                step="0.1"
                                value={overallTechnical}
                                onChange={(e) => setOverallTechnical(parseFloat(e.target.value) || 0)}
                                className="w-20 text-2xl font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded px-2 py-1"
                            />
                        ) : (
                            <p className="text-3xl font-bold text-blue-600">
                                {(session?.overallTechnicalScore ?? aggregateScores.technicalScore).toFixed(1)}/5
                            </p>
                        )}
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 relative group">
                        <p className="text-sm text-gray-500 mb-1">Soft Skills Score</p>
                        {editingOverall ? (
                            <input
                                type="number"
                                min="1"
                                max="5"
                                step="0.1"
                                value={overallSoftSkill}
                                onChange={(e) => setOverallSoftSkill(parseFloat(e.target.value) || 0)}
                                className="w-20 text-2xl font-bold text-purple-600 bg-purple-50 border border-purple-200 rounded px-2 py-1"
                            />
                        ) : (
                            <p className="text-3xl font-bold text-purple-600">
                                {(session?.overallSoftSkillScore ?? aggregateScores.softSkillScore).toFixed(1)}/5
                            </p>
                        )}
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <p className="text-sm text-gray-500 mb-1">Questions</p>
                        <p className="text-3xl font-bold text-gray-700">
                            {aggregateScores.completedCount}
                            <span className="text-lg text-gray-400">/{allQuestions.length}</span>
                        </p>
                    </div>
                </div>

                {/* Edit Overall Scores Toggle */}
                <div className="flex justify-end mb-4">
                    {editingOverall ? (
                        <div className="flex gap-2">
                            <button
                                onClick={() => setEditingOverall(false)}
                                className="px-3 py-1 text-gray-600 hover:text-gray-800 text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    setOverallScores(overallTechnical, overallSoftSkill);
                                    setOverallFeedback(technicalFeedbackText, softSkillFeedbackText);
                                    setEditingOverall(false);
                                }}
                                className="px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 flex items-center gap-1"
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
                            className="px-3 py-1 text-indigo-600 hover:text-indigo-700 text-sm flex items-center gap-1"
                        >
                            <Edit3 className="w-3 h-3" />
                            Edit Overall Scores & Generate Feedback
                        </button>
                    )}
                </div>

                {/* Overall Feedback Sections */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <div className="bg-blue-50 rounded-xl shadow-sm border border-blue-200 p-6">
                        <h3 className="text-sm font-semibold text-blue-700 mb-2">Overall Technical Feedback</h3>
                        {editingOverall ? (
                            <textarea
                                value={technicalFeedbackText}
                                onChange={(e) => setTechnicalFeedbackText(e.target.value)}
                                placeholder="Summarize the candidate's technical strengths and areas for improvement..."
                                className="w-full h-32 p-3 border border-blue-300 rounded-lg text-sm text-gray-900 bg-white resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        ) : (
                            <p className="text-gray-600 text-sm">
                                {session?.technicalFeedback || 'No overall technical feedback provided yet. Click "Edit Overall Scores" to add.'}
                            </p>
                        )}
                    </div>
                    <div className="bg-purple-50 rounded-xl shadow-sm border border-purple-200 p-6">
                        <h3 className="text-sm font-semibold text-purple-700 mb-2">Overall Soft Skills Feedback</h3>
                        {editingOverall ? (
                            <textarea
                                value={softSkillFeedbackText}
                                onChange={(e) => setSoftSkillFeedbackText(e.target.value)}
                                placeholder="Summarize the candidate's communication, confidence, and presentation..."
                                className="w-full h-32 p-3 border border-purple-300 rounded-lg text-sm text-gray-900 bg-white resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                        ) : (
                            <p className="text-gray-600 text-sm">
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
                                className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${assessment.didNotGetTo ? 'opacity-60' : ''
                                    }`}
                            >
                                <div className="p-6">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="text-sm font-medium text-gray-500">
                                                    Q{index + 1}
                                                </span>
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.color}`}>
                                                    <StatusIcon className={`w-3 h-3 inline-block mr-1 ${assessment.status === 'processing' ? 'animate-spin' : ''}`} />
                                                    {statusInfo.label}
                                                </span>
                                            </div>
                                            <h3 className="text-lg font-medium text-gray-900 mb-3">
                                                {isParsedQuestion ? (question as ParsedQuestion).question : (question as StarterQuestion).question}
                                            </h3>

                                            {!assessment.didNotGetTo && (
                                                <>
                                                    {/* Score Display/Edit */}
                                                    {isEditing ? (
                                                        <div className="space-y-4 bg-gray-50 rounded-lg p-4">
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                                    Score (1-5)
                                                                </label>
                                                                <div className="flex items-center gap-2">
                                                                    {[1, 2, 3, 4, 5].map((score) => (
                                                                        <button
                                                                            key={score}
                                                                            onClick={() => setEditScore(score)}
                                                                            className={`w-10 h-10 rounded-lg font-medium transition-all ${editScore === score
                                                                                ? 'bg-indigo-600 text-white shadow-md'
                                                                                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                                                                }`}
                                                                        >
                                                                            {score}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                                    Feedback
                                                                </label>
                                                                <textarea
                                                                    value={editFeedback}
                                                                    onChange={(e) => setEditFeedback(e.target.value)}
                                                                    className="w-full h-24 p-3 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                                                />
                                                            </div>
                                                            <div className="flex justify-end gap-3">
                                                                <button
                                                                    onClick={() => setEditingId(null)}
                                                                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                                                                >
                                                                    Cancel
                                                                </button>
                                                                <button
                                                                    onClick={handleSaveEdit}
                                                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                                                                >
                                                                    <Save className="w-4 h-4" />
                                                                    Save
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-start gap-4">
                                                            <div className="flex items-center gap-1">
                                                                {[1, 2, 3, 4, 5].map((star) => (
                                                                    <Star
                                                                        key={star}
                                                                        className={`w-5 h-5 ${star <= (assessment.finalScore || assessment.llmScore || 0)
                                                                            ? 'text-amber-400 fill-amber-400'
                                                                            : 'text-gray-300'
                                                                            }`}
                                                                    />
                                                                ))}
                                                            </div>
                                                            <p className="flex-1 text-gray-600 text-sm">
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
                                                            className="p-2 text-amber-500 hover:text-amber-600 transition-colors disabled:opacity-50"
                                                            title="Retry AI scoring"
                                                        >
                                                            <RefreshCw className={`w-5 h-5 ${retryingId === question.id ? 'animate-spin' : ''}`} />
                                                        </button>
                                                    )}
                                                <button
                                                    onClick={() => handleStartEdit(question.id)}
                                                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
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
                                                        className="p-2 text-green-500 hover:text-green-600 transition-colors"
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
                                        <div className="mt-4 pt-4 border-t border-gray-100">
                                            <p className="text-sm text-gray-500">
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
                        <p className="text-amber-600 mb-4">
                            Please validate all scores before generating the PDF report.
                        </p>
                    )}
                </div>
            </div>
        </main>
    );
}
