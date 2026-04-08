'use client';

// PDF generation page using react-pdf

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft, Download, Loader2, RefreshCw, Mail, Send } from 'lucide-react';
import { useInterviewStore } from '@/store/interviewStore';
import { calculateAggregateScores } from '@/lib/langchain';
import { ParsedQuestion, StarterQuestion, InterviewSession } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';
import toast from 'react-hot-toast';

// Dynamically import PDF components (they don't work with SSR)
const PDFViewer = dynamic(
    () => import('@react-pdf/renderer').then((mod) => mod.PDFViewer),
    { ssr: false, loading: () => <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div> }
);

const PDFDownloadLink = dynamic(
    () => import('@react-pdf/renderer').then((mod) => mod.PDFDownloadLink),
    { ssr: false }
);

// Import react-pdf components directly (used in PDFReport component in case needed for other things)
import { PDFReport } from '@/components/PDFReport';

export default function PDFGenerationPage() {
    const router = useRouter();
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const { session: storeSession, getAllQuestions, resetSession } = useInterviewStore();
    const [isClient, setIsClient] = useState(false);
    const [historySession, setHistorySession] = useState<InterviewSession | null>(null);
    const [isFromHistory, setIsFromHistory] = useState(false);

    useEffect(() => {
        setIsClient(true);

        // Check if we're viewing from history
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('from') === 'history') {
            setIsFromHistory(true);
            const savedSession = sessionStorage.getItem('pdf-session');
            if (savedSession) {
                try {
                    setHistorySession(JSON.parse(savedSession));
                } catch (e) {
                    console.error('Failed to parse history session:', e);
                }
            }
        }
    }, []);

    // Use history session if available, otherwise use store session
    const session = historySession || storeSession;

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
            return;
        }
        
        // Add a short delay before aggressively redirecting to allow Zustand state propagation 
        // after rapid page transitions like generate PDF to prevent dashboard flash
        const timeout = setTimeout(() => {
            if (isClient && !session && !historySession) {
                router.push('/dashboard');
            }
        }, 300);

        return () => clearTimeout(timeout);
    }, [session, historySession, isClient, router, isAuthenticated, authLoading]);

    if (!session || !isClient) {
        return (
            <div className="min-h-screen nlm-bg flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            </div>
        );
    }

    // Get questions from the session directly (for history) or from store
    const allQuestions = historySession
        ? [...historySession.starterQuestions, ...historySession.questions]
        : getAllQuestions();
    const aggregateScores = calculateAggregateScores(session.assessments);

    const fileName = `interview_${session.candidateName?.replace(/\s+/g, '_') || 'report'}_${new Date().toISOString().split('T')[0]}.pdf`;

    const handleNewInterview = () => {
        resetSession();
        sessionStorage.removeItem('pdf-session');
        // Reset to phase 1 for completely new setup
        useInterviewStore.getState().setSetupPhase(1);
        router.push('/dashboard');
    };

    const handleRepeatInterview = () => {
        resetSession();
        sessionStorage.removeItem('pdf-session');
        // Keep selections, go to phase 2 for new candidate details
        useInterviewStore.getState().setSetupPhase(2);
        router.push('/dashboard');
    };

    const handleBack = () => {
        if (isFromHistory) {
            sessionStorage.removeItem('pdf-session');
            router.push('/history');
        } else {
            router.push('/review');
        }
    };



    return (
        <main className="min-h-screen nlm-bg">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8 flex flex-col gap-4">
                    <button
                        onClick={handleBack}
                        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors self-start"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        {isFromHistory ? 'Back to History' : 'Back to Review'}
                    </button>

                    <div className="flex items-center justify-between w-full">
                        {/* Left Side Actions */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleRepeatInterview}
                                className="px-4 py-2 text-indigo-300 hover:text-indigo-200 font-medium flex items-center gap-2 border border-indigo-500/30 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 transition-colors"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Repeat Interview
                            </button>
                            <button
                                onClick={handleNewInterview}
                                className="px-4 py-2 text-slate-300 hover:text-white font-medium flex items-center gap-2 border border-slate-500/30 rounded-lg bg-slate-500/10 hover:bg-slate-500/20 transition-colors"
                            >
                                New Setup
                            </button>
                        </div>
                        
                        {/* Right Side Actions */}
                        <div className="flex items-center gap-3">
                            <EmailSender 
                                session={session} 
                                allQuestions={allQuestions} 
                                aggregateScores={aggregateScores} 
                                fileName={fileName} 
                            />


                        <PDFDownloadLink
                            document={
                                <PDFReport
                                    session={session}
                                    questions={allQuestions}
                                    aggregateScores={aggregateScores}
                                />
                            }
                            fileName={fileName}
                            className="h-[48px] px-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2"
                        >
                            {({ loading }) =>
                                loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Preparing...
                                    </>
                                ) : (
                                    <>
                                        <Download className="w-5 h-5" />
                                        Download PDF
                                    </>
                                )
                            }
                        </PDFDownloadLink>
                        </div>
                    </div>
                </div>

                {/* PDF Preview */}
                <div className="glass-card-strong rounded-xl overflow-hidden border border-white/10">
                    <div className="bg-black/20 px-4 py-2 border-b border-white/10">
                        <span className="text-sm font-medium text-slate-400">Preview</span>
                    </div>
                    <div className="h-[800px]">
                        <PDFViewer width="100%" height="100%" showToolbar={false}>
                            <PDFReport
                                session={session}
                                questions={allQuestions}
                                aggregateScores={aggregateScores}
                            />
                        </PDFViewer>
                    </div>
                </div>
            </div>
        </main>
    );
}

// Sub-component to perform email sending in the background without blocking the UI
function EmailSender({ session, allQuestions, aggregateScores, fileName }: any) {
    const [candidateEmail, setCandidateEmail] = useState('');
    const [statusMessage, setStatusMessage] = useState<{text: string, type: 'info'|'success'|'error'} | null>(null);

    const handleSendEmail = () => {
        if (!candidateEmail) {
            toast.error("Please enter candidate email");
            return;
        }

        const targetEmail = candidateEmail;
        // Immediately clear input field so UI isn't locked up
        setCandidateEmail('');
        setStatusMessage({ text: `Preparing report for ${targetEmail}...`, type: 'info' });

        // Fire asynchronous operation in the background
        (async () => {
            try {
                // 1. Generate PDF on client side
                setStatusMessage({ text: `Generating PDF...`, type: 'info' });
                const { pdf } = await import('@react-pdf/renderer');
                const blob = await pdf(<PDFReport session={session} questions={allQuestions} aggregateScores={aggregateScores} />).toBlob();
                
                // 2. Convert blob to Base64
                const reader = new FileReader();
                reader.readAsDataURL(blob);
                reader.onloadend = async () => {
                    const base64data = (reader.result as string).split(',')[1];
                    
                    // 3. Assemble overall feedback for LangChain summarizer
                    const overallFeedback = `
Technical Feedback:
${session.technicalFeedback || "No technical feedback provided."}

Soft Skills Feedback:
${session.softSkillFeedback || "No soft skills provided."}
                    `.trim();
                    
                    // 4. Send to our API
                    setStatusMessage({ text: `Generating AI summary & mailing...`, type: 'info' });
                    try {
                        const res = await fetch('/api/send-email', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                candidateEmail: targetEmail,
                                candidateName: session.candidateName,
                                interviewerName: session.interviewerName,
                                overallFeedback,
                                pdfBase64: base64data,
                                pdfFileName: fileName
                            })
                        });

                        const data = await res.json();
                        
                        if (!res.ok) {
                            throw new Error(data.error || "Failed to send email");
                        }
                        
                        toast.success(`Report emailed to ${targetEmail}`);
                        setStatusMessage({ text: `Sent successfully!`, type: 'success' });
                        setTimeout(() => setStatusMessage(null), 5000);
                    } catch (fetchErr: any) {
                        console.error("Fetch email error:", fetchErr);
                        toast.error(fetchErr.message || `Failed to send email to ${targetEmail}`);
                        setStatusMessage({ text: `Error sending email`, type: 'error' });
                        setTimeout(() => setStatusMessage(null), 5000);
                    }
                };
                
                reader.onerror = () => {
                    throw new Error("Failed to read PDF file.");
                };
            } catch (e: any) {
                 console.error("Email generation error:", e);
                 toast.error(e.message || `Failed to generate report for ${targetEmail}`);
                 setStatusMessage({ text: `PDF Generation Failed`, type: 'error' });
                 setTimeout(() => setStatusMessage(null), 5000);
            }
        })();
    };

    return (
        <div className="flex flex-col relative ml-2">
            <div className="flex flex-col sm:flex-row items-center gap-1.5 bg-black/20 rounded-lg p-1 border border-white/10 h-[48px]">
                <div className="relative flex items-center h-full w-full sm:w-auto">
                    <Mail className="absolute left-3 w-4 h-4 text-slate-400" />
                    <input 
                        type="email" 
                        placeholder="Candidate Email" 
                        value={candidateEmail}
                        onChange={(e) => setCandidateEmail(e.target.value)}
                        className="pl-9 pr-3 h-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none w-full sm:w-56"
                    />
                </div>
                <button
                    onClick={handleSendEmail}
                    disabled={!candidateEmail}
                    className="px-4 h-full bg-indigo-600/80 hover:bg-indigo-600 disabled:bg-slate-700 disabled:text-slate-400 text-white text-sm font-medium rounded-md flex items-center justify-center gap-2 transition-colors border border-indigo-500/50 w-full sm:w-auto"
                >
                    <Send className="w-4 h-4" />
                    Send
                </button>
            </div>
            
            {/* Background Status Indicator */}
            {statusMessage && (
                <div className={`absolute top-[110%] left-0 w-full text-xs px-2 py-1.5 rounded-md border flex items-center gap-2 animate-in fade-in slide-in-from-top-1 z-10 ${
                    statusMessage.type === 'info' ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300' :
                    statusMessage.type === 'success' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' :
                    'bg-red-500/20 border-red-500/30 text-red-400'
                }`}>
                    {statusMessage.type === 'info' && <Loader2 className="w-3 h-3 animate-spin shrink-0" />}
                    <span className="truncate">{statusMessage.text}</span>
                </div>
            )}
        </div>
    );
}

