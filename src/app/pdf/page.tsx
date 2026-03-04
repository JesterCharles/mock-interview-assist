'use client';

// PDF generation page using react-pdf

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft, Download, Loader2, RefreshCw } from 'lucide-react';
import { useInterviewStore } from '@/store/interviewStore';
import { calculateAggregateScores } from '@/lib/langchain';
import { ParsedQuestion, StarterQuestion, InterviewSession } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';

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
        if (isClient && !session && !historySession) {
            router.push('/dashboard');
        }
    }, [session, historySession, isClient, router, isAuthenticated, authLoading]);

    if (!session || !isClient) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
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
        <main className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <button
                        onClick={handleBack}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        {isFromHistory ? 'Back to History' : 'Back to Review'}
                    </button>

                    <h1 className="text-2xl font-bold text-gray-900">PDF Report</h1>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleRepeatInterview}
                            className="px-4 py-2 text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-2 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Repeat Interview
                        </button>
                        <button
                            onClick={handleNewInterview}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium flex items-center gap-2"
                        >
                            New Setup
                        </button>
                        <PDFDownloadLink
                            document={
                                <PDFReport
                                    session={session}
                                    questions={allQuestions}
                                    aggregateScores={aggregateScores}
                                />
                            }
                            fileName={fileName}
                            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2"
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

                {/* PDF Preview */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                    <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
                        <span className="text-sm font-medium text-gray-600">Preview</span>
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
