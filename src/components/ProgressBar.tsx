'use client';

import { CheckCircle2, SkipForward, Loader2 } from 'lucide-react';
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
    const completedCount = questionIds.filter(id => {
        const a = assessments[id];
        return a?.status === 'validated' || a?.status === 'ready' || a?.status === 'scoring';
    }).length;

    return (
        <div className="glass-card p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-200 tracking-wide">Progress</h3>
                <span className="text-xs font-medium text-slate-400 bg-white/[0.04] px-2.5 py-1 rounded-full">
                    {currentIndex + 1} / {totalQuestions}
                </span>
            </div>

            {/* Progress dots */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 pt-1 px-1">
                {questionIds.map((id, index) => {
                    const assessment = assessments[id];
                    const isCurrent = index === currentIndex;
                    const isCompleted = assessment?.status === 'validated' || assessment?.status === 'ready';
                    const isSkipped = assessment?.didNotGetTo;
                    const isProcessing = assessment?.status === 'processing';
                    const isScoring = assessment?.status === 'scoring';

                    return (
                        <button
                            key={`${id}-${index}`}
                            onClick={() => onNavigate(index)}
                            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${isCurrent
                                ? 'bg-gradient-to-br from-cyan-400 to-indigo-500 text-white scale-110 shadow-lg shadow-cyan-500/30 ring-2 ring-cyan-400/40'
                                : isSkipped
                                    ? 'bg-slate-800 text-slate-600 border border-slate-700'
                                    : isCompleted
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                        : isScoring
                                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                                            : isProcessing
                                                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 animate-pulse'
                                                : 'bg-white/[0.04] text-slate-500 border border-white/[0.06] hover:bg-white/[0.08] hover:text-slate-300'
                                }`}
                            title={`Question ${index + 1}${isSkipped ? ' (Skipped)' : isCompleted ? ' (Completed)' : isScoring ? ' (Scoring...)' : ''}`}
                        >
                            {isSkipped ? (
                                <SkipForward className="w-3.5 h-3.5" />
                            ) : isCompleted ? (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : isScoring ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <span className="text-xs font-semibold">{index + 1}</span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Progress bar */}
            <div className="mt-3 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                <div
                    className="h-full progress-gradient rounded-full transition-all duration-700 ease-out"
                    style={{
                        width: `${((completedCount) / totalQuestions) * 100}%`,
                    }}
                />
            </div>
        </div>
    );
}
