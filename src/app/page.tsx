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
import { GitHubService } from '@/lib/github-service';

interface RateLimitInfo {
    allowed: boolean;
    remaining: number;
    nextReset: string;
}

// DESIGN.md surface card style (reusable)
const surfaceCard: React.CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
};

const surfaceMutedCard: React.CSSProperties = {
    background: 'var(--surface-muted)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 12,
};

const headingDisplay: React.CSSProperties = {
    fontFamily: "var(--font-clash-display), 'Clash Display', system-ui, sans-serif",
    fontWeight: 600,
    letterSpacing: '-0.01em',
    color: 'var(--ink)',
};

const monoLabel: React.CSSProperties = {
    fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', ui-monospace, monospace",
    fontSize: 11,
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'var(--muted)',
};

export default function PublicInterviewPage() {
    const [step, setStep] = useState<'loading' | 'limit-reached' | 'topics' | 'interview' | 'done'>('loading');
    const [fingerprint, setFingerprint] = useState<string>('');
    const [rateInfo, setRateInfo] = useState<RateLimitInfo | null>(null);
    const [isConfirming, setIsConfirming] = useState(false);
    const [isLoadingTopics, setIsLoadingTopics] = useState(true);
    const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [associateAuthEnabled, setAssociateAuthEnabled] = useState(false);

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

    // Associate PIN auth is feature-gated until v1.2. When disabled, hide the
    // "Sign in to track progress" CTA so anonymous users aren't pushed into a
    // flow that returns 404 server-side.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch('/api/associate/status', { cache: 'no-store' });
                if (!res.ok) return;
                const data = (await res.json()) as { enabled?: boolean };
                if (!cancelled) setAssociateAuthEnabled(!!data.enabled);
            } catch {
                // ignore — stays hidden
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

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
            const { files } = await service.loadManifest();
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
        // Persist public session to Supabase (fire-and-forget)
        const finalData = overrideSessionData || sessionData;
        if (finalData?.id && fingerprint) {
            fetch('/api/public/interview/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fingerprint, session: finalData }),
            }).catch(err => console.error('[public-interview] persist failed:', err));
        }
        setStep('done');
    };

    if (step === 'loading') {
        return (
            <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)', color: 'var(--ink)', fontFamily: "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif" }}><main className="mx-auto w-full px-6 py-12" style={{ maxWidth: '1120px' }}>
                <div className="flex flex-col items-center justify-center py-24 animate-fade-in">
                    <Loader2 className="w-7 h-7 animate-spin mb-4" style={{ color: 'var(--accent)' }} />
                    <h2 style={{ ...headingDisplay, fontSize: 22, marginBottom: 6 }}>Next Level Mock</h2>
                    <p style={{ color: 'var(--muted)', fontSize: 14 }}>Initializing secure session...</p>
                </div>
            </main></div>
        );
    }

    if (step === 'limit-reached') {
        const nextTime = rateInfo?.nextReset ? new Date(rateInfo.nextReset).toLocaleString() : 'tomorrow';
        return (
            <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)', color: 'var(--ink)', fontFamily: "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif" }}><main className="mx-auto w-full px-6 py-12" style={{ maxWidth: '1120px' }}>
                <div className="flex items-center justify-center py-12">
                    <div className="max-w-md w-full p-8 text-center animate-slide-up" style={surfaceCard}>
                        <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-5"
                            style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
                        >
                            <Clock className="w-6 h-6" style={{ color: 'var(--warning)' }} />
                        </div>
                        <h2 style={{ ...headingDisplay, fontSize: 28, marginBottom: 8 }}>Session Limit Reached</h2>
                        <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
                            You have reached the maximum number of interviews allowed per day.
                            Come back to continue practicing.
                        </p>
                        <div className="p-4" style={surfaceMutedCard}>
                            <p style={{ ...monoLabel, marginBottom: 4 }}>Resets at</p>
                            <p style={{ ...headingDisplay, fontSize: 18 }}>{nextTime}</p>
                        </div>
                    </div>
                </div>
            </main></div>
        );
    }

    if (step === 'topics') {
        return (
            <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)', color: 'var(--ink)', fontFamily: "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif" }}><main className="mx-auto w-full px-6 py-12" style={{ maxWidth: '1120px' }}>
                <div className="space-y-8">
                    {/* Header */}
                    <div className="text-center mb-4 animate-slide-up">
                        <h1 style={{ ...headingDisplay, fontSize: 48, marginBottom: 8 }}>
                            Next Level Mock
                        </h1>
                        <p style={{ color: 'var(--muted)', fontSize: 14, maxWidth: 520, margin: '0 auto', lineHeight: 1.6 }}>
                            Select up to 3 topics from our question banks. You will be assessed across 10 questions.
                        </p>
                        {associateAuthEnabled && (
                            <div className="mt-4 inline-flex items-center gap-2 text-sm" style={{ color: 'var(--muted)' }}>
                                <span>Have a PIN from your trainer?</span>
                                <a
                                    href="/signin?as=associate"
                                    className="inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 rounded"
                                    style={{ color: 'var(--accent)', outlineColor: 'var(--accent)' }}
                                >
                                    Sign in to track your progress
                                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                                </a>
                            </div>
                        )}
                        {error && (
                            <div
                                className="mt-4 inline-flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium animate-slide-up"
                                style={{
                                    background: '#FDECEB',
                                    border: '1px solid var(--danger)',
                                    color: 'var(--danger)',
                                }}
                            >
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
                                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: 'var(--muted)' }} />
                                <input
                                    type="text"
                                    value={techSearch}
                                    onChange={(e) => setTechSearch(e.target.value)}
                                    placeholder={isLoadingTopics ? "Loading topics..." : "Search topics..."}
                                    disabled={isLoadingTopics}
                                    className="w-full pl-11 pr-4 py-3 rounded-xl outline-none transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                                    style={{
                                        background: 'var(--surface)',
                                        border: '1px solid var(--border)',
                                        color: 'var(--ink)',
                                    }}
                                />
                            </div>

                            {isLoadingTopics ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {Array.from({ length: 6 }).map((_, i) => (
                                        <div key={i} className="p-4 animate-fade-in" style={surfaceMutedCard}>
                                            <div className="flex items-center gap-3">
                                                <div className="w-5 h-5 rounded" style={{ background: 'var(--border-subtle)' }} />
                                                <div className="h-4 rounded flex-1" style={{ background: 'var(--border-subtle)' }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {filteredTechs.length === 0 ? (
                                        <div
                                            className="col-span-1 sm:col-span-2 p-10 text-center flex flex-col items-center justify-center"
                                            style={{ ...surfaceCard, color: 'var(--muted)' }}
                                        >
                                            <BookOpen className="w-8 h-8 opacity-40 mb-3" />
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
                                                    className={`p-4 cursor-pointer transition-colors ${isConfirming && !isSelected ? 'opacity-30 cursor-not-allowed' : ''}`}
                                                    style={{
                                                        background: isSelected ? 'var(--highlight)' : 'var(--surface)',
                                                        border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
                                                        borderRadius: 12,
                                                        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                                                    }}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <BookOpen className="w-4 h-4 flex-shrink-0" style={{ color: isSelected ? 'var(--accent)' : 'var(--muted)' }} />
                                                        <span className="font-medium text-sm" style={{ color: isSelected ? 'var(--ink)' : 'var(--ink)' }}>{topicDisplayName}</span>
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
                                        className="p-2 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                                    >
                                        <ChevronLeft className="w-4 h-4" style={{ color: 'var(--muted)' }} />
                                    </button>
                                    <span style={{ ...monoLabel }}>
                                        {techPage} / {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setTechPage(p => Math.min(totalPages, p + 1))}
                                        disabled={techPage === totalPages}
                                        className="p-2 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                                    >
                                        <ChevronRight className="w-4 h-4" style={{ color: 'var(--muted)' }} />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Right Side: Action Panel */}
                        <div className="w-full lg:w-80 flex-shrink-0 sticky top-20">
                            <div className="p-6 flex flex-col gap-5" style={surfaceCard}>
                                {rateInfo && (
                                    <div className="p-4 text-center" style={surfaceMutedCard}>
                                        <p style={{ ...monoLabel, marginBottom: 4 }}>Sessions remaining</p>
                                        <p style={{ ...headingDisplay, fontSize: 28, color: 'var(--accent)' }}>{rateInfo.remaining}</p>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label style={{ ...monoLabel }}>
                                        Your Name <span style={{ color: 'var(--danger)' }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={candidateNameInput}
                                        onChange={(e) => setCandidateNameInput(e.target.value)}
                                        placeholder="Enter your full name"
                                        className="w-full px-4 py-3 rounded-xl outline-none transition-colors text-sm"
                                        style={{
                                            background: 'var(--bg)',
                                            border: '1px solid var(--border)',
                                            color: 'var(--ink)',
                                        }}
                                    />
                                </div>

                                {!isConfirming ? (
                                    <button
                                        disabled={selectedTopics.length === 0 || isLoadingQuestions || isLoadingTopics || !candidateNameInput.trim()}
                                        onClick={handleReviewTopics}
                                        className="mt-1 w-full flex items-center justify-center gap-2 btn-accent-flat text-sm"
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
                                            <h3 style={{ ...headingDisplay, fontSize: 16 }}>Selected ({selectedTopics.length}/3)</h3>
                                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                                {selectedTopics.map((t, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="flex items-center text-sm px-3 py-2.5"
                                                        style={{
                                                            background: 'var(--highlight)',
                                                            border: '1px solid var(--accent)',
                                                            borderRadius: 8,
                                                            color: 'var(--accent)',
                                                        }}
                                                    >
                                                        <div className="flex items-center gap-2 truncate">
                                                            <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
                                                            <span className="truncate">{t.replace('.md', '')}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div
                                            className="p-4"
                                            style={{
                                                background: '#FEF3E0',
                                                border: '1px solid var(--warning)',
                                                borderRadius: 12,
                                            }}
                                        >
                                            <div className="flex items-center gap-2 mb-2">
                                                <AlertTriangle className="w-4 h-4" style={{ color: 'var(--warning)' }} />
                                                <span style={{ ...monoLabel, color: 'var(--warning)' }}>Heads Up</span>
                                            </div>
                                            <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
                                                Once you start this cannot be changed and will consume <strong style={{ color: 'var(--ink)' }}>1</strong> of your sessions for the day.
                                            </p>
                                        </div>
                                        <button
                                            onClick={handleStartInterview}
                                            className="w-full flex items-center justify-center gap-2 btn-accent-flat text-sm"
                                        >
                                            Start Interview <Play className="w-4 h-4" fill="currentColor" />
                                        </button>
                                        <button
                                            onClick={() => setIsConfirming(false)}
                                            className="w-full flex items-center justify-center gap-2 btn-secondary-flat text-xs"
                                        >
                                            <ChevronLeft className="w-3.5 h-3.5" /> Go Back
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main></div>
        );
    }

    if (step === 'interview') {
        const currentQ = questions[currentIndex];
        const questionIds = questions.map(q => q.id);

        return (
            <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)', color: 'var(--ink)', fontFamily: "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif" }}><main className="mx-auto w-full px-6 py-12" style={{ maxWidth: '1120px' }}>
                <div className="flex flex-col">
                    {/* Header */}
                    <header
                        className="flex items-center justify-between mb-6 pb-4"
                        style={{ borderBottom: '1px solid var(--border-subtle)' }}
                    >
                        <div className="flex flex-col gap-1">
                            <span style={{ ...monoLabel }}>Next Level Mock</span>
                            <div className="flex items-center gap-2 flex-wrap">
                                {selectedTopics.map((t, i) => (
                                    <span
                                        key={i}
                                        className="text-xs font-medium px-2.5 py-1"
                                        style={{
                                            background: 'var(--surface-muted)',
                                            border: '1px solid var(--border-subtle)',
                                            borderRadius: 6,
                                            color: 'var(--ink)',
                                        }}
                                    >
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
                    <div className="p-6 md:p-8 mb-6 animate-fade-in" style={surfaceCard}>
                        <div className="flex items-start gap-4 mb-6">
                            <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                style={{ background: 'var(--accent)', color: 'var(--surface)' }}
                            >
                                <span className="font-bold text-sm">{currentIndex + 1}</span>
                            </div>
                            <h2 style={{ ...headingDisplay, fontSize: 22, lineHeight: 1.4, flex: 1 }}>
                                {currentQ.question}
                            </h2>
                        </div>

                        {/* Follow-up prompt */}
                        {isFollowUp && followUpPrompt && !isSkipped && (
                            <div
                                className="mb-6 p-4 animate-slide-up"
                                style={{
                                    background: 'var(--highlight)',
                                    border: '1px solid var(--accent)',
                                    borderRadius: 12,
                                }}
                            >
                                <p style={{ ...monoLabel, color: 'var(--accent)', marginBottom: 6 }}>Follow-up</p>
                                <p style={{ color: 'var(--ink)', fontSize: 14, lineHeight: 1.6 }}>{followUpPrompt}</p>
                            </div>
                        )}

                        {/* Agent loading phase */}
                        {agentLoading && agentPhase && !isSkipped && (
                            <div
                                className="mb-6 p-4 flex items-center gap-3 animate-fade-in"
                                style={surfaceMutedCard}
                            >
                                <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" style={{ color: 'var(--accent)' }} />
                                <span style={{ color: 'var(--muted)', fontSize: 14, fontWeight: 500 }}>{agentPhase}</span>
                            </div>
                        )}

                        {/* Skipped: show model answer */}
                        {isSkipped ? (
                            <div className="mb-4 p-6 animate-slide-up" style={surfaceMutedCard}>
                                <h3 className="mb-3 flex items-center gap-2" style={{ ...monoLabel, color: 'var(--success)' }}>
                                    <CheckCircle2 className="w-4 h-4" />
                                    Ideal Response
                                </h3>
                                <div style={{ color: 'var(--ink)', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                    {currentQ.modelAnswer || "No ideal response provided for this question."}
                                </div>
                                {currentQ.keywords && currentQ.keywords.length > 0 && (
                                    <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                                        <p style={{ ...monoLabel, marginBottom: 8 }}>Key Concepts</p>
                                        <div className="flex flex-wrap gap-2">
                                            {currentQ.keywords.map((kw: string, i: number) => (
                                                <span
                                                    key={i}
                                                    className="px-2.5 py-1 text-xs"
                                                    style={{
                                                        background: 'var(--surface)',
                                                        border: '1px solid var(--border-subtle)',
                                                        borderRadius: 6,
                                                        color: 'var(--muted)',
                                                    }}
                                                >
                                                    {kw}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : sessionData.assessments[currentQ.id] && ['scoring', 'validated', 'ready'].includes(sessionData.assessments[currentQ.id]?.status) ? (
                            /* Locked: question already submitted */
                            <div className="mt-2 p-4 text-center" style={surfaceMutedCard}>
                                <p style={{ color: 'var(--muted)', fontSize: 14, fontWeight: 500 }}>
                                    Response submitted. {sessionData.assessments[currentQ.id]?.status === 'validated' ? 'Scored.' : 'Scoring in progress...'}
                                </p>
                                {currentIndex < activeQuestionIndex && (
                                    <button
                                        onClick={() => setCurrentIndex(activeQuestionIndex)}
                                        className="mt-3 mx-auto btn-accent-flat text-xs"
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
                            className="text-xs font-medium transition-colors hover:underline"
                            style={{ color: 'var(--muted)' }}
                        >
                            Finish Early
                        </button>

                        <div className="flex items-center gap-3">
                            {!isSkipped && skipsRemaining > 0 && !isFollowUp && (
                                <button
                                    onClick={handleSkip}
                                    disabled={agentLoading}
                                    className="btn-secondary-flat text-sm"
                                >
                                    Skip (1 left)
                                </button>
                            )}

                            {isSkipped ? (
                                <button
                                    onClick={handleNextAfterSkip}
                                    className="flex items-center gap-2 btn-accent-flat text-sm"
                                >
                                    {currentIndex === questions.length - 1 ? 'Finish Interview' : 'Next Question'}
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            ) : (
                                <button
                                    onClick={handleSubmitAnswer}
                                    disabled={agentLoading || !transcript.trim()}
                                    className="flex items-center gap-2 btn-accent-flat text-sm"
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
            </main></div>
        );
    }

    if (step === 'done') {
        const validAssessments = Object.fromEntries(
            Object.entries(sessionData.assessments).filter(([_, a]: [string, any]) => a.status === 'validated')
        );
        const aggregateScores = calculateAggregateScores(validAssessments as any);
        const answeredQs = questions.filter(q => validAssessments[q.id]);

        return (
            <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)', color: 'var(--ink)', fontFamily: "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif" }}><main className="mx-auto w-full px-6 py-12" style={{ maxWidth: '1120px' }}>
                <div className="space-y-8 animate-fade-in pb-12">
                    <div className="p-6" style={surfaceCard}>
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            {/* Left Section: Icon & Status */}
                            <div className="flex items-center gap-4">
                                <div
                                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                                    style={{ background: 'var(--success)', color: 'var(--surface)' }}
                                >
                                    <CheckCircle2 className="w-6 h-6" />
                                </div>
                                <div className="flex flex-col">
                                    <h2 style={{ ...headingDisplay, fontSize: 22 }}>Interview Complete</h2>
                                    <p style={{ color: 'var(--muted)', fontSize: 13 }}>
                                        Great work, {sessionData.candidateName}. {aggregateScores.completedCount} questions analyzed.
                                    </p>
                                </div>
                            </div>

                            {/* Right Section: Actions */}
                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <button
                                    onClick={() => handleDownloadPDF(sessionData)}
                                    className="flex-1 md:flex-none btn-accent-flat text-sm"
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
                                    className="flex-1 md:flex-none btn-secondary-flat text-sm"
                                >
                                    New Session
                                </button>
                            </div>
                        </div>

                        {/* Bottom Section: Score Summary */}
                        <div className="mt-8 pt-6 flex justify-center" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                            <div className="px-6 py-3 flex items-center gap-4" style={surfaceMutedCard}>
                                <span style={{ ...monoLabel }}>Aggregate Score</span>
                                <div className="h-4 w-px" style={{ background: 'var(--border)' }} />
                                <span style={{ ...headingDisplay, fontSize: 28, fontVariantNumeric: 'tabular-nums' }}>
                                    {aggregateScores.averageScore.toFixed(1)}
                                    <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 400 }}> / 5.0</span>
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Custom Confirmation Modal */}
                    {showExitModal && (
                        <div
                            className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in"
                            style={{ background: 'rgba(26,26,26,0.6)' }}
                        >
                            <div className="max-w-md w-full p-8 text-center animate-slide-up" style={surfaceCard}>
                                <div
                                    className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
                                    style={{ background: '#FEF3E0', border: '1px solid var(--warning)' }}
                                >
                                    <AlertTriangle className="w-8 h-8" style={{ color: 'var(--warning)' }} />
                                </div>
                                <h3 style={{ ...headingDisplay, fontSize: 22, marginBottom: 12 }}>Unsaved Results</h3>
                                <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 32, lineHeight: 1.6 }}>
                                    You have not downloaded your PDF report yet. If you start a new session, you will <span style={{ color: 'var(--warning)', fontWeight: 600 }}>permanently lose</span> this feedback.
                                </p>
                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={() => {
                                            setShowExitModal(false);
                                            handleDownloadPDF(sessionData);
                                        }}
                                        className="w-full flex items-center justify-center gap-2 btn-accent-flat text-sm"
                                    >
                                        <Download className="w-4 h-4" /> Download Now
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (typeof window !== 'undefined') window.location.reload();
                                        }}
                                        className="w-full px-6 py-3 font-medium rounded-lg transition-colors text-sm"
                                        style={{ color: 'var(--danger)' }}
                                    >
                                        Discard and Exit
                                    </button>
                                    <button
                                        onClick={() => setShowExitModal(false)}
                                        className="w-full px-6 py-3 font-medium text-xs transition-colors"
                                        style={{ color: 'var(--muted)' }}
                                    >
                                        Go Back
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-6">
                        <h3 style={{ ...headingDisplay, fontSize: 22, marginBottom: 16 }}>Detailed Question Breakdown</h3>
                        {answeredQs.map((q, idx) => {
                            const evalData: any = validAssessments[q.id];
                            return (
                                <div key={idx} className="p-4 md:p-6 relative" style={surfaceCard}>
                                    {/* Score at top right */}
                                    <div
                                        className="absolute top-4 right-4 px-2.5 py-1"
                                        style={{
                                            background: 'var(--highlight)',
                                            border: '1px solid var(--accent)',
                                            borderRadius: 6,
                                        }}
                                    >
                                        <span style={{ ...monoLabel, color: 'var(--accent)', marginRight: 6 }}>Score</span>
                                        <span style={{ ...headingDisplay, fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>
                                            {evalData.finalScore || evalData.llmScore || 'N/A'}/5
                                        </span>
                                    </div>

                                    <h4 style={{ ...headingDisplay, fontSize: 18, marginBottom: 12, paddingRight: 80, lineHeight: 1.5 }}>
                                        <span
                                            className="mr-2 px-1.5 py-0.5 text-xs"
                                            style={{
                                                background: 'var(--highlight)',
                                                border: '1px solid var(--accent)',
                                                borderRadius: 4,
                                                color: 'var(--accent)',
                                                fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
                                                fontWeight: 500,
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.05em',
                                            }}
                                        >
                                            Q{idx + 1}
                                        </span>
                                        {q.question}
                                    </h4>

                                    {evalData.interviewerNotes && (
                                        <div className="mb-4">
                                            <p style={{ ...monoLabel, marginBottom: 6 }}>Your Transcript</p>
                                            <div className="p-3" style={surfaceMutedCard}>
                                                <p style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic', lineHeight: 1.6 }}>
                                                    {evalData.interviewerNotes.includes('Candidate Transcript:\n')
                                                        ? evalData.interviewerNotes.split('Agent Reasoning:')[0].replace('Candidate Transcript:\n', '').trim()
                                                        : evalData.interviewerNotes}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <p style={{ ...monoLabel, marginBottom: 6 }}>AI Feedback</p>
                                        <p style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.6 }}>
                                            {evalData.finalFeedback || evalData.llmFeedback || 'No feedback available.'}
                                        </p>
                                    </div>

                                    {evalData.keywordsHit?.length > 0 && (
                                        <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                                            <div className="flex flex-wrap gap-2">
                                                {evalData.keywordsHit.map((kw: string, i: number) => (
                                                    <span
                                                        key={i}
                                                        className="px-2 py-0.5 text-xs"
                                                        style={{
                                                            background: '#E8F5EE',
                                                            border: '1px solid var(--success)',
                                                            borderRadius: 4,
                                                            color: 'var(--success)',
                                                        }}
                                                    >
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
            </main></div>
        );
    }

    return null;
}
