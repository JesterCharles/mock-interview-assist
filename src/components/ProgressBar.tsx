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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-700">Interview Progress</h3>
                <span className="text-sm text-gray-500">
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
                                    ? 'bg-gray-200 text-gray-400'
                                    : isCompleted
                                        ? 'bg-green-500 text-white'
                                        : isProcessing
                                            ? 'bg-yellow-400 text-white animate-pulse'
                                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
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
            <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                    style={{
                        width: `${((currentIndex + 1) / totalQuestions) * 100}%`,
                    }}
                />
            </div>
        </div>
    );
}
