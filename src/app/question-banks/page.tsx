'use client';

// Question Banks page - View and manage interview question banks

import { useState, useEffect, useRef } from 'react';
import {
    FileText,
    Upload,
    Trash2,
    Download,
    Eye,
    Loader2,
    Plus,
    X,
    Calendar,
    Hash
} from 'lucide-react';
import { parseInterviewQuestions } from '@/lib/markdownParser';
import { ParsedQuestion } from '@/lib/types';

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
    const [isLoading, setIsLoading] = useState(true);
    const [customBanks, setCustomBanks] = useState<QuestionBank[]>([]);
    const [builtInBanks, setBuiltInBanks] = useState<QuestionBank[]>(BUILT_IN_BANKS);
    const [isUploading, setIsUploading] = useState(false);
    const [previewBank, setPreviewBank] = useState<QuestionBank | null>(null);
    const [previewQuestions, setPreviewQuestions] = useState<ParsedQuestion[]>([]);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadBanks();
        loadBuiltInCounts();
    }, []);

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
        // Load question counts for built-in banks
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

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Question Banks</h1>
                        <p className="text-gray-400">Manage interview question markdown files</p>
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
                            className={`px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-500 transition-colors cursor-pointer flex items-center gap-2 ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
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
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* Built-in Banks */}
                        <div>
                            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-indigo-400" />
                                Curriculum Question Banks
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {builtInBanks.map(bank => (
                                    <div
                                        key={bank.id}
                                        className="bg-white/10 backdrop-blur border border-white/20 rounded-xl p-5 hover:bg-white/15 transition-colors"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-white mb-1">{bank.name}</h3>
                                                <div className="flex items-center gap-4 text-sm text-gray-400">
                                                    <span className="flex items-center gap-1">
                                                        <Hash className="w-3 h-3" />
                                                        {bank.questionCount} questions
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handlePreview(bank)}
                                                className="p-2 text-gray-400 hover:text-indigo-400 transition-colors"
                                                title="Preview questions"
                                            >
                                                <Eye className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Custom Banks */}
                        <div>
                            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <Upload className="w-5 h-5 text-purple-400" />
                                Uploaded Question Banks
                            </h2>

                            {customBanks.length === 0 ? (
                                <div className="bg-white/5 border border-dashed border-white/20 rounded-xl p-8 text-center">
                                    <Upload className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                                    <p className="text-gray-400 mb-2">No custom question banks uploaded yet</p>
                                    <p className="text-sm text-gray-500">
                                        Upload a markdown file with interview questions to get started
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {customBanks.map(bank => (
                                        <div
                                            key={bank.id}
                                            className="bg-white/10 backdrop-blur border border-white/20 rounded-xl p-5 hover:bg-white/15 transition-colors"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-white mb-1">{bank.name}</h3>
                                                    <div className="flex items-center gap-4 text-sm text-gray-400">
                                                        <span className="flex items-center gap-1">
                                                            <Hash className="w-3 h-3" />
                                                            {bank.questionCount} questions
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" />
                                                            {formatDate(bank.createdAt)}
                                                        </span>
                                                        <span>{formatSize(bank.size)}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => handlePreview(bank)}
                                                        className="p-2 text-gray-400 hover:text-indigo-400 transition-colors"
                                                        title="Preview questions"
                                                    >
                                                        <Eye className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(bank)}
                                                        className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Preview Modal */}
                {previewBank && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                        <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden">
                            <div className="flex items-center justify-between p-4 border-b border-slate-700">
                                <h3 className="text-lg font-semibold text-white">{previewBank.name}</h3>
                                <button
                                    onClick={() => setPreviewBank(null)}
                                    className="p-1 text-gray-400 hover:text-white"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-4 overflow-y-auto max-h-[60vh]">
                                {isLoadingPreview ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                                    </div>
                                ) : previewQuestions.length === 0 ? (
                                    <p className="text-gray-400 text-center py-8">No questions found in this file</p>
                                ) : (
                                    <div className="space-y-4">
                                        {previewQuestions.map((q, index) => (
                                            <div key={q.id} className="bg-slate-700/50 rounded-lg p-4">
                                                <div className="flex items-start gap-3">
                                                    <span className="bg-indigo-600 text-white text-sm font-bold w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0">
                                                        {index + 1}
                                                    </span>
                                                    <div className="flex-1">
                                                        <p className="text-white mb-2">{q.question}</p>
                                                        <div className="flex flex-wrap gap-1">
                                                            {q.keywords.slice(0, 5).map((kw, i) => (
                                                                <span key={i} className="px-2 py-0.5 bg-slate-600 text-gray-300 text-xs rounded">
                                                                    {kw}
                                                                </span>
                                                            ))}
                                                            {q.keywords.length > 5 && (
                                                                <span className="px-2 py-0.5 text-gray-400 text-xs">
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
