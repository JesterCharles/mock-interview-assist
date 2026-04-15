'use client';

// Interview page - Main interview session UI

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Flag, Loader2 } from 'lucide-react';
import { useInterviewStore } from '@/store/interviewStore';
import QuestionCard from '@/components/QuestionCard';
import ProgressBar from '@/components/ProgressBar';
import { ParsedQuestion, StarterQuestion } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';

export default function InterviewPage() {
    const router = useRouter();
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const {
        session,
        getCurrentQuestion,
        getAssessment,
        getAllQuestions,
        getProgress,
        toggleKeyword,
        toggleSoftSkill,
        setInterviewerNotes,
        markDidNotGetTo,
        completeQuestion,
        setLLMResult,
        nextQuestion,
        previousQuestion,
        setCurrentQuestionIndex,
        finishInterview,
    } = useInterviewStore();

    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
            return;
        }
        if (!session || session.status !== 'in-progress') {
            router.push('/dashboard');
        }
    }, [session, router, isAuthenticated, authLoading]);

    const currentQuestion = getCurrentQuestion();
    const allQuestions = getAllQuestions();
    const progress = getProgress();

    const currentAssessment = currentQuestion
        ? getAssessment(currentQuestion.id)
        : undefined;

    const handleComplete = useCallback(() => {
        if (!currentQuestion || !currentAssessment) return;

        completeQuestion(currentQuestion.id);

        const currentQId = currentQuestion.id;
        const isStarter = 'type' in currentQuestion;

        // Start LLM scoring via server-side API in the background
        fetch('/api/score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                question: {
                    question: currentQuestion.question,
                    modelAnswer: 'modelAnswer' in currentQuestion ? (currentQuestion as ParsedQuestion).modelAnswer : undefined,
                    type: isStarter ? (currentQuestion as StarterQuestion).type : undefined,
                    guidelines: isStarter ? (currentQuestion as StarterQuestion).guidelines : undefined,
                },
                assessment: currentAssessment,
            }),
        }).then(response => {
            if (response.ok) {
                return response.json();
            }
            throw new Error('Network response was not ok');
        }).then(result => {
            setLLMResult(currentQId, result.score, result.feedback);
        }).catch(error => {
            console.error('LLM scoring failed:', error);
            setLLMResult(currentQId, 3, 'Scoring temporarily unavailable. Please review manually.');
        });

        // Move to next question immediately
        if (progress.current < progress.total) {
            nextQuestion();
        }
    }, [currentQuestion, currentAssessment, progress, completeQuestion, setLLMResult, nextQuestion]);
    const handleSkip = useCallback(() => {
        if (progress.current < progress.total) {
            nextQuestion();
        }
    }, [progress, nextQuestion]);

    const handleFinishInterview = async () => {
        finishInterview();
        // Small delay to ensure store state is persisted before navigation
        await new Promise(resolve => setTimeout(resolve, 100));
        router.push('/review');
    };

    const handleNavigate = (index: number) => {
        setCurrentQuestionIndex(index);
    };

    if (!session || !currentQuestion || !currentAssessment) {
        return (
            <div
                className="flex flex-col items-center justify-center p-4 min-h-screen"
                style={{ background: 'var(--bg)' }}
            >
                <div className="flex flex-col items-center animate-fade-in">
                    <Loader2 className="w-7 h-7 animate-spin" style={{ color: 'var(--accent)' }} />
                </div>
            </div>
        );
    }

    const questionIds = allQuestions.map(q => q.id);
    const isLastQuestion = progress.current === progress.total;

    return (
        <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
            <div className="container mx-auto px-4 py-8 max-w-4xl flex flex-col">
                {/* Header */}
                <header
                    className="flex items-center justify-between mb-6 pb-4"
                    style={{ borderBottom: '1px solid var(--border-subtle)' }}
                >
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="flex items-center gap-2 transition-colors text-sm font-medium hover:underline"
                        style={{ color: 'var(--muted)' }}
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Exit Interview
                    </button>

                    {session.candidateName && (
                        <div className="flex flex-col items-end gap-1">
                            <span
                                style={{
                                    fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
                                    fontSize: 11,
                                    fontWeight: 500,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.08em',
                                    color: 'var(--muted)',
                                }}
                            >
                                Interviewing
                            </span>
                            <span
                                className="text-sm font-medium px-3 py-1.5"
                                style={{
                                    background: 'var(--surface-muted)',
                                    border: '1px solid var(--border-subtle)',
                                    borderRadius: 6,
                                    color: 'var(--ink)',
                                }}
                            >
                                {session.candidateName}
                            </span>
                        </div>
                    )}
                </header>

                {/* Progress Bar */}
                <ProgressBar
                    currentIndex={session.currentQuestionIndex}
                    totalQuestions={progress.total}
                    assessments={session.assessments}
                    questionIds={questionIds}
                    onNavigate={handleNavigate}
                />

                {/* Question Card */}
                <QuestionCard
                    question={currentQuestion}
                    assessment={currentAssessment}
                    questionNumber={progress.current}
                    totalQuestions={progress.total}
                    onToggleKeyword={(keyword) => toggleKeyword(currentQuestion.id, keyword)}
                    onToggleSoftSkill={(skill) => toggleSoftSkill(currentQuestion.id, skill)}
                    onNotesChange={(notes) => setInterviewerNotes(currentQuestion.id, notes)}
                    onComplete={handleComplete}
                    onSkip={handleSkip}
                    onDidNotGetTo={(value) => markDidNotGetTo(currentQuestion.id, value)}
                    isProcessing={false}
                />

                {/* Navigation */}
                <div className="mt-6 flex items-center justify-between">
                    <button
                        onClick={previousQuestion}
                        disabled={session.currentQuestionIndex === 0}
                        className="btn-secondary-flat text-sm disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Previous
                    </button>

                    <div className="flex items-center gap-3">
                        {!isLastQuestion ? (
                            <button
                                onClick={nextQuestion}
                                className="btn-secondary-flat text-sm"
                            >
                                Next
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                onClick={handleFinishInterview}
                                className="btn-accent-flat text-sm"
                            >
                                <Flag className="w-4 h-4" />
                                Finish Interview
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
