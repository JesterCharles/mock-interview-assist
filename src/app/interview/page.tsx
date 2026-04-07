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
            <div className="nlm-bg flex flex-col items-center justify-center p-4 min-h-screen">
                <div className="flex flex-col items-center animate-fade-in">
                    <div className="w-14 h-14 bg-gradient-to-br from-cyan-400 to-indigo-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-cyan-500/30">
                        <Loader2 className="w-7 h-7 animate-spin text-white" />
                    </div>
                </div>
            </div>
        );
    }

    const questionIds = allQuestions.map(q => q.id);
    const isLastQuestion = progress.current === progress.total;

    return (
        <main className="nlm-bg min-h-screen">
            <div className="container mx-auto px-4 py-8 max-w-4xl flex flex-col">
                {/* Header */}
                <header className="flex items-center justify-between mb-6 pb-4 border-b border-white/[0.06]">
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Exit Interview
                    </button>

                    {session.candidateName && (
                        <div className="flex flex-col items-end gap-1">
                            <span className="text-xs font-bold gradient-text-static uppercase tracking-widest">Interviewing</span>
                            <span className="text-sm font-medium text-slate-300 bg-white/[0.07] px-3 py-1.5 rounded-md border border-white/[0.06]">
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
                        className="px-4 py-2.5 flex items-center gap-2 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm font-medium"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Previous
                    </button>

                    <div className="flex items-center gap-3">
                        {!isLastQuestion ? (
                            <button
                                onClick={nextQuestion}
                                className="px-4 py-2.5 flex items-center gap-2 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all text-sm font-medium"
                            >
                                Next
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                onClick={handleFinishInterview}
                                className="btn-accent px-6 py-2.5 text-sm"
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
