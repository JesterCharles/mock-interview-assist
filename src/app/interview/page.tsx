'use client';

// Interview page - Main interview session UI

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Flag, Loader2 } from 'lucide-react';
import { useInterviewStore } from '@/store/interviewStore';
import QuestionCard from '@/components/QuestionCard';
import ProgressBar from '@/components/ProgressBar';
import { ParsedQuestion, StarterQuestion } from '@/lib/types';

export default function InterviewPage() {
    const router = useRouter();
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
        if (!session || session.status !== 'in-progress') {
            router.push('/');
        }
    }, [session, router]);

    const currentQuestion = getCurrentQuestion();
    const allQuestions = getAllQuestions();
    const progress = getProgress();

    const currentAssessment = currentQuestion
        ? getAssessment(currentQuestion.id)
        : undefined;

    const handleComplete = useCallback(async () => {
        if (!currentQuestion || !currentAssessment) return;

        setIsProcessing(true);
        completeQuestion(currentQuestion.id);

        // Start LLM scoring via server-side API (uses env variable)
        try {
            // Determine if this is a starter question
            const isStarter = 'type' in currentQuestion;

            const response = await fetch('/api/score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: {
                        question: currentQuestion.question,
                        modelAnswer: 'modelAnswer' in currentQuestion ? (currentQuestion as ParsedQuestion).modelAnswer : undefined,
                        // Include type and guidelines for starter questions
                        type: isStarter ? (currentQuestion as StarterQuestion).type : undefined,
                        guidelines: isStarter ? (currentQuestion as StarterQuestion).guidelines : undefined,
                    },
                    assessment: currentAssessment,
                }),
            });

            if (response.ok) {
                const result = await response.json();
                setLLMResult(currentQuestion.id, result.score, result.feedback);
            } else {
                setLLMResult(currentQuestion.id, 3, 'Scoring temporarily unavailable. Please review manually.');
            }
        } catch (error) {
            console.error('LLM scoring failed:', error);
            setLLMResult(currentQuestion.id, 3, 'Scoring temporarily unavailable. Please review manually.');
        }

        setIsProcessing(false);

        // Move to next question
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
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    const questionIds = allQuestions.map(q => q.id);
    const isLastQuestion = progress.current === progress.total;

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <button
                        onClick={() => router.push('/')}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Exit Interview
                    </button>

                    {session.candidateName && (
                        <div className="text-right">
                            <p className="text-sm text-gray-500">Interviewing</p>
                            <p className="font-semibold text-gray-900">{session.candidateName}</p>
                        </div>
                    )}
                </div>

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
                    isProcessing={isProcessing}
                />

                {/* Navigation */}
                <div className="mt-6 flex items-center justify-between">
                    <button
                        onClick={previousQuestion}
                        disabled={session.currentQuestionIndex === 0}
                        className="px-4 py-2 flex items-center gap-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Previous
                    </button>

                    <div className="flex items-center gap-3">
                        {!isLastQuestion ? (
                            <button
                                onClick={nextQuestion}
                                className="px-4 py-2 flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
                            >
                                Next
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                onClick={handleFinishInterview}
                                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2"
                            >
                                <Flag className="w-5 h-5" />
                                Finish Interview
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
