'use client';

// Progress bar component for interview navigation

import { CheckCircle2, Circle, SkipForward } from 'lucide-react';
import { QuestionAssessment } from '@/lib/types';

interface ProgressBarProps {
    currentIndex: number;
    totalQuestions: number;
    assessments: Record<string, QuestionAssessment>;
    questionIds: string[];
    onNavigate: (index: number) => void;
}

export default function ProgressBar({
    currentIndex,
    totalQuestions,
    assessments,
    questionIds,
    onNavigate,
}: ProgressBarProps) {
    return (
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-sm border border-slate-700 p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-slate-200">Interview Progress</h3>
                <span className="text-sm text-slate-400">
                    Question {currentIndex + 1} of {totalQuestions}
                </span>
            </div>

            {/* Progress dots */}
            <div className="flex items-center gap-1 overflow-x-auto pb-2">
                {questionIds.map((id, index) => {
                    const assessment = assessments[id];
                    const isCurrent = index === currentIndex;
                    const isCompleted = assessment?.status === 'validated' || assessment?.status === 'ready';
                    const isSkipped = assessment?.didNotGetTo;
                    const isProcessing = assessment?.status === 'processing';

                    return (
                        <button
                            key={`${id}-${index}`}
                            onClick={() => onNavigate(index)}
                            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${isCurrent
                                ? 'bg-indigo-600 text-white scale-110 shadow-md'
                                : isSkipped
                                    ? 'bg-slate-700 text-slate-500'
                                    : isCompleted
                                        ? 'bg-green-500 text-white'
                                        : isProcessing
                                            ? 'bg-amber-500 text-white animate-pulse'
                                            : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
                                }`}
                            title={`Question ${index + 1}${isSkipped ? ' (Skipped)' : isCompleted ? ' (Completed)' : ''}`}
                        >
                            {isSkipped ? (
                                <SkipForward className="w-4 h-4" />
                            ) : isCompleted ? (
                                <CheckCircle2 className="w-4 h-4" />
                            ) : (
                                <span className="text-xs font-medium">{index + 1}</span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Progress bar */}
            <div className="mt-3 h-2 bg-slate-700/50 rounded-full overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                    style={{
                        width: `${((currentIndex + 1) / totalQuestions) * 100}%`,
                    }}
                />
            </div>
        </div>
    );
}
