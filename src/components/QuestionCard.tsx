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
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm font-medium">
                            {questionNumber} / {totalQuestions}
                        </span>
                        {isParsedQuestion && (
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getDifficultyColor((question as ParsedQuestion).difficulty)}`}>
                                {(question as ParsedQuestion).difficulty.charAt(0).toUpperCase() + (question as ParsedQuestion).difficulty.slice(1)}
                            </span>
                        )}
                        {isStarterQuestion && (
                            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
                                Starter Question
                            </span>
                        )}
                    </div>
                    <label className="flex items-center gap-2 text-white/80 text-sm cursor-pointer">
                        <input
                            type="checkbox"
                            checked={assessment.didNotGetTo}
                            onChange={(e) => onDidNotGetTo(e.target.checked)}
                            className="rounded border-white/30 bg-white/10 text-purple-300 focus:ring-purple-300"
                        />
                        Did Not Get To
                    </label>
                </div>
            </div>

            {/* Question */}
            <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900">
                    {isParsedQuestion ? (question as ParsedQuestion).question : (question as StarterQuestion).question}
                </h2>
            </div>

            {assessment.didNotGetTo ? (
                <div className="p-6 bg-gray-50 text-center">
                    <SkipForward className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">This question was skipped and will be excluded from scoring.</p>
                    <button
                        onClick={() => onDidNotGetTo(false)}
                        className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                        Mark as Attempted
                    </button>
                </div>
            ) : (
                <>
                    {/* Keywords Section - Only for parsed questions */}
                    {isParsedQuestion && (question as ParsedQuestion).keywords.length > 0 && (
                        <div className="p-6 border-b border-gray-100">
                            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                                <MessageSquare className="w-4 h-4" />
                                Technical Keywords (click when mentioned)
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {(question as ParsedQuestion).keywords.map((keyword) => {
                                    const isHit = assessment.keywordsHit.includes(keyword);
                                    return (
                                        <button
                                            key={keyword}
                                            onClick={() => onToggleKeyword(keyword)}
                                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${isHit
                                                    ? 'bg-green-500 text-white shadow-md scale-105'
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}
                                        >
                                            {isHit && <CheckCircle2 className="w-4 h-4 inline-block mr-1" />}
                                            {keyword}
                                        </button>
                                    );
                                })}
                            </div>
                            <p className="mt-2 text-xs text-gray-500">
                                {assessment.keywordsHit.length} of {(question as ParsedQuestion).keywords.length} keywords mentioned
                            </p>
                        </div>
                    )}

                    {/* Starter Question Guidelines */}
                    {isStarterQuestion && (
                        <div className="p-6 border-b border-gray-100">
                            <h3 className="text-sm font-medium text-gray-700 mb-3">
                                Look for these elements:
                            </h3>
                            <ul className="space-y-2">
                                {(question as StarterQuestion).guidelines.map((guideline, i) => (
                                    <li key={i} className="flex items-center gap-2 text-gray-600">
                                        <span className="w-5 h-5 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-medium">
                                            {i + 1}
                                        </span>
                                        {guideline}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Soft Skills Section */}
                    <div className="p-6 border-b border-gray-100">
                        <h3 className="text-sm font-medium text-gray-700 mb-3">
                            Soft Skills Assessment
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {softSkillItems.map(({ key, label, icon: Icon }) => (
                                <button
                                    key={key}
                                    onClick={() => onToggleSoftSkill(key)}
                                    className={`p-3 rounded-lg border-2 transition-all duration-200 flex flex-col items-center gap-2 ${assessment.softSkills[key]
                                            ? 'border-green-500 bg-green-50 text-green-700'
                                            : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
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
                        <div className="border-b border-gray-100">
                            <button
                                onClick={() => setShowModelAnswer(!showModelAnswer)}
                                className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                            >
                                <span className="text-sm font-medium text-gray-700">
                                    Reference: Model Answer
                                </span>
                                {showModelAnswer ? (
                                    <ChevronUp className="w-5 h-5 text-gray-400" />
                                ) : (
                                    <ChevronDown className="w-5 h-5 text-gray-400" />
                                )}
                            </button>
                            {showModelAnswer && (
                                <div className="px-6 pb-6">
                                    <div className="bg-blue-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap max-h-64 overflow-y-auto">
                                        {(question as ParsedQuestion).modelAnswer}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Interviewer Notes */}
                    <div className="p-6 border-b border-gray-100">
                        <h3 className="text-sm font-medium text-gray-700 mb-3">
                            Interviewer Notes
                        </h3>
                        <textarea
                            value={assessment.interviewerNotes}
                            onChange={(e) => onNotesChange(e.target.value)}
                            placeholder="Quick notes about the candidate's response..."
                            className="w-full h-24 p-3 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-700"
                        />
                    </div>

                    {/* Actions */}
                    <div className="p-6 bg-gray-50 flex items-center justify-between">
                        <button
                            onClick={onSkip}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium flex items-center gap-2"
                        >
                            <SkipForward className="w-4 h-4" />
                            Skip to Next
                        </button>
                        <button
                            onClick={onComplete}
                            disabled={isProcessing}
                            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-5 h-5" />
                                    Complete & Continue
                                </>
                            )}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
