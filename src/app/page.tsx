'use client';

import React, { useState, useEffect } from 'react';
import fpPromise from '@fingerprintjs/fingerprintjs';
import { Loader2, ArrowRight, Play, BookOpen, Clock, Download, AlertTriangle, ChevronLeft, ChevronRight, Search, CheckCircle2 } from 'lucide-react';
import SpeechToText from '@/components/SpeechToText';
import { PDFReport } from '@/components/PDFReport';
import ProgressBar from '@/components/ProgressBar';
import { pdf } from '@react-pdf/renderer';
import { parseInterviewQuestions, selectRandomQuestions } from '@/lib/markdownParser';
import { calculateAggregateScores } from '@/lib/langchain';
import { GitHubService, GitHubFile } from '@/lib/github-service';

interface RateLimitInfo {
    allowed: boolean;
    remaining: number;
    nextReset: string;
}

export default function PublicInterviewPage() {
    const [step, setStep] = useState<'loading' | 'limit-reached' | 'topics' | 'interview' | 'done'>('loading');
    const [fingerprint, setFingerprint] = useState<string>('');
    const [rateInfo, setRateInfo] = useState<RateLimitInfo | null>(null);
    const [isConfirming, setIsConfirming] = useState(false);
    const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Topic Selection State
    const [availableTopics, setAvailableTopics] = useState<any[]>([]);
    const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
    const [techSearch, setTechSearch] = useState('');
    const [techPage, setTechPage] = useState(1);
    const TECHS_PER_PAGE = 6;

    const filteredTechs = availableTopics.filter(t =>
        t.name.toLowerCase().includes(techSearch.toLowerCase())
    );
    const totalPages = Math.ceil(filteredTechs.length / TECHS_PER_PAGE);
    const paginatedTechs = filteredTechs.slice(
        (techPage - 1) * TECHS_PER_PAGE,
        techPage * TECHS_PER_PAGE
    );

    useEffect(() => {
        setTechPage(1);
    }, [techSearch]);

    // Interview State
    const [questions, setQuestions] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [transcript, setTranscript] = useState('');
    const [followUpPrompt, setFollowUpPrompt] = useState<string | null>(null);
    const [isFollowUp, setIsFollowUp] = useState(false);
    const [agentLoading, setAgentLoading] = useState(false);
    const [agentPhase, setAgentPhase] = useState<string>('');
    const [skipsRemaining, setSkipsRemaining] = useState(1);
    const [isSkipped, setIsSkipped] = useState(false);
    const [candidateNameInput, setCandidateNameInput] = useState('');
    const [sessionData, setSessionData] = useState<any>({
        candidateName: 'Public Candidate',
        date: new Date().toISOString(),
        assessments: {}
    });

    // Initialize Fingerprint & Check Rate Limits
    useEffect(() => {
        async function init() {
            try {
                // Get FP
                const fp = await fpPromise.load();
                const result = await fp.get();
                setFingerprint(result.visitorId);

                // Check rate limits
                const res = await fetch('/api/public/interview/start', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fingerprint: result.visitorId })
                });

                const data = await res.json();
                if (res.status === 429 || !data.allowed) {
                    setRateInfo(data);
                    setStep('limit-reached');
                } else {
                    setRateInfo(data);
                    fetchTopics();
                }
            } catch (err) {
                console.error("Initialization error:", err);
                setStep('loading'); // Stay stuck or handle error gracefully
            }
        }
        init();
    }, []);

    const fetchTopics = async () => {
        try {
            // Using placeholder config because /api/github ignores credentials/repos and uses environment variables
            const service = new GitHubService('owner', 'repo', 'main');
            const files = await service.findQuestionBanks('');
            setAvailableTopics(files);
            setStep('topics');
        } catch (e) {
            console.error("Error fetching topics from GitHub", e);
        }
    };

    const toggleTopic = (fileName: string) => {
        if (selectedTopics.includes(fileName)) {
            setSelectedTopics((prev: string[]) => prev.filter(t => t !== fileName));
        } else {
            if (selectedTopics.length < 3) {
                setSelectedTopics((prev: string[]) => [...prev, fileName]);
            }
        }
    };

    const handleReviewTopics = async () => {
        setIsLoadingQuestions(true);
        setError(null);

        try {
            let allQs: any[] = [];
            for (let i = 0; i < selectedTopics.length; i++) {
                const topic = selectedTopics[i];
                // Fetch directly from GitHub as requested
                const res = await fetch(`/api/github?path=${encodeURIComponent(topic)}&type=content`);
                if (res.ok) {
                    const text = await res.text();
                    const parsed = parseInterviewQuestions(text, i + 1);
                    allQs = [...allQs, ...parsed];
                }
            }

            // Build simple equal weights for each selected topic
            const weekWeights: Record<number, number> = {};
            selectedTopics.forEach((_, index) => {
                weekWeights[index + 1] = 1;
            });

            // Use the standard distribution logic (50% beginner, 40% intermediate, 10% advanced)
            const selected10 = selectRandomQuestions(allQs, 10, 'entry', weekWeights);

            if (selected10.length === 0) {
                setError('No questions found in the selected topics. Please try different topics.');
                setIsConfirming(false);
                setIsLoadingQuestions(false);
                return;
            }

            setQuestions(selected10);
            setIsConfirming(true);
        } catch (e) {
            console.error("Error loading questions", e);
            setError("Failed to load questions from GitHub. Please try again.");
        } finally {
            setIsLoadingQuestions(false);
        }
    };

    const handleStartInterview = async () => {
        if (selectedTopics.length === 0 || !candidateNameInput.trim()) return;

        // Finalize rate limit recording
        try {
            await fetch('/api/public/interview/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fingerprint, action: 'start' })
            });
        } catch (e) {
            console.error("Failed to mark interview as started", e);
        }

        // Initialize mock assessments now that questions are already loaded
        const initialAssessments: any = {};
        questions.forEach(q => {
            initialAssessments[q.id] = { status: 'pending', didNotGetTo: false };
        });

        setSessionData((prev: any) => ({
            ...prev,
            candidateName: candidateNameInput.trim(),
            assessments: initialAssessments
        }));

        setStep('interview');
    };

    const handleSubmitAnswer = async () => {
        if (!transcript.trim()) return;

        const currentQ = questions[currentIndex];

        setAgentLoading(true);
        setAgentPhase('Transmitting response to Agent...');

        let phaseIndex = 0;
        const phases = [
            'Transmitting response to Agent...',
            'Analyzing technical accuracy...',
            'Evaluating conceptual depth...',
            'Determining if follow-up is needed...'
        ];

        const phaseInterval = setInterval(() => {
            phaseIndex++;
            if (phaseIndex < phases.length) {
                setAgentPhase(phases[phaseIndex]);
            }
        }, 1500);

        // Call Agent API
        try {
            const res = await fetch('/api/public/interview/agent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fingerprint,
                    interview_id: 'public-' + new Date().getTime(),
                    current_question_index: currentIndex + 1,
                    topic: currentQ.topic || 'General Technical',
                    full_response_so_far: (followUpPrompt ? `${followUpPrompt}\n` : '') + transcript,
                    char_count: transcript.length
                })
            });

            const result = await res.json();

            if (!isFollowUp && result.needs_followup && result.follow_up_question) {
                // Present follow-up
                setIsFollowUp(true);
                setFollowUpPrompt(result.follow_up_question);
                setTranscript(''); // Clear for next input
            } else {
                // Done with this question, save real score/feedback via agent
                setAgentPhase('Evaluating final answer...');
                const scoreRes = await fetch('/api/score', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        isPublic: true,
                        candidateName: sessionData.candidateName,
                        question: {
                            question: currentQ.question,
                            modelAnswer: currentQ.modelAnswer,
                            type: 'technical'
                        },
                        assessment: {
                            keywordsHit: [],
                            keywordsMissed: [],
                            softSkills: { clearlySpoken: false, eyeContact: false, confidence: false, structuredThinking: false },
                            interviewerNotes: `Candidate Transcript:\n${result.appended_response || transcript}\n\nAgent Reasoning: ${result.reasoning || 'Completed answering.'}`
                        }
                    })
                });

                const scoreResult = await scoreRes.json();

                const updatedAssessments = { ...sessionData.assessments };
                updatedAssessments[currentQ.id] = {
                    status: 'validated',
                    didNotGetTo: false,
                    llmScore: scoreResult.score || 3,
                    llmFeedback: scoreResult.feedback || ("Agent observed: " + (result.reasoning || "Adequate response.")),
                    finalScore: scoreResult.score || 3,
                    finalFeedback: scoreResult.feedback || ("Agent observed: " + (result.reasoning || "Adequate response.")),
                    keywordsHit: [],
                    keywordsMissed: currentQ.keywords || []
                };
                setSessionData((prev: any) => ({ ...prev, assessments: updatedAssessments }));

                // Move to next question or finish
                if (currentIndex < questions.length - 1) {
                    setCurrentIndex((prev: number) => prev + 1);
                    setIsFollowUp(false);
                    setFollowUpPrompt(null);
                    setTranscript('');
                } else {
                    handleFinish();
                }
            }
        } catch (e) {
            console.error("Agent error", e);
            // On error, just advance
            if (currentIndex < questions.length - 1) {
                setCurrentIndex((prev: number) => prev + 1);
                setIsFollowUp(false);
                setFollowUpPrompt(null);
                setTranscript('');
            } else {
                handleFinish();
            }
        } finally {
            clearInterval(phaseInterval);
            setAgentLoading(false);
            setAgentPhase('');
        }
    };

    const handleSkip = () => {
        if (skipsRemaining > 0 && !isSkipped) {
            setSkipsRemaining(0);
            setIsSkipped(true);
            setAgentLoading(false);
            setIsFollowUp(false);
            setFollowUpPrompt(null);
        }
    };

    const handleNextAfterSkip = () => {
        const currentQ = questions[currentIndex];
        const updatedAssessments = { ...sessionData.assessments };
        updatedAssessments[currentQ.id] = {
            status: 'validated',
            didNotGetTo: true,
            llmScore: 5, // non-punitive
            llmFeedback: "Candidate skipped the question (1 free skip allowed).",
            finalScore: 5,
            finalFeedback: "Candidate skipped the question.",
            keywordsHit: [],
            keywordsMissed: currentQ.keywords || []
        };
        setSessionData((prev: any) => ({ ...prev, assessments: updatedAssessments }));

        setIsSkipped(false);
        if (currentIndex < questions.length - 1) {
            setCurrentIndex((prev: number) => prev + 1);
            setTranscript('');
        } else {
            handleFinish();
        }
    };

    const handleDownloadPDF = async () => {
        try {
            // Drop any completely untouched questions from the PDF report by filtering the sessionData assessments
            // (Pending state means they never reached it before finishing early)
            const validAssessments = Object.fromEntries(
                Object.entries(sessionData.assessments).filter(([_, a]: [string, any]) => a.status === 'validated')
            );

            const finalSessionData = {
                ...sessionData,
                assessments: validAssessments
            };

            // Generate real aggregate scores from the validated pool
            const aggregateScores = calculateAggregateScores(validAssessments as any);

            const docElement = (
                <PDFReport
                    session={finalSessionData}
                    questions={questions.filter(q => validAssessments[q.id])} // Only send reached questions
                    aggregateScores={aggregateScores}
                    isAutomatedPublic={true}
                />
            );

            const pdfBlob = await pdf(docElement).toBlob();

            // Create download link
            const url = URL.createObjectURL(pdfBlob);
            const a = document.createElement('a');
            a.href = url;
            const sanitizedName = finalSessionData.candidateName.replace(/[^a-z0-9]/gi, '_');
            a.download = `${sanitizedName}_Public_Interview_Report_${new Date().toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

        } catch (e) {
            console.error("PDF gen error", e);
        }
    };

    const handleFinish = async () => {
        setStep('done');
        // Auto Generate PDF
        await handleDownloadPDF();
    };

    if (step === 'loading') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center p-4">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-400 mb-4" />
                <p className="text-gray-300">Initializing secure session...</p>
            </div>
        );
    }

    if (step === 'limit-reached') {
        const nextTime = rateInfo?.nextReset ? new Date(rateInfo.nextReset).toLocaleString() : 'tomorrow';
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-slate-800 rounded-xl shadow-lg border border-slate-700 p-8 text-center border-t-4 border-t-amber-500">
                    <Clock className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">Limit Reached</h2>
                    <p className="text-slate-300 mb-6">
                        You have reached the maximum number of public interviews allowed per day (2).
                        Please come back later to continue practicing.
                    </p>
                    <div className="bg-slate-700/50 rounded-lg p-4 mb-4 border border-slate-600">
                        <p className="text-sm font-medium text-amber-400">Your limit will reset at:</p>
                        <p className="font-bold text-white mt-1">{nextTime}</p>
                    </div>
                </div>
            </div>
        );
    }

    if (step === 'topics') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6 md:p-12">
                <div className="max-w-5xl mx-auto space-y-6">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-white">Public Interview Practice</h1>
                        <p className="text-slate-300 mt-2">Select up to 3 topics from our question banks. You will be asked 10 questions total.</p>
                        {error && (
                            <div className="mt-4 inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-lg text-red-400 text-sm font-medium animate-in fade-in slide-in-from-top-2">
                                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                                {error}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col lg:flex-row gap-8 items-start">
                        {/* Left Side: Topic Selection */}
                        <div className="flex-1 w-full space-y-6">
                            {/* Search Bar */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                                <input
                                    type="text"
                                    value={techSearch}
                                    onChange={(e) => setTechSearch(e.target.value)}
                                    placeholder="Search topics..."
                                    className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {filteredTechs.length === 0 ? (
                                    <div className="col-span-1 sm:col-span-2 border border-slate-700/50 bg-slate-800/20 p-8 rounded-xl text-slate-400 text-center flex flex-col items-center justify-center">
                                        <BookOpen className="w-8 h-8 opacity-20 mb-3" />
                                        No matching topics found
                                    </div>
                                ) : (
                                    paginatedTechs.map((topic, i) => {
                                        const topicDisplayName = topic.path.replace('/question-bank-v1.md', '').replace('.md', '');
                                        return (
                                            <div
                                                key={i}
                                                onClick={() => {
                                                    if (!isConfirming) toggleTopic(topic.path);
                                                }}
                                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${isConfirming && !selectedTopics.includes(topic.path) ? 'opacity-50 cursor-not-allowed' : ''} ${selectedTopics.includes(topic.path) ? 'border-indigo-500 bg-indigo-900/40 shadow-lg shadow-indigo-500/20' : 'border-slate-700 bg-slate-800/50 hover:border-indigo-400 hover:bg-slate-800'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <BookOpen className={`w-5 h-5 ${selectedTopics.includes(topic.path) ? 'text-indigo-400' : 'text-slate-400'}`} />
                                                    <span className="font-medium text-slate-200">{topicDisplayName}</span>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-center gap-4 pt-2">
                                    <button
                                        onClick={() => setTechPage(p => Math.max(1, p - 1))}
                                        disabled={techPage === 1}
                                        className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                    >
                                        <ChevronLeft className="w-5 h-5 text-slate-300" />
                                    </button>
                                    <span className="text-sm font-medium text-slate-400">
                                        Page {techPage} of {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setTechPage(p => Math.min(totalPages, p + 1))}
                                        disabled={techPage === totalPages}
                                        className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                    >
                                        <ChevronRight className="w-5 h-5 text-slate-300" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Right Side: Floating Panel */}
                        <div className="w-full lg:w-80 flex-shrink-0 sticky top-8">
                            <div className="bg-slate-800/80 rounded-2xl border border-slate-700 p-6 flex flex-col gap-4">
                                {rateInfo && (
                                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 text-center">
                                        <p className="text-sm text-slate-400 mb-1">Interviews remaining today</p>
                                        <p className="text-3xl font-bold text-indigo-400">{rateInfo.remaining}</p>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300">Candidate Name <span className="text-red-400">*</span></label>
                                    <input
                                        type="text"
                                        required
                                        value={candidateNameInput}
                                        onChange={(e) => setCandidateNameInput(e.target.value)}
                                        placeholder="Enter your full name"
                                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                    />
                                </div>

                                {!isConfirming ? (
                                    <button
                                        disabled={selectedTopics.length === 0 || isLoadingQuestions || !candidateNameInput.trim()}
                                        onClick={handleReviewTopics}
                                        className="mt-2 w-full flex items-center justify-center gap-2 px-6 py-4 bg-indigo-600 text-white font-bold rounded-xl disabled:opacity-50 disabled:bg-slate-700 hover:bg-indigo-500 hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all"
                                    >
                                        {isLoadingQuestions ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Loading Questions...
                                            </>
                                        ) : (
                                            <>
                                                Review Topics {selectedTopics.length > 0 && `(${selectedTopics.length})`} <ArrowRight className="w-5 h-5" />
                                            </>
                                        )}
                                    </button>
                                ) : (
                                    <div className="mt-2 space-y-4 animate-in fade-in slide-in-from-top-4">
                                        <div className="space-y-4">
                                            <h3 className="text-white font-medium">Selected Topics ({selectedTopics.length}/3)</h3>
                                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                                {selectedTopics.map((t, idx) => (
                                                    <div key={idx} className="flex items-center justify-between text-sm text-indigo-300 bg-indigo-900/20 px-3 py-2 rounded-lg border border-indigo-500/20">
                                                        <div className="flex items-center gap-2 truncate">
                                                            <BookOpen className="w-4 h-4 flex-shrink-0" />
                                                            <span className="truncate">{t.replace('.md', '')}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl mt-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <AlertTriangle className="w-5 h-5 text-amber-500" />
                                                <span className="font-bold text-amber-500 text-sm">Warning</span>
                                            </div>
                                            <p className="text-xs text-slate-300 leading-relaxed">
                                                Once you start this cannot be changed and will consume <strong>1</strong> of your attempts for the day.
                                            </p>
                                        </div>
                                        <button
                                            onClick={handleStartInterview}
                                            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all"
                                        >
                                            Confirm & Start <Play className="w-4 h-4" fill="currentColor" />
                                        </button>
                                        <button
                                            onClick={() => setIsConfirming(false)}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition-all text-sm font-medium"
                                        >
                                            <ChevronLeft className="w-4 h-4" /> Go Back
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (step === 'interview') {
        const currentQ = questions[currentIndex];
        const questionIds = questions.map(q => q.id);

        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
                <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col min-h-screen">
                    {/* Header */}
                    <header className="flex items-center justify-between mb-6 pb-4 border-b border-slate-700">
                        <div className="flex flex-col">
                            <span className="text-sm font-medium text-indigo-400 uppercase tracking-wide">Public Interview Simulator</span>
                            <span className="text-slate-400 text-sm">Topic: {selectedTopics.join(', ').replace(/\.md/g, '')}</span>
                        </div>
                    </header>

                    {/* Progress Bar styled for dark mode using a modified wrapper or relying on component internal if possible, 
                        progressBar has hardcoded white bg internally, so we use a dark wrapper locally or let it be high contrast */}
                    <div className="mb-6">
                        <ProgressBar
                            currentIndex={currentIndex}
                            totalQuestions={questions.length}
                            assessments={sessionData.assessments}
                            questionIds={questionIds}
                            onNavigate={(idx) => {
                                // Only allow navigating to previously seen questions or the current one
                                if (idx <= currentIndex) setCurrentIndex(idx);
                            }}
                        />
                    </div>

                    {/* Content */}
                    <div className="flex flex-col mb-8 p-6 bg-slate-800/80 backdrop-blur-sm border border-slate-700 rounded-2xl shadow-xl transition-all h-fit">
                        <h2 className="text-2xl font-bold text-white mb-6 leading-relaxed">
                            {currentQ.question}
                        </h2>

                        {isFollowUp && followUpPrompt && !isSkipped && (
                            <div className="mb-6 p-4 bg-indigo-900/40 border-l-4 border-indigo-500 rounded-r-lg">
                                <p className="text-sm font-bold text-indigo-300 mb-1">Follow-up Agent:</p>
                                <p className="text-indigo-100">{followUpPrompt}</p>
                            </div>
                        )}

                        {agentLoading && agentPhase && !isSkipped && (
                            <div className="mb-6 p-4 bg-slate-700/30 border border-slate-600 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
                                <Loader2 className="w-5 h-5 text-indigo-400 animate-spin flex-shrink-0" />
                                <span className="text-slate-300 font-medium">{agentPhase}</span>
                            </div>
                        )}

                        {isSkipped ? (
                            <div className="mb-6 p-6 bg-slate-800/80 border border-emerald-500/30 rounded-xl relative overflow-hidden animate-in fade-in zoom-in-95">
                                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                                <h3 className="text-lg font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5" />
                                    Ideal Response
                                </h3>
                                <div className="text-slate-300 leading-relaxed text-sm whitespace-pre-wrap">
                                    {currentQ.modelAnswer || "No ideal response provided for this question."}
                                </div>
                                {currentQ.keywords && currentQ.keywords.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-slate-700/50">
                                        <p className="text-sm font-medium text-slate-400 mb-2">Key points to mention:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {currentQ.keywords.map((kw: string, i: number) => (
                                                <span key={i} className="px-2 py-1 text-xs rounded-md bg-slate-700 text-slate-300 border border-slate-600">
                                                    {kw}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="mt-6">
                                <SpeechToText
                                    key={`speech-${currentIndex}-${isFollowUp ? 'followup' : 'main'}`}
                                    onTranscriptChange={setTranscript}
                                    disabled={agentLoading}
                                    charLimit={1000}
                                    warningLimit={800}
                                    hideTranscript={true}
                                    isFollowUp={isFollowUp && !isSkipped}
                                />
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 mt-2">
                        <button
                            onClick={handleFinish}
                            className="text-slate-400 hover:text-slate-200 text-sm font-medium transition-colors"
                        >
                            Finish Interview Early
                        </button>

                        <div className="flex items-center gap-3">
                            {!isSkipped && skipsRemaining > 0 && !isFollowUp && (
                                <button
                                    onClick={handleSkip}
                                    disabled={agentLoading}
                                    className="px-4 py-3 bg-slate-700 text-slate-200 font-medium rounded-xl hover:bg-slate-600 transition-colors disabled:opacity-50"
                                >
                                    Skip Question (1 left)
                                </button>
                            )}

                            {isSkipped ? (
                                <button
                                    onClick={handleNextAfterSkip}
                                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all"
                                >
                                    {currentIndex === questions.length - 1 ? 'Finish Interview' : 'Next Question'}
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            ) : (
                                <button
                                    onClick={handleSubmitAnswer}
                                    disabled={agentLoading || !transcript.trim()}
                                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.3)] disabled:opacity-50 disabled:shadow-none transition-all"
                                >
                                    {agentLoading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Analyzing...
                                        </>
                                    ) : (
                                        <>
                                            {isFollowUp || currentIndex === questions.length - 1 ? 'Finish Question' : 'Submit Answer'}
                                            <Play className="w-4 h-4 fill-current" />
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (step === 'done') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-slate-800 rounded-xl shadow-2xl border border-slate-700 p-8 text-center border-t-4 border-t-emerald-500">
                    <Download className="w-12 h-12 text-emerald-400 mx-auto mb-4 animate-bounce" />
                    <h2 className="text-2xl font-bold text-white mb-2">Interview Complete!</h2>
                    <p className="text-slate-300 mb-6">
                        Great job completing your practice interview. If your download was blocked, click below to retrieve your PDF feedback report.
                    </p>
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={handleDownloadPDF}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-500 transition-all shadow-lg"
                        >
                            Download Report <Download className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => {
                                if (typeof window !== 'undefined') window.location.reload();
                            }}
                            className="w-full px-6 py-3 text-slate-300 hover:text-white bg-slate-700/50 hover:bg-slate-700 font-medium rounded-xl transition-all"
                        >
                            Return to Topics
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
