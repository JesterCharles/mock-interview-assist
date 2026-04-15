'use client';

// Question Banks page - View and manage interview question banks

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    FileText,
    Upload,
    Trash2,
    Eye,
    Loader2,
    Plus,
    X,
    Calendar,
    Hash
} from 'lucide-react';
import { parseInterviewQuestions } from '@/lib/markdownParser';
import { ParsedQuestion } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';

const displayFont = { fontFamily: 'var(--font-display)' } as const;
const monoLabel = {
    fontFamily: 'var(--font-mono)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
};

const surfaceCardStyle = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
};

interface QuestionBank {
    id: string;
    name: string;
    filename: string;
    questionCount: number;
    createdAt: string;
    modifiedAt: string;
    size: number;
    isBuiltIn?: boolean;
    path?: string;
}

// Pre-configured week files
const BUILT_IN_BANKS: QuestionBank[] = [
    {
        id: 'week-1',
        name: 'Week 1: AI/ML Fundamentals',
        filename: 'interview_questions_week1.md',
        path: 'week-1-ai-ml-fundamentals/assessments/interview_questions_week1.md',
        questionCount: 0,
        createdAt: '',
        modifiedAt: '',
        size: 0,
        isBuiltIn: true
    },
    {
        id: 'week-2',
        name: 'Week 2: Deep Learning & NLP',
        filename: 'interview_questions_week2.md',
        path: 'week-2-deep-learning-nlp/assessments/interview_questions_week2.md',
        questionCount: 0,
        createdAt: '',
        modifiedAt: '',
        size: 0,
        isBuiltIn: true
    },
    {
        id: 'week-3',
        name: 'Week 3: Vector Databases (Part 1)',
        filename: 'interview_questions_week3.md',
        path: 'week-3-vector-databases-part1/assessments/interview_questions_week3.md',
        questionCount: 0,
        createdAt: '',
        modifiedAt: '',
        size: 0,
        isBuiltIn: true
    },
    {
        id: 'week-4',
        name: 'Week 4: Vector Databases (Part 2)',
        filename: 'interview_questions_week4.md',
        path: 'week-4-vector-databases-part2/assessments/interview_questions_week4.md',
        questionCount: 0,
        createdAt: '',
        modifiedAt: '',
        size: 0,
        isBuiltIn: true
    },
];

export default function QuestionBanksPage() {
    const router = useRouter();
    const { isAuthenticated, isLoading: authLoading } = useAuth();

    const [isLoading, setIsLoading] = useState(true);
    const [customBanks, setCustomBanks] = useState<QuestionBank[]>([]);
    const [builtInBanks, setBuiltInBanks] = useState<QuestionBank[]>(BUILT_IN_BANKS);
    const [isUploading, setIsUploading] = useState(false);
    const [previewBank, setPreviewBank] = useState<QuestionBank | null>(null);
    const [previewQuestions, setPreviewQuestions] = useState<ParsedQuestion[]>([]);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
            return;
        }
        loadBanks();
        loadBuiltInCounts();
    }, [authLoading, isAuthenticated, router]);

    const loadBanks = async () => {
        try {
            const response = await fetch('/api/question-banks');
            if (response.ok) {
                const data = await response.json();
                setCustomBanks(data.banks || []);
            }
        } catch (error) {
            console.error('Failed to load question banks:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadBuiltInCounts = async () => {
        const updatedBuiltIn = await Promise.all(
            BUILT_IN_BANKS.map(async (bank) => {
                try {
                    const response = await fetch(`/api/load-markdown?path=${encodeURIComponent(bank.path!)}`);
                    if (response.ok) {
                        const content = await response.text();
                        const questions = parseInterviewQuestions(content, 1);
                        return { ...bank, questionCount: questions.length };
                    }
                } catch (error) {
                    console.error(`Failed to load ${bank.name}:`, error);
                }
                return bank;
            })
        );
        setBuiltInBanks(updatedBuiltIn);
    };

    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/question-banks', {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                await loadBanks();
            } else {
                const data = await response.json();
                alert(data.error || 'Failed to upload file');
            }
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Failed to upload file');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleDelete = async (bank: QuestionBank) => {
        if (!confirm(`Are you sure you want to delete "${bank.name}"?`)) {
            return;
        }

        try {
            const response = await fetch(`/api/question-banks?filename=${encodeURIComponent(bank.filename)}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setCustomBanks(prev => prev.filter(b => b.id !== bank.id));
            } else {
                alert('Failed to delete question bank');
            }
        } catch (error) {
            console.error('Delete failed:', error);
            alert('Failed to delete question bank');
        }
    };

    const handlePreview = async (bank: QuestionBank) => {
        setPreviewBank(bank);
        setIsLoadingPreview(true);
        setPreviewQuestions([]);

        try {
            let content: string;

            if (bank.isBuiltIn && bank.path) {
                const response = await fetch(`/api/load-markdown?path=${encodeURIComponent(bank.path)}`);
                content = await response.text();
            } else {
                const response = await fetch(`/api/load-markdown?custom=${encodeURIComponent(bank.filename)}`);
                content = await response.text();
            }

            const questions = parseInterviewQuestions(content, 1);
            setPreviewQuestions(questions);
        } catch (error) {
            console.error('Failed to load preview:', error);
        } finally {
            setIsLoadingPreview(false);
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const renderBankCard = (bank: QuestionBank, withActions: boolean) => (
        <div
            key={bank.id}
            className="rounded-lg p-5 transition-colors hover:bg-[var(--highlight)]"
            style={surfaceCardStyle}
        >
            <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                    <h3
                        className="mb-1 truncate"
                        style={{ ...displayFont, fontWeight: 600, fontSize: '22px', color: 'var(--ink)' }}
                    >
                        {bank.name}
                    </h3>
                    <div className="flex items-center gap-4 text-sm flex-wrap" style={{ color: 'var(--muted)' }}>
                        <span className="flex items-center gap-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            <Hash className="w-3 h-3" />
                            {bank.questionCount} questions
                        </span>
                        {withActions && (
                            <>
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {formatDate(bank.createdAt)}
                                </span>
                                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatSize(bank.size)}</span>
                            </>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                        onClick={() => handlePreview(bank)}
                        className="p-2 transition-colors rounded-md hover:bg-[var(--surface-muted)]"
                        style={{ color: 'var(--muted)' }}
                        title="Preview questions"
                        aria-label={`Preview ${bank.name}`}
                    >
                        <Eye className="w-5 h-5" />
                    </button>
                    {withActions && (
                        <button
                            onClick={() => handleDelete(bank)}
                            className="p-2 transition-colors rounded-md hover:bg-[var(--surface-muted)]"
                            style={{ color: 'var(--muted)' }}
                            title="Delete"
                            aria-label={`Delete ${bank.name}`}
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
                    <div>
                        <h1
                            className="mb-2"
                            style={{ ...displayFont, fontWeight: 600, fontSize: '48px', color: 'var(--ink)' }}
                        >
                            Question Banks
                        </h1>
                        <p style={{ color: 'var(--muted)' }}>Manage interview question markdown files</p>
                    </div>

                    <div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".md"
                            onChange={handleUpload}
                            className="hidden"
                            id="upload-bank"
                        />
                        <label
                            htmlFor="upload-bank"
                            className={`btn-accent-flat cursor-pointer inline-flex items-center gap-2 ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
                        >
                            {isUploading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Plus className="w-4 h-4" />
                            )}
                            Upload Question Bank
                        </label>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* Built-in Banks */}
                        <div>
                            <h2
                                className="mb-4 flex items-center gap-2"
                                style={{ ...displayFont, fontWeight: 600, fontSize: '28px', color: 'var(--ink)' }}
                            >
                                <FileText className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                                Curriculum Question Banks
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {builtInBanks.map(bank => renderBankCard(bank, false))}
                            </div>
                        </div>

                        {/* Custom Banks */}
                        <div>
                            <h2
                                className="mb-4 flex items-center gap-2"
                                style={{ ...displayFont, fontWeight: 600, fontSize: '28px', color: 'var(--ink)' }}
                            >
                                <Upload className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                                Uploaded Question Banks
                            </h2>

                            {customBanks.length === 0 ? (
                                <div
                                    className="rounded-xl p-8 text-center"
                                    style={{
                                        background: 'var(--surface)',
                                        border: '1px dashed var(--border)',
                                    }}
                                >
                                    <Upload className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--muted)' }} />
                                    <p className="mb-2" style={{ color: 'var(--ink)' }}>No custom question banks uploaded yet</p>
                                    <p className="text-sm" style={{ color: 'var(--muted)' }}>
                                        Upload a markdown file with interview questions to get started
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {customBanks.map(bank => renderBankCard(bank, true))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Preview Modal */}
                {previewBank && (
                    <div
                        className="fixed inset-0 flex items-center justify-center z-50 p-4"
                        style={{ background: 'rgba(26,26,26,0.45)' }}
                    >
                        <div
                            className="rounded-xl w-full max-w-3xl max-h-[80vh] overflow-hidden"
                            style={{
                                background: 'var(--surface)',
                                border: '1px solid var(--border)',
                                boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
                            }}
                        >
                            <div
                                className="flex items-center justify-between p-4"
                                style={{ borderBottom: '1px solid var(--border-subtle)' }}
                            >
                                <h3
                                    style={{ ...displayFont, fontWeight: 600, fontSize: '22px', color: 'var(--ink)' }}
                                >
                                    {previewBank.name}
                                </h3>
                                <button
                                    onClick={() => setPreviewBank(null)}
                                    className="p-1 transition-colors rounded-md hover:bg-[var(--surface-muted)]"
                                    style={{ color: 'var(--muted)' }}
                                    aria-label="Close preview"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-4 overflow-y-auto max-h-[60vh]">
                                {isLoadingPreview ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--accent)' }} />
                                    </div>
                                ) : previewQuestions.length === 0 ? (
                                    <p className="text-center py-8" style={{ color: 'var(--muted)' }}>No questions found in this file</p>
                                ) : (
                                    <div className="space-y-3">
                                        {previewQuestions.map((q, index) => (
                                            <div
                                                key={q.id}
                                                className="py-3"
                                                style={{ borderBottom: '1px solid var(--border-subtle)' }}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <span
                                                        className="text-sm font-bold w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                                        style={{
                                                            background: 'var(--accent)',
                                                            color: '#FFFFFF',
                                                            fontFamily: 'var(--font-mono)',
                                                        }}
                                                    >
                                                        {index + 1}
                                                    </span>
                                                    <div className="flex-1 min-w-0">
                                                        <p
                                                            className="mb-2"
                                                            style={{ ...displayFont, fontWeight: 600, fontSize: '22px', color: 'var(--ink)' }}
                                                        >
                                                            {q.question}
                                                        </p>
                                                        <div className="text-sm mb-2" style={{ color: 'var(--muted)' }}>
                                                            {q.difficulty && (
                                                                <span
                                                                    className="inline-block px-2 py-0.5 rounded-full text-xs font-medium mr-2"
                                                                    style={{
                                                                        ...monoLabel,
                                                                        background:
                                                                            q.difficulty === 'beginner' ? '#E8F5EE'
                                                                            : q.difficulty === 'intermediate' ? '#FEF3E0'
                                                                            : '#FDECEB',
                                                                        color:
                                                                            q.difficulty === 'beginner' ? 'var(--success)'
                                                                            : q.difficulty === 'intermediate' ? 'var(--warning)'
                                                                            : 'var(--danger)',
                                                                    }}
                                                                >
                                                                    {q.difficulty}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-wrap gap-1">
                                                            {q.keywords.slice(0, 5).map((kw, i) => (
                                                                <span
                                                                    key={i}
                                                                    className="px-2 py-0.5 text-xs rounded-full"
                                                                    style={{
                                                                        background: 'var(--surface-muted)',
                                                                        color: 'var(--muted)',
                                                                    }}
                                                                >
                                                                    {kw}
                                                                </span>
                                                            ))}
                                                            {q.keywords.length > 5 && (
                                                                <span className="px-2 py-0.5 text-xs" style={{ color: 'var(--muted)' }}>
                                                                    +{q.keywords.length - 5} more
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
