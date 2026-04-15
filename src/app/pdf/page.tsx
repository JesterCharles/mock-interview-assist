'use client';

// PDF generation page using react-pdf

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft, Download, Loader2, RefreshCw, Mail, Send } from 'lucide-react';
import { useInterviewStore } from '@/store/interviewStore';
import { calculateAggregateScores } from '@/lib/langchain';
import { InterviewSession } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';
import toast from 'react-hot-toast';

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

// Dynamically import PDF components (they don't work with SSR)
const PDFViewer = dynamic(
    () => import('@react-pdf/renderer').then((mod) => mod.PDFViewer),
    {
        ssr: false,
        loading: () => (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
            </div>
        ),
    }
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

    const session = historySession || storeSession;

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
            return;
        }

        const timeout = setTimeout(() => {
            if (isClient && !session && !historySession) {
                router.push('/dashboard');
            }
        }, 300);

        return () => clearTimeout(timeout);
    }, [session, historySession, isClient, router, isAuthenticated, authLoading]);

    if (!session || !isClient) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
            </div>
        );
    }

    const allQuestions = historySession
        ? [...historySession.starterQuestions, ...historySession.questions]
        : getAllQuestions();
    const aggregateScores = calculateAggregateScores(session.assessments);

    const fileName = `interview_${session.candidateName?.replace(/\s+/g, '_') || 'report'}_${new Date().toISOString().split('T')[0]}.pdf`;

    const handleNewInterview = () => {
        resetSession();
        sessionStorage.removeItem('pdf-session');
        useInterviewStore.getState().setSetupPhase(1);
        router.push('/dashboard');
    };

    const handleRepeatInterview = () => {
        resetSession();
        sessionStorage.removeItem('pdf-session');
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
        <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8 flex flex-col gap-4">
                    <button
                        onClick={handleBack}
                        className="flex items-center gap-2 transition-colors self-start text-sm"
                        style={{ color: 'var(--muted)' }}
                    >
                        <ArrowLeft className="w-5 h-5" />
                        {isFromHistory ? 'Back to History' : 'Back to Review'}
                    </button>

                    <div className="flex items-center justify-between w-full flex-wrap gap-3">
                        {/* Left Side Actions */}
                        <div className="flex items-center gap-3 flex-wrap">
                            <button
                                onClick={handleRepeatInterview}
                                className="btn-secondary-flat flex items-center gap-2"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Repeat Interview
                            </button>
                            <button
                                onClick={handleNewInterview}
                                className="btn-secondary-flat"
                            >
                                New Setup
                            </button>
                        </div>

                        {/* Right Side Actions */}
                        <div className="flex items-center gap-3 flex-wrap">
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
                                className="btn-accent-flat inline-flex items-center gap-2"
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
                <div className="rounded-xl overflow-hidden" style={surfaceCardStyle}>
                    <div
                        className="px-4 py-2"
                        style={{
                            background: 'var(--surface-muted)',
                            borderBottom: '1px solid var(--border-subtle)',
                        }}
                    >
                        <span className="text-xs font-medium" style={{ ...monoLabel, color: 'var(--muted)' }}>Preview</span>
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
    const [statusMessage, setStatusMessage] = useState<{ text: string, type: 'info' | 'success' | 'error' } | null>(null);

    const handleSendEmail = () => {
        if (!candidateEmail) {
            toast.error("Please enter candidate email");
            return;
        }

        const targetEmail = candidateEmail;
        setCandidateEmail('');
        setStatusMessage({ text: `Preparing report for ${targetEmail}...`, type: 'info' });

        (async () => {
            try {
                setStatusMessage({ text: `Generating PDF...`, type: 'info' });
                const { pdf } = await import('@react-pdf/renderer');
                const blob = await pdf(<PDFReport session={session} questions={allQuestions} aggregateScores={aggregateScores} />).toBlob();

                const reader = new FileReader();
                reader.readAsDataURL(blob);
                reader.onloadend = async () => {
                    const base64data = (reader.result as string).split(',')[1];

                    const overallFeedback = `
Technical Feedback:
${session.technicalFeedback || "No technical feedback provided."}

Soft Skills Feedback:
${session.softSkillFeedback || "No soft skills provided."}
                    `.trim();

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

    const statusColor =
        statusMessage?.type === 'success' ? 'var(--success)'
        : statusMessage?.type === 'error' ? 'var(--danger)'
        : 'var(--accent)';
    const statusBg =
        statusMessage?.type === 'success' ? '#E8F5EE'
        : statusMessage?.type === 'error' ? '#FDECEB'
        : 'var(--highlight)';

    return (
        <div className="flex flex-col relative">
            <div
                className="flex flex-col sm:flex-row items-center gap-1.5 rounded-lg p-1 h-[48px]"
                style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                }}
            >
                <div className="relative flex items-center h-full w-full sm:w-auto">
                    <Mail className="absolute left-3 w-4 h-4" style={{ color: 'var(--muted)' }} />
                    <input
                        type="email"
                        placeholder="Candidate Email"
                        value={candidateEmail}
                        onChange={(e) => setCandidateEmail(e.target.value)}
                        className="pl-9 pr-3 h-full bg-transparent text-sm focus:outline-none w-full sm:w-56"
                        style={{ color: 'var(--ink)' }}
                    />
                </div>
                <button
                    onClick={handleSendEmail}
                    disabled={!candidateEmail}
                    className="px-4 h-full text-sm font-medium rounded-md flex items-center justify-center gap-2 transition-colors w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                        background: candidateEmail ? 'var(--accent)' : 'var(--surface-muted)',
                        color: candidateEmail ? '#FFFFFF' : 'var(--muted)',
                    }}
                >
                    <Send className="w-4 h-4" />
                    Send
                </button>
            </div>

            {/* Background Status Indicator */}
            {statusMessage && (
                <div
                    className="absolute top-[110%] left-0 w-full text-xs px-2 py-1.5 rounded-md flex items-center gap-2 animate-in fade-in slide-in-from-top-1 z-10"
                    style={{
                        background: statusBg,
                        border: `1px solid ${statusColor}`,
                        color: statusColor,
                    }}
                >
                    {statusMessage.type === 'info' && <Loader2 className="w-3 h-3 animate-spin shrink-0" />}
                    <span className="truncate">{statusMessage.text}</span>
                </div>
            )}
        </div>
    );
}
