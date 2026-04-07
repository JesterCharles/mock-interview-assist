'use client';

// QuestionCard component for assessing individual interview questions

import { useState } from 'react';
import {
    CheckCircle2,
    XCircle,
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
import { getDifficultyColor } from '@/lib/markdownParser';

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
        <div className="glass-card-strong rounded-xl overflow-hidden animate-fade-in relative">
            <div className="absolute top-0 right-0 bg-gradient-to-bl from-cyan-500/10 to-transparent w-32 h-32 pointer-events-none" />
            
            {/* Header */}
            <div className="border-b border-white/[0.06] px-6 py-4 relative z-10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="bg-white/[0.08] text-white px-3 py-1 rounded-full text-sm font-medium border border-white/[0.06]">
                            {questionNumber} / {totalQuestions}
                        </span>
                        {isParsedQuestion && (
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getDifficultyColor((question as ParsedQuestion).difficulty)}`}>
                                {(question as ParsedQuestion).difficulty.charAt(0).toUpperCase() + (question as ParsedQuestion).difficulty.slice(1)}
                            </span>
                        )}
                        {isStarterQuestion && (
                            <span className="bg-cyan-500/20 text-cyan-300 px-3 py-1 rounded-full text-xs font-medium border border-cyan-500/30">
                                Starter Question
                            </span>
                        )}
                    </div>
                    <label className="flex items-center gap-2 text-slate-300 text-sm cursor-pointer hover:text-white transition-colors">
                        <input
                            type="checkbox"
                            checked={assessment.didNotGetTo}
                            onChange={(e) => onDidNotGetTo(e.target.checked)}
                            className="rounded border-white/[0.2] bg-white/[0.1] text-cyan-400 focus:ring-cyan-400/50"
                        />
                        Did Not Get To
                    </label>
                </div>
            </div>

            {/* Question */}
            <div className="p-6 border-b border-white/[0.06] relative z-10">
                <h2 className="text-xl font-semibold text-white leading-relaxed">
                    {isParsedQuestion ? (question as ParsedQuestion).question : (question as StarterQuestion).question}
                </h2>
            </div>

            {assessment.didNotGetTo ? (
                <div className="p-6 glass-card text-center m-6 mb-20 relative z-10">
                    <SkipForward className="w-12 h-12 text-slate-500 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">This question was skipped and will be excluded from scoring.</p>
                    <button
                        onClick={() => onDidNotGetTo(false)}
                        className="mt-4 text-cyan-400 hover:text-cyan-300 font-medium text-sm transition-colors"
                    >
                        Mark as Attempted
                    </button>
                </div>
            ) : (
                <div className="relative z-10">
                    {/* Keywords Section - Only for parsed questions */}
                    {isParsedQuestion && (question as ParsedQuestion).keywords.length > 0 && (
                        <div className="p-6 border-b border-white/[0.06]">
                            <h3 className="text-xs font-bold text-slate-400 mb-3 flex items-center gap-2 uppercase tracking-wide">
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
                                            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-300 border ${isHit
                                                    ? 'border-emerald-500/40 bg-emerald-500/[0.15] text-emerald-400 shadow-lg shadow-emerald-500/10'
                                                    : 'border-white/[0.08] bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08]'
                                                }`}
                                        >
                                            <span className="flex items-center gap-1.5">
                                                {isHit && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                                                {keyword}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                            <p className="mt-3 text-xs font-medium text-slate-500">
                                {assessment.keywordsHit.length} of {(question as ParsedQuestion).keywords.length} keywords mentioned
                            </p>
                        </div>
                    )}

                    {/* Starter Question Guidelines */}
                    {isStarterQuestion && (
                        <div className="p-6 border-b border-white/[0.06]">
                            <h3 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wide">
                                Look for these elements:
                            </h3>
                            <ul className="space-y-2">
                                {(question as StarterQuestion).guidelines.map((guideline, i) => (
                                    <li key={i} className="flex items-center gap-3 text-slate-300 text-sm">
                                        <span className="w-5 h-5 bg-cyan-500/10 text-cyan-400 rounded-full flex items-center justify-center text-xs font-medium border border-cyan-500/20 flex-shrink-0">
                                            {i + 1}
                                        </span>
                                        {guideline}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Soft Skills Section */}
                    <div className="p-6 border-b border-white/[0.06]">
                        <h3 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wide">
                            Soft Skills Assessment
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {softSkillItems.map(({ key, label, icon: Icon }) => (
                                <button
                                    key={key}
                                    onClick={() => onToggleSoftSkill(key)}
                                    className={`p-3 rounded-xl border transition-all duration-300 flex flex-col items-center gap-2 ${assessment.softSkills[key]
                                            ? 'border-emerald-500/40 bg-emerald-500/[0.1] text-emerald-400 glow-border-emerald'
                                            : 'border-white/[0.08] bg-white/[0.04] text-slate-400 hover:border-white/[0.15] hover:text-white'
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
                        <div className="border-b border-white/[0.06]">
                            <button
                                onClick={() => setShowModelAnswer(!showModelAnswer)}
                                className="w-full p-4 flex items-center justify-between text-left hover:bg-white/[0.04] transition-colors"
                            >
                                <span className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                    <Brain className="w-4 h-4 text-cyan-400" />
                                    Reference: Model Answer
                                </span>
                                {showModelAnswer ? (
                                    <ChevronUp className="w-5 h-5 text-slate-500" />
                                ) : (
                                    <ChevronDown className="w-5 h-5 text-slate-500" />
                                )}
                            </button>
                            {showModelAnswer && (
                                <div className="px-6 pb-6 pt-2 animate-slide-up">
                                    <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-5 text-sm text-slate-300 whitespace-pre-wrap max-h-64 overflow-y-auto custom-scrollbar leading-relaxed">
                                        {(question as ParsedQuestion).modelAnswer}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Interviewer Notes */}
                    <div className="p-6 border-b border-white/[0.06]">
                        <h3 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wide">
                            Interviewer Notes
                        </h3>
                        <textarea
                            value={assessment.interviewerNotes}
                            onChange={(e) => onNotesChange(e.target.value)}
                            placeholder="Quick notes about the candidate's response..."
                            className="w-full h-24 p-4 bg-white/[0.04] border border-white/[0.08] rounded-xl resize-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/30 text-white placeholder-slate-500 transition-all text-sm outline-none"
                        />
                    </div>

                    {/* Actions */}
                    <div className="p-6 bg-white/[0.02] flex flex-col sm:flex-row items-center justify-between gap-4">
                        <button
                            onClick={onSkip}
                            className="w-full sm:w-auto px-4 py-2.5 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-lg font-medium flex items-center justify-center gap-2 transition-all text-sm"
                        >
                            <SkipForward className="w-4 h-4" />
                            Skip to Next
                        </button>
                        <button
                            onClick={onComplete}
                            disabled={isProcessing}
                            className="w-full sm:w-auto px-6 py-2.5 btn-accent flex items-center justify-center gap-2 text-sm"
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
