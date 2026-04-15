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
        <div
            className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 mb-6"
            style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
        >
            <div className="flex items-center justify-between mb-3">
                <h3
                    className="text-xs font-semibold text-[var(--muted)] uppercase"
                    style={{ fontFamily: 'var(--font-jetbrains-mono)', letterSpacing: '0.08em' }}
                >
                    Progress
                </h3>
                <span
                    className="text-xs font-medium text-[var(--muted)] bg-[var(--surface-muted)] px-2.5 py-1 rounded-full tabular-nums"
                >
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

                    const base = 'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-150 border';
                    let tone: string;
                    if (isCurrent) {
                        tone = 'bg-[var(--accent)] text-white border-[var(--accent)]';
                    } else if (isSkipped) {
                        tone = 'bg-[var(--surface-muted)] text-[var(--muted)] border-[var(--border)]';
                    } else if (isCompleted) {
                        tone = 'bg-[var(--surface)] text-[var(--success)] border-[var(--success)]';
                    } else if (isScoring) {
                        tone = 'bg-[var(--surface)] text-[var(--warning)] border-[var(--warning)]';
                    } else if (isProcessing) {
                        tone = 'bg-[var(--surface)] text-[var(--accent)] border-[var(--accent)]';
                    } else {
                        tone = 'bg-[var(--surface-muted)] text-[var(--muted)] border-[var(--border-subtle)] hover:bg-[var(--highlight)] hover:text-[var(--ink)]';
                    }

                    return (
                        <button
                            key={`${id}-${index}`}
                            onClick={() => onNavigate(index)}
                            className={`${base} ${tone}`}
                            title={`Question ${index + 1}${isSkipped ? ' (Skipped)' : isCompleted ? ' (Completed)' : isScoring ? ' (Scoring...)' : ''}`}
                        >
                            {isSkipped ? (
                                <SkipForward className="w-3.5 h-3.5" />
                            ) : isCompleted ? (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : isScoring ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <span className="text-xs font-semibold tabular-nums">{index + 1}</span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Progress bar — flat accent fill on muted track */}
            <div className="mt-3 h-1.5 bg-[var(--surface-muted)] rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-300 ease-out bg-[var(--accent)]"
                    style={{
                        width: `${(completedCount / totalQuestions) * 100}%`,
                    }}
                />
            </div>
        </div>
    );
}
