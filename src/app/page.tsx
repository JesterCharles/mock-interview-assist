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
    const [isLoadingTopics, setIsLoadingTopics] = useState(true);
    const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Topic Selection State
    const [availableTopics, setAvailableTopics] = useState<any[]>([]);
    const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
    const [techSearch, setTechSearch] = useState('');
    const [techPage, setTechPage] = useState(1);
    const TECHS_PER_PAGE = 6;

    const filteredTechs = availableTopics.filter(t =>
        t.path.toLowerCase().includes(techSearch.toLowerCase())
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
    // The highest question index the candidate has reached (for locking)
    const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
    const [transcript, setTranscript] = useState('');
    const [cumulativeTranscript, setCumulativeTranscript] = useState('');
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
    const [hasDownloadedPDF, setHasDownloadedPDF] = useState(false);
    const [showExitModal, setShowExitModal] = useState(false);

    // Navigation blocker
    useEffect(() => {
        if (step !== 'done' || hasDownloadedPDF) return;

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = '';
        };

        // Internal navigation blocker (intercepts clicks on <a> tags)
        const handleInternalClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const anchor = target.closest('a');
            
            if (anchor && anchor.href && anchor.href.startsWith(window.location.origin)) {
                // Ignore clicks that are meant to be handled by local buttons (like Download)
                if (anchor.getAttribute('download')) return;
                
                // If the link is internal and not already handled by a modal or local action
                e.preventDefault();
                setShowExitModal(true);
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        document.addEventListener('click', handleInternalClick, true);
        
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            document.removeEventListener('click', handleInternalClick, true);
        };
    }, [step, hasDownloadedPDF]);

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
                    // Show the page shell immediately - topics load in background
                    setStep('topics');
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
        setIsLoadingTopics(true);
        try {
            // Using placeholder config because /api/github ignores credentials/repos and uses environment variables
            const service = new GitHubService('owner', 'repo', 'main');
            const files = await service.findQuestionBanks('');
            setAvailableTopics(files);
        } catch (e) {
            console.error("Error fetching topics from GitHub", e);
        } finally {
            setIsLoadingTopics(false);
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

    // Helper: clean a topic path into a readable name like "AI ML Fundamentals"
    const formatTopicName = (path: string) => {
        const segment = path.split('/')[0] || path;
        return segment.replace(/\.md$/i, '').replace(/[-_]/g, ' ');
    };

    const handleSubmitAnswer = async () => {
        if (!transcript.trim()) return;

        const currentQ = questions[currentIndex];

        // Build the full cumulative transcript (original + follow-up)
        const fullTranscript = cumulativeTranscript
            ? `${cumulativeTranscript}\n\n[Follow-up Response]\n${transcript}`
            : transcript;

        // If this is a follow-up response, skip the agent entirely -- go straight to scoring & advance
        if (isFollowUp) {
            const questionId = currentQ.id;
            setSessionData((prev: any) => ({
                ...prev,
                assessments: {
                    ...prev.assessments,
                    [questionId]: {
                        status: 'scoring',
                        didNotGetTo: false,
                        llmScore: undefined,
                        llmFeedback: 'Scoring in progress...',
                        finalScore: undefined,
                        finalFeedback: 'Scoring in progress...',
                        keywordsHit: [],
                        keywordsMissed: currentQ.keywords || []
                    }
                }
            }));

            if (currentIndex < questions.length - 1) {
                // Score in background
                fetch('/api/score', {
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
                            interviewerNotes: `Candidate Transcript:\n${fullTranscript}\n\nAgent Reasoning: Follow-up completed.`
                        }
                    })
                }).then(r => r.json()).then(scoreResult => {
                    setSessionData((prev: any) => ({
                        ...prev,
                        assessments: {
                            ...prev.assessments,
                            [questionId]: {
                                status: 'validated',
                                didNotGetTo: false,
                                llmScore: scoreResult.score || 3,
                                llmFeedback: scoreResult.feedback || 'Follow-up completed.',
                                finalScore: scoreResult.score || 3,
                                finalFeedback: scoreResult.feedback || 'Follow-up completed.',
                                keywordsHit: [],
                                keywordsMissed: currentQ.keywords || []
                            }
                        }
                    }));
                }).catch(err => {
                    console.error('Background scoring error for question', questionId, err);
                });

                // Advance immediately
                setCurrentIndex((prev: number) => prev + 1);
                setIsFollowUp(false);
                setFollowUpPrompt(null);
                setTranscript('');
                setCumulativeTranscript('');
            } else {
                setAgentLoading(true);
                setAgentPhase('Finalizing interview results...');
                // Await scoring for the final question
                try {
                    const r = await fetch('/api/score', {
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
                                interviewerNotes: `Candidate Transcript:\n${fullTranscript}\n\nAgent Reasoning: Follow-up completed.`
                            }
                        })
                    });
                    const scoreResult = await r.json();
                    
                    const updatedAssessments = {
                        ...sessionData.assessments,
                        [questionId]: {
                            status: 'validated',
                            didNotGetTo: false,
                            llmScore: scoreResult.score || 3,
                            llmFeedback: scoreResult.feedback || 'Follow-up completed.',
                            finalScore: scoreResult.score || 3,
                            finalFeedback: scoreResult.feedback || 'Follow-up completed.',
                            keywordsHit: [],
                            keywordsMissed: currentQ.keywords || []
                        }
                    };
                    const finalSessionData = {
                        ...sessionData,
                        assessments: updatedAssessments
                    };
                    setSessionData(finalSessionData);
                    await handleFinish(finalSessionData);
                } catch (err) {
                    console.error('Final scoring error', err);
                    await handleFinish();
                } finally {
                    setAgentLoading(false);
                    setAgentPhase('');
                }
            }
            return;
        }

        // Initial response: call the Agent API to decide if follow-up is needed
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

        try {
            const res = await fetch('/api/public/interview/agent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fingerprint,
                    interview_id: 'public-' + new Date().getTime(),
                    current_question_index: currentIndex + 1,
                    topic: currentQ.topic || 'General Technical',
                    original_question: currentQ.question,
                    full_response_so_far: fullTranscript,
                    char_count: fullTranscript.length
                })
            });

            const result = await res.json();

            if (result.needs_followup && result.follow_up_question) {
                setCumulativeTranscript(transcript);
                setIsFollowUp(true);
                setFollowUpPrompt(result.follow_up_question);
                setTranscript('');
            } else {
                // Fix 2: Use the full cumulative transcript for scoring, not just the last input
                const transcriptForScoring = fullTranscript;

                // Fix 3: Write a placeholder immediately so the UI can advance without waiting
                const questionId = currentQ.id;
                setSessionData((prev: any) => ({
                    ...prev,
                    assessments: {
                        ...prev.assessments,
                        [questionId]: {
                            status: 'scoring',
                            didNotGetTo: false,
                            llmScore: undefined,
                            llmFeedback: 'Scoring in progress...',
                            finalScore: undefined,
                            finalFeedback: 'Scoring in progress...',
                            keywordsHit: [],
                            keywordsMissed: currentQ.keywords || []
                        }
                    }
                }));

                const agentReasoning = result.reasoning || 'Completed answering.';
                if (currentIndex < questions.length - 1) {
                    // Fix 3: Score in the background - do NOT await this
                    fetch('/api/score', {
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
                                interviewerNotes: `Candidate Transcript:\n${transcriptForScoring}\n\nAgent Reasoning: ${agentReasoning}`
                            }
                        })
                    }).then(scoreRes => scoreRes.json()).then(scoreResult => {
                        setSessionData((prev: any) => ({
                            ...prev,
                            assessments: {
                                ...prev.assessments,
                                [questionId]: {
                                    status: 'validated',
                                    didNotGetTo: false,
                                    llmScore: scoreResult.score || 3,
                                    llmFeedback: scoreResult.feedback || `Agent observed: ${agentReasoning}`,
                                    finalScore: scoreResult.score || 3,
                                    finalFeedback: scoreResult.feedback || `Agent observed: ${agentReasoning}`,
                                    keywordsHit: [],
                                    keywordsMissed: currentQ.keywords || []
                                }
                            }
                        }));
                    }).catch(err => {
                        console.error('Background scoring error for question', questionId, err);
                        // Leave the placeholder in place; PDF will show 'Scoring in progress' for that question
                    });

                    // Fix 3: Advance immediately without waiting for scoring
                    setCurrentIndex((prev: number) => prev + 1);
                    setIsFollowUp(false);
                    setFollowUpPrompt(null);
                    setTranscript('');
                    setCumulativeTranscript('');
                } else {
                    setAgentPhase('Finalizing interview results...');
                    // Await scoring for the final question
                    try {
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
                                    interviewerNotes: `Candidate Transcript:\n${transcriptForScoring}\n\nAgent Reasoning: ${agentReasoning}`
                                }
                            })
                        });
                        const scoreResult = await scoreRes.json();
                        
                        const updatedAssessments = {
                            ...sessionData.assessments,
                            [questionId]: {
                                status: 'validated',
                                didNotGetTo: false,
                                llmScore: scoreResult.score || 3,
                                llmFeedback: scoreResult.feedback || `Agent observed: ${agentReasoning}`,
                                finalScore: scoreResult.score || 3,
                                finalFeedback: scoreResult.feedback || `Agent observed: ${agentReasoning}`,
                                keywordsHit: [],
                                keywordsMissed: currentQ.keywords || []
                            }
                        };
                        const finalSessionData = {
                            ...sessionData,
                            assessments: updatedAssessments
                        };
                        setSessionData(finalSessionData);
                        await handleFinish(finalSessionData);
                    } catch (err) {
                        console.error('Final scoring error', err);
                        await handleFinish();
                    }
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
                setCumulativeTranscript('');
            } else {
                await handleFinish();
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
            setCumulativeTranscript('');
        } else {
            handleFinish();
        }
    };

    const handleDownloadPDF = async (overrideSessionData?: any) => {
        try {
            const dataToUse = overrideSessionData || sessionData;
            // Drop any completely untouched questions from the PDF report by filtering the sessionData assessments
            // (Pending state means they never reached it before finishing early)
            const validAssessments = Object.fromEntries(
                Object.entries(dataToUse.assessments).filter(([_, a]: [string, any]) => a.status === 'validated')
            );

            const finalSessionData = {
                ...dataToUse,
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
            
            setHasDownloadedPDF(true);

        } catch (e) {
            console.error("PDF gen error", e);
        }
    };

    const handleFinish = async (overrideSessionData?: any) => {
        setStep('done');
    };

    if (step === 'loading') {
        return (
            <div className="nlm-bg flex flex-col items-center justify-center p-4">
                <div className="flex flex-col items-center animate-fade-in">
                    <div className="w-14 h-14 bg-gradient-to-br from-cyan-400 to-indigo-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-cyan-500/30">
                        <Loader2 className="w-7 h-7 animate-spin text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Next Level Mock</h2>
                    <p className="text-slate-400 text-sm">Initializing secure session...</p>
                </div>
            </div>
        );
    }

    if (step === 'limit-reached') {
        const nextTime = rateInfo?.nextReset ? new Date(rateInfo.nextReset).toLocaleString() : 'tomorrow';
        return (
            <div className="nlm-bg flex items-center justify-center p-4">
                <div className="max-w-md w-full glass-card-strong p-8 text-center animate-slide-up">
                    <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-amber-500/20">
                        <Clock className="w-7 h-7 text-amber-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Session Limit Reached</h2>
                    <p className="text-slate-400 mb-6 text-sm leading-relaxed">
                        You have reached the maximum number of interviews allowed per day.
                        Come back to continue practicing.
                    </p>
                    <div className="glass-card p-4 mb-4">
                        <p className="text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Resets at</p>
                        <p className="font-bold text-white text-lg">{nextTime}</p>
                    </div>
                </div>
            </div>
        );
    }

    if (step === 'topics') {
        return (
            <div className="nlm-bg p-6 md:p-12">
                <div className="max-w-5xl mx-auto space-y-8">
                    {/* Header */}
                    <div className="text-center mb-4 animate-slide-up">
                        <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">
                            Next Level <span className="gradient-text">Mock</span>
                        </h1>
                        <p className="text-slate-400 text-sm max-w-lg mx-auto leading-relaxed">
                            Select up to 3 topics from our question banks. You will be assessed across 10 questions.
                        </p>
                        {error && (
                            <div className="mt-4 inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl text-red-400 text-sm font-medium animate-slide-up">
                                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                {error}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col lg:flex-row gap-8 items-start">
                        {/* Left Side: Topic Selection */}
                        <div className="flex-1 w-full space-y-5">
                            {/* Search */}
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 w-4 h-4" />
                                <input
                                    type="text"
                                    value={techSearch}
                                    onChange={(e) => setTechSearch(e.target.value)}
                                    placeholder={isLoadingTopics ? "Loading topics..." : "Search topics..."}
                                    disabled={isLoadingTopics}
                                    className="w-full pl-11 pr-4 py-3 bg-white/[0.06] border border-white/[0.08] rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/30 outline-none transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
                                />
                            </div>

                            {isLoadingTopics ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {Array.from({ length: 6 }).map((_, i) => (
                                        <div
                                            key={i}
                                            className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.05] shimmer-bg"
                                            style={{ animationDelay: `${i * 0.15}s` }}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-5 h-5 rounded bg-white/[0.06]" />
                                                <div className="h-4 rounded bg-white/[0.06] flex-1" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {filteredTechs.length === 0 ? (
                                        <div className="col-span-1 sm:col-span-2 glass-card p-10 text-slate-500 text-center flex flex-col items-center justify-center">
                                            <BookOpen className="w-8 h-8 opacity-20 mb-3" />
                                            <span className="text-sm">No matching topics found</span>
                                        </div>
                                    ) : (
                                        paginatedTechs.map((topic, i) => {
                                            const topicDisplayName = topic.path.replace('/question-bank-v1.md', '').replace('.md', '');
                                            const isSelected = selectedTopics.includes(topic.path);
                                            return (
                                                <div
                                                    key={i}
                                                    onClick={() => {
                                                        if (!isConfirming) toggleTopic(topic.path);
                                                    }}
                                                    className={`p-4 rounded-xl border cursor-pointer transition-all duration-300 hover-lift ${isConfirming && !isSelected ? 'opacity-30 cursor-not-allowed' : ''} ${isSelected
                                                        ? 'border-cyan-500/40 bg-cyan-500/[0.06] shadow-lg shadow-cyan-500/10 glow-border-cyan'
                                                        : 'border-white/[0.06] bg-white/[0.05] hover:border-white/[0.15] hover:bg-white/[0.07]'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <BookOpen className={`w-4 h-4 flex-shrink-0 transition-colors duration-300 ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`} />
                                                        <span className={`font-medium text-sm transition-colors duration-300 ${isSelected ? 'text-white' : 'text-slate-300'}`}>{topicDisplayName}</span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            )}

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-center gap-4 pt-1">
                                    <button
                                        onClick={() => setTechPage(p => Math.max(1, p - 1))}
                                        disabled={techPage === 1}
                                        className="p-2 rounded-lg bg-white/[0.07] border border-white/[0.06] hover:bg-white/[0.08] disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-200"
                                    >
                                        <ChevronLeft className="w-4 h-4 text-slate-400" />
                                    </button>
                                    <span className="text-xs font-medium text-slate-500">
                                        {techPage} / {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setTechPage(p => Math.min(totalPages, p + 1))}
                                        disabled={techPage === totalPages}
                                        className="p-2 rounded-lg bg-white/[0.07] border border-white/[0.06] hover:bg-white/[0.08] disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-200"
                                    >
                                        <ChevronRight className="w-4 h-4 text-slate-400" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Right Side: Action Panel */}
                        <div className="w-full lg:w-80 flex-shrink-0 sticky top-20">
                            <div className="glass-card-strong p-6 flex flex-col gap-5">
                                {rateInfo && (
                                    <div className="glass-card p-4 text-center">
                                        <p className="text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Sessions remaining</p>
                                        <p className="text-3xl font-bold gradient-text-static">{rateInfo.remaining}</p>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Your Name <span className="text-red-400">*</span></label>
                                    <input
                                        type="text"
                                        required
                                        value={candidateNameInput}
                                        onChange={(e) => setCandidateNameInput(e.target.value)}
                                        placeholder="Enter your full name"
                                        className="w-full px-4 py-3 bg-white/[0.06] border border-white/[0.08] rounded-xl text-white placeholder-slate-600 focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/30 outline-none transition-all duration-300 text-sm"
                                    />
                                </div>

                                {!isConfirming ? (
                                    <button
                                        disabled={selectedTopics.length === 0 || isLoadingQuestions || isLoadingTopics || !candidateNameInput.trim()}
                                        onClick={handleReviewTopics}
                                        className="mt-1 w-full flex items-center justify-center gap-2 px-6 py-4 btn-primary text-sm"
                                    >
                                        {isLoadingQuestions ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Loading Questions...
                                            </>
                                        ) : (
                                            <>
                                                Review Topics {selectedTopics.length > 0 && `(${selectedTopics.length})`} <ArrowRight className="w-4 h-4" />
                                            </>
                                        )}
                                    </button>
                                ) : (
                                    <div className="mt-1 space-y-4 animate-slide-up">
                                        <div className="space-y-3">
                                            <h3 className="text-white font-semibold text-sm">Selected ({selectedTopics.length}/3)</h3>
                                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                                {selectedTopics.map((t, idx) => (
                                                    <div key={idx} className="flex items-center text-sm text-cyan-300 glass-card px-3 py-2.5 glow-border-cyan">
                                                        <div className="flex items-center gap-2 truncate">
                                                            <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
                                                            <span className="truncate">{t.replace('.md', '')}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="glass-card p-4 border-amber-500/20">
                                            <div className="flex items-center gap-2 mb-2">
                                                <AlertTriangle className="w-4 h-4 text-amber-400" />
                                                <span className="font-semibold text-amber-400 text-xs uppercase tracking-wide">Heads Up</span>
                                            </div>
                                            <p className="text-xs text-slate-400 leading-relaxed">
                                                Once you start this cannot be changed and will consume <strong className="text-slate-300">1</strong> of your sessions for the day.
                                            </p>
                                        </div>
                                        <button
                                            onClick={handleStartInterview}
                                            className="w-full flex items-center justify-center gap-2 px-6 py-4 btn-accent text-sm"
                                        >
                                            Start Interview <Play className="w-4 h-4" fill="currentColor" />
                                        </button>
                                        <button
                                            onClick={() => setIsConfirming(false)}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-slate-500 hover:text-white hover:bg-white/[0.07] rounded-xl transition-all duration-200 text-xs font-medium"
                                        >
                                            <ChevronLeft className="w-3.5 h-3.5" /> Go Back
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
            <div className="nlm-bg">
                <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col min-h-screen">
                    {/* Header */}
                    <header className="flex items-center justify-between mb-6 pb-4 border-b border-white/[0.06]">
                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-bold gradient-text-static uppercase tracking-widest">Next Level Mock</span>
                            <div className="flex items-center gap-2 flex-wrap">
                                {selectedTopics.map((t, i) => (
                                    <span key={i} className="text-xs font-medium text-slate-300 bg-white/[0.07] px-2.5 py-1 rounded-md border border-white/[0.06]">
                                        {formatTopicName(t)}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </header>

                    {/* Progress */}
                    <ProgressBar
                        currentIndex={currentIndex}
                        totalQuestions={questions.length}
                        assessments={sessionData.assessments}
                        questionIds={questionIds}
                        onNavigate={(idx) => {
                            // Allow navigating to any question up to the active (highest reached) question
                            if (idx <= activeQuestionIndex) setCurrentIndex(idx);
                        }}
                    />

                    {/* Question Card */}
                    <div className="glass-card-strong p-6 md:p-8 mb-6 animate-fade-in relative overflow-hidden">
                        {/* Question Number Badge */}
                        <div className="absolute top-0 right-0 bg-gradient-to-bl from-cyan-500/10 to-transparent w-32 h-32 pointer-events-none" />
                        <div className="flex items-start gap-4 mb-6">
                            <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-indigo-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-cyan-500/20">
                                <span className="text-white font-bold text-sm">{currentIndex + 1}</span>
                            </div>
                            <h2 className="text-xl md:text-2xl font-bold text-white leading-relaxed flex-1">
                                {currentQ.question}
                            </h2>
                        </div>

                        {/* Follow-up prompt */}
                        {isFollowUp && followUpPrompt && !isSkipped && (
                            <div className="mb-6 p-4 glass-card glow-border-cyan rounded-xl animate-slide-up">
                                <p className="text-xs font-bold text-cyan-400 mb-1.5 uppercase tracking-wider">Follow-up</p>
                                <p className="text-slate-200 text-sm leading-relaxed">{followUpPrompt}</p>
                            </div>
                        )}

                        {/* Agent loading phase */}
                        {agentLoading && agentPhase && !isSkipped && (
                            <div className="mb-6 p-4 glass-card rounded-xl flex items-center gap-3 animate-fade-in">
                                <Loader2 className="w-4 h-4 text-cyan-400 animate-spin flex-shrink-0" />
                                <span className="text-slate-400 text-sm font-medium">{agentPhase}</span>
                            </div>
                        )}

                        {/* Skipped: show model answer */}
                        {isSkipped ? (
                            <div className="mb-4 p-6 glass-card relative overflow-hidden animate-slide-up border-emerald-500/20">
                                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-400 to-teal-500" />
                                <h3 className="text-sm font-bold text-emerald-400 mb-3 flex items-center gap-2 uppercase tracking-wider">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Ideal Response
                                </h3>
                                <div className="text-slate-300 leading-relaxed text-sm whitespace-pre-wrap">
                                    {currentQ.modelAnswer || "No ideal response provided for this question."}
                                </div>
                                {currentQ.keywords && currentQ.keywords.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-white/[0.06]">
                                        <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Key Concepts</p>
                                        <div className="flex flex-wrap gap-2">
                                            {currentQ.keywords.map((kw: string, i: number) => (
                                                <span key={i} className="px-2.5 py-1 text-xs rounded-lg bg-white/[0.07] text-slate-400 border border-white/[0.06]">
                                                    {kw}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : sessionData.assessments[currentQ.id] && ['scoring', 'validated', 'ready'].includes(sessionData.assessments[currentQ.id]?.status) ? (
                            /* Locked: question already submitted */
                            <div className="mt-2 p-4 glass-card rounded-xl text-center">
                                <p className="text-slate-400 text-sm font-medium">Response submitted. {sessionData.assessments[currentQ.id]?.status === 'validated' ? 'Scored.' : 'Scoring in progress...'}</p>
                                {currentIndex < activeQuestionIndex && (
                                    <button
                                        onClick={() => setCurrentIndex(activeQuestionIndex)}
                                        className="mt-3 flex items-center gap-2 mx-auto px-4 py-2 btn-primary text-xs"
                                    >
                                        Return to Current Question <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="mt-2">
                                <SpeechToText
                                    key={`speech-${currentIndex}-${isFollowUp ? 'followup' : 'main'}`}
                                    onTranscriptChange={setTranscript}
                                    onAutoSubmit={() => handleSubmitAnswer()}
                                    disabled={agentLoading}
                                    charLimit={isFollowUp ? Math.max(0, 1600 - cumulativeTranscript.length) : 1000}
                                    warningLimit={isFollowUp ? Math.max(0, 1300 - cumulativeTranscript.length) : 800}
                                    hideTranscript={true}
                                    isFollowUp={isFollowUp && !isSkipped}
                                />
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2">
                        <button
                            onClick={handleFinish}
                            className="text-slate-600 hover:text-slate-300 text-xs font-medium transition-colors duration-200"
                        >
                            Finish Early
                        </button>

                        <div className="flex items-center gap-3">
                            {!isSkipped && skipsRemaining > 0 && !isFollowUp && (
                                <button
                                    onClick={handleSkip}
                                    disabled={agentLoading}
                                    className="px-4 py-3 bg-white/[0.07] border border-white/[0.06] text-slate-400 font-medium rounded-xl hover:bg-white/[0.08] hover:text-white transition-all duration-200 disabled:opacity-30 text-sm"
                                >
                                    Skip (1 left)
                                </button>
                            )}

                            {isSkipped ? (
                                <button
                                    onClick={handleNextAfterSkip}
                                    className="flex items-center gap-2 px-6 py-3 btn-accent text-sm"
                                >
                                    {currentIndex === questions.length - 1 ? 'Finish Interview' : 'Next Question'}
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            ) : (
                                <button
                                    onClick={handleSubmitAnswer}
                                    disabled={agentLoading || !transcript.trim()}
                                    className="flex items-center gap-2 px-6 py-3 btn-primary text-sm"
                                >
                                    {agentLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
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
        const validAssessments = Object.fromEntries(
            Object.entries(sessionData.assessments).filter(([_, a]: [string, any]) => a.status === 'validated')
        );
        const aggregateScores = calculateAggregateScores(validAssessments as any);
        const answeredQs = questions.filter(q => validAssessments[q.id]);

        return (
            <div className="nlm-bg p-4 md:p-8 min-h-screen">
                <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20">
                    <div className="glass-card-strong p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-gradient-to-bl from-emerald-500/10 to-transparent w-24 h-24 pointer-events-none" />
                        
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-2 gap-6">
                            {/* Left Section: Icon & Status */}
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
                                    <CheckCircle2 className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex flex-col">
                                    <h2 className="text-xl font-bold text-white leading-tight">Interview Complete</h2>
                                    <p className="text-slate-400 text-xs font-medium">
                                        Great work, {sessionData.candidateName}. {aggregateScores.completedCount} questions analyzed.
                                    </p>
                                </div>
                            </div>

                            {/* Right Section: Actions */}
                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <button
                                    onClick={() => handleDownloadPDF(sessionData)}
                                    className="flex-1 md:flex-none h-10 px-5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-all duration-200 text-sm shadow-lg shadow-cyan-500/20"
                                >
                                    <Download className="w-4 h-4" /> Download
                                </button>
                                <button
                                    onClick={() => {
                                        if (!hasDownloadedPDF) {
                                            setShowExitModal(true);
                                        } else {
                                            if (typeof window !== 'undefined') window.location.reload();
                                        }
                                    }}
                                    className="flex-1 md:flex-none h-10 px-5 text-slate-300 hover:text-white bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] font-medium rounded-xl transition-all duration-200 text-sm"
                                >
                                    New Session
                                </button>
                            </div>
                        </div>

                        {/* Bottom Section: Score Summary */}
                        <div className="mt-8 pt-6 border-t border-white/[0.05] flex justify-center">
                            <div className="glass-card px-6 py-3 border-emerald-500/20 flex items-center gap-4">
                                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Aggregate Score</span>
                                <div className="h-4 w-[1px] bg-white/10" />
                                <span className="text-2xl font-bold text-white">{aggregateScores.averageScore.toFixed(1)} <span className="text-xs text-slate-400 font-normal">/ 5.0</span></span>
                            </div>
                        </div>
                    </div>

                    {/* Custom Confirmation Modal */}
                    {showExitModal && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                            <div className="max-w-md w-full glass-card-strong p-8 text-center animate-slide-up relative border-amber-500/20 shadow-2xl shadow-amber-500/10">
                                <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-amber-500/20">
                                    <AlertTriangle className="w-8 h-8 text-amber-500" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-3">Unsaved Results</h3>
                                <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                                    You have not downloaded your PDF report yet. If you start a new session, you will <span className="text-amber-400 font-semibold">permanently lose</span> this feedback.
                                </p>
                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={() => {
                                            setShowExitModal(false);
                                            handleDownloadPDF(sessionData);
                                        }}
                                        className="w-full flex items-center justify-center gap-2 px-6 py-4 btn-accent text-sm"
                                    >
                                        <Download className="w-4 h-4" /> Download Now
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (typeof window !== 'undefined') window.location.reload();
                                        }}
                                        className="w-full px-6 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 font-medium rounded-xl transition-all duration-200 text-sm"
                                    >
                                        Discard and Exit
                                    </button>
                                    <button
                                        onClick={() => setShowExitModal(false)}
                                        className="w-full px-6 py-3 text-slate-500 hover:text-white font-medium text-xs transition-all duration-200"
                                    >
                                        Go Back
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-6">
                        <h3 className="text-xl font-bold text-white mb-4">Detailed Question Breakdown</h3>
                        {answeredQs.map((q, idx) => {
                            const evalData: any = validAssessments[q.id];
                            return (
                                <div key={idx} className="glass-card-strong p-4 md:p-6 relative overflow-hidden border-indigo-500/10">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500 to-cyan-400" />
                                    
                                    {/* Score at top right */}
                                    <div className="absolute top-4 right-4 px-2.5 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded-lg">
                                        <span className="text-[10px] uppercase tracking-wider text-indigo-300 font-semibold mr-1.5">Score</span>
                                        <span className="text-white font-bold text-sm">{evalData.finalScore || evalData.llmScore || 'N/A'}/5</span>
                                    </div>

                                    <h4 className="text-base font-bold text-white mb-3 pr-20 leading-relaxed">
                                        <span className="text-cyan-400 mr-2 border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 rounded text-xs uppercase tracking-tighter">Q{idx + 1}</span> 
                                        {q.question}
                                    </h4>

                                    {evalData.interviewerNotes && (
                                        <div className="mb-4">
                                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1.5">Your Transcript</p>
                                            <div className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.04]">
                                                <p className="text-xs text-slate-400 italic leading-relaxed">
                                                    {evalData.interviewerNotes.includes('Candidate Transcript:\n') 
                                                        ? evalData.interviewerNotes.split('Agent Reasoning:')[0].replace('Candidate Transcript:\n', '').trim() 
                                                        : evalData.interviewerNotes}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="pl-0">
                                        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1.5">AI Feedback</p>
                                        <p className="text-sm text-slate-300 leading-relaxed">
                                            {evalData.finalFeedback || evalData.llmFeedback || 'No feedback available.'}
                                        </p>
                                    </div>
                                    
                                    {evalData.keywordsHit?.length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-white/[0.05]">
                                            <div className="flex flex-wrap gap-2">
                                                {evalData.keywordsHit.map((kw: string, i: number) => (
                                                    <span key={i} className="px-2 py-0.5 text-[10px] rounded bg-emerald-500/5 text-emerald-400/70 border border-emerald-500/10">
                                                        ✓ {kw}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    return null;
}

