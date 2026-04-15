'use client';

// QuestionCard component for assessing individual interview questions

import { useState } from 'react';
import {
    CheckCircle2,
    Eye,
    MessageSquare,
    Brain,
    Volume2,
    Loader2,
    SkipForward,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { ParsedQuestion, StarterQuestion, QuestionAssessment, SoftSkillsAssessment } from '@/lib/types';

interface QuestionCardProps {
    question: ParsedQuestion | StarterQuestion;
    assessment: QuestionAssessment;
    questionNumber: number;
    totalQuestions: number;
    onToggleKeyword: (keyword: string) => void;
    onToggleSoftSkill: (skill: keyof SoftSkillsAssessment) => void;
    onNotesChange: (notes: string) => void;
    onComplete: () => void;
    onSkip: () => void;
    onDidNotGetTo: (value: boolean) => void;
    isProcessing: boolean;
}

// DESIGN.md difficulty → semantic token color
function difficultyTone(difficulty: string): string {
    switch (difficulty) {
        case 'easy':
            return 'bg-[var(--surface-muted)] text-[var(--success)] border border-[var(--border)]';
        case 'medium':
            return 'bg-[var(--surface-muted)] text-[var(--warning)] border border-[var(--border)]';
        case 'hard':
            return 'bg-[var(--surface-muted)] text-[var(--danger)] border border-[var(--border)]';
        default:
            return 'bg-[var(--surface-muted)] text-[var(--muted)] border border-[var(--border)]';
    }
}

export default function QuestionCard({
    question,
    assessment,
    questionNumber,
    totalQuestions,
    onToggleKeyword,
    onToggleSoftSkill,
    onNotesChange,
    onComplete,
    onSkip,
    onDidNotGetTo,
    isProcessing,
}: QuestionCardProps) {
    const [showModelAnswer, setShowModelAnswer] = useState(false);

    const isParsedQuestion = 'modelAnswer' in question;
    const isStarterQuestion = 'type' in question;

    const softSkillItems: Array<{
        key: keyof SoftSkillsAssessment;
        label: string;
        icon: typeof Eye;
    }> = [
            { key: 'clearlySpoken', label: 'Clearly Spoken', icon: Volume2 },
            { key: 'eyeContact', label: 'Eye Contact', icon: Eye },
            { key: 'confidence', label: 'Confidence', icon: CheckCircle2 },
            { key: 'structuredThinking', label: 'Structured Thinking', icon: Brain },
        ];

    return (
        <div
            className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden animate-fade-in relative"
            style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
        >
            {/* Header */}
            <div className="border-b border-[var(--border-subtle)] px-6 py-4 relative z-10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span
                            className="bg-[var(--surface-muted)] text-[var(--muted)] px-3 py-1 rounded-full text-xs font-medium border border-[var(--border)] uppercase tabular-nums"
                            style={{ fontFamily: 'var(--font-jetbrains-mono)', letterSpacing: '0.08em' }}
                        >
                            {questionNumber} / {totalQuestions}
                        </span>
                        {isParsedQuestion && (
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${difficultyTone((question as ParsedQuestion).difficulty)}`}>
                                {(question as ParsedQuestion).difficulty.charAt(0).toUpperCase() + (question as ParsedQuestion).difficulty.slice(1)}
                            </span>
                        )}
                        {isStarterQuestion && (
                            <span className="bg-[var(--surface-muted)] text-[var(--accent)] px-3 py-1 rounded-full text-xs font-medium border border-[var(--border)]">
                                Starter Question
                            </span>
                        )}
                    </div>
                    <label className="flex items-center gap-2 text-[var(--muted)] text-sm cursor-pointer hover:text-[var(--ink)] transition-colors">
                        <input
                            type="checkbox"
                            checked={assessment.didNotGetTo}
                            onChange={(e) => onDidNotGetTo(e.target.checked)}
                            className="rounded border-[var(--border)] bg-[var(--surface)] text-[var(--accent)] focus:ring-[var(--accent)]"
                        />
                        Did Not Get To
                    </label>
                </div>
            </div>

            {/* Question */}
            <div className="p-6 border-b border-[var(--border-subtle)] relative z-10">
                <h2
                    className="leading-relaxed text-[var(--ink)]"
                    style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 22 }}
                >
                    {isParsedQuestion ? (question as ParsedQuestion).question : (question as StarterQuestion).question}
                </h2>
            </div>

            {assessment.didNotGetTo ? (
                <div className="p-6 bg-[var(--surface-muted)] border border-[var(--border-subtle)] rounded-lg text-center m-6 mb-20 relative z-10">
                    <SkipForward className="w-12 h-12 text-[var(--muted)] mx-auto mb-2" />
                    <p className="text-[var(--muted)] text-sm">This question was skipped and will be excluded from scoring.</p>
                    <button
                        onClick={() => onDidNotGetTo(false)}
                        className="mt-4 text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium text-sm transition-colors"
                    >
                        Mark as Attempted
                    </button>
                </div>
            ) : (
                <div className="relative z-10">
                    {/* Keywords Section - Only for parsed questions */}
                    {isParsedQuestion && (question as ParsedQuestion).keywords.length > 0 && (
                        <div className="p-6 border-b border-[var(--border-subtle)]">
                            <h3
                                className="text-[11px] font-semibold text-[var(--muted)] mb-3 flex items-center gap-2 uppercase"
                                style={{ fontFamily: 'var(--font-jetbrains-mono)', letterSpacing: '0.08em' }}
                            >
                                <MessageSquare className="w-3.5 h-3.5" />
                                Technical Keywords (click when mentioned)
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {(question as ParsedQuestion).keywords.map((keyword) => {
                                    const isHit = assessment.keywordsHit.includes(keyword);
                                    return (
                                        <button
                                            key={keyword}
                                            onClick={() => onToggleKeyword(keyword)}
                                            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors duration-150 border ${isHit
                                                    ? 'border-[var(--success)] bg-[var(--surface-muted)] text-[var(--success)]'
                                                    : 'border-[var(--border)] bg-[var(--surface-muted)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--highlight)]'
                                                }`}
                                        >
                                            <span className="flex items-center gap-1.5">
                                                {isHit && <CheckCircle2 className="w-3.5 h-3.5 text-[var(--success)]" />}
                                                {keyword}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                            <p className="mt-3 text-xs font-medium text-[var(--muted)] tabular-nums">
                                {assessment.keywordsHit.length} of {(question as ParsedQuestion).keywords.length} keywords mentioned
                            </p>
                        </div>
                    )}

                    {/* Starter Question Guidelines */}
                    {isStarterQuestion && (
                        <div className="p-6 border-b border-[var(--border-subtle)]">
                            <h3
                                className="text-[11px] font-semibold text-[var(--muted)] mb-3 uppercase"
                                style={{ fontFamily: 'var(--font-jetbrains-mono)', letterSpacing: '0.08em' }}
                            >
                                Look for these elements:
                            </h3>
                            <ul className="space-y-2">
                                {(question as StarterQuestion).guidelines.map((guideline, i) => (
                                    <li key={i} className="flex items-center gap-3 text-[var(--ink)] text-sm">
                                        <span className="w-5 h-5 bg-[var(--surface-muted)] text-[var(--accent)] rounded-full flex items-center justify-center text-xs font-medium border border-[var(--border)] flex-shrink-0 tabular-nums">
                                            {i + 1}
                                        </span>
                                        {guideline}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Soft Skills Section */}
                    <div className="p-6 border-b border-[var(--border-subtle)]">
                        <h3
                            className="text-[11px] font-semibold text-[var(--muted)] mb-3 uppercase"
                            style={{ fontFamily: 'var(--font-jetbrains-mono)', letterSpacing: '0.08em' }}
                        >
                            Soft Skills Assessment
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {softSkillItems.map(({ key, label, icon: Icon }) => (
                                <button
                                    key={key}
                                    onClick={() => onToggleSoftSkill(key)}
                                    className={`p-3 rounded-lg border transition-colors duration-150 flex flex-col items-center gap-2 ${assessment.softSkills[key]
                                            ? 'border-[var(--success)] bg-[var(--surface-muted)] text-[var(--success)]'
                                            : 'border-[var(--border)] bg-[var(--surface-muted)] text-[var(--muted)] hover:border-[var(--border)] hover:text-[var(--ink)] hover:bg-[var(--highlight)]'
                                        }`}
                                >
                                    <Icon className="w-5 h-5" />
                                    <span className="text-xs font-medium text-center">{label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Model Answer Section - Only for parsed questions */}
                    {isParsedQuestion && (question as ParsedQuestion).modelAnswer && (
                        <div className="border-b border-[var(--border-subtle)]">
                            <button
                                onClick={() => setShowModelAnswer(!showModelAnswer)}
                                className="w-full p-4 flex items-center justify-between text-left hover:bg-[var(--highlight)] transition-colors"
                            >
                                <span className="text-sm font-semibold text-[var(--ink)] flex items-center gap-2">
                                    <Brain className="w-4 h-4 text-[var(--accent)]" />
                                    Reference: Model Answer
                                </span>
                                {showModelAnswer ? (
                                    <ChevronUp className="w-5 h-5 text-[var(--muted)]" />
                                ) : (
                                    <ChevronDown className="w-5 h-5 text-[var(--muted)]" />
                                )}
                            </button>
                            {showModelAnswer && (
                                <div className="px-6 pb-6 pt-2 animate-slide-up">
                                    <div className="bg-[var(--surface-muted)] border border-[var(--border-subtle)] rounded-lg p-5 text-sm text-[var(--ink)] whitespace-pre-wrap max-h-64 overflow-y-auto custom-scrollbar leading-relaxed">
                                        {(question as ParsedQuestion).modelAnswer}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Interviewer Notes */}
                    <div className="p-6 border-b border-[var(--border-subtle)]">
                        <h3
                            className="text-[11px] font-semibold text-[var(--muted)] mb-3 uppercase"
                            style={{ fontFamily: 'var(--font-jetbrains-mono)', letterSpacing: '0.08em' }}
                        >
                            Interviewer Notes
                        </h3>
                        <textarea
                            value={assessment.interviewerNotes}
                            onChange={(e) => onNotesChange(e.target.value)}
                            placeholder="Quick notes about the candidate's response..."
                            className="w-full h-24 p-4 bg-[var(--surface)] border border-[var(--border)] rounded-lg resize-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] text-[var(--ink)] placeholder-[var(--muted)] transition-colors text-sm outline-none"
                        />
                    </div>

                    {/* Actions */}
                    <div className="p-6 bg-[var(--surface-muted)] flex flex-col sm:flex-row items-center justify-between gap-4">
                        <button
                            onClick={onSkip}
                            className="w-full sm:w-auto px-4 py-2.5 text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--highlight)] rounded-md font-medium flex items-center justify-center gap-2 transition-colors text-sm"
                        >
                            <SkipForward className="w-4 h-4" />
                            Skip to Next
                        </button>
                        <button
                            onClick={onComplete}
                            disabled={isProcessing}
                            className="btn-accent-flat w-full sm:w-auto flex items-center justify-center gap-2 text-sm"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-4 h-4" />
                                    Complete & Continue
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
