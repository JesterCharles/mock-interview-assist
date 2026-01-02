'use client';

// PDF generation page using react-pdf

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft, Download, Loader2, RefreshCw } from 'lucide-react';
import { useInterviewStore } from '@/store/interviewStore';
import { calculateAggregateScores } from '@/lib/langchain';
import { ParsedQuestion, StarterQuestion, InterviewSession } from '@/lib/types';

// Dynamically import PDF components (they don't work with SSR)
const PDFViewer = dynamic(
    () => import('@react-pdf/renderer').then((mod) => mod.PDFViewer),
    { ssr: false, loading: () => <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div> }
);

const PDFDownloadLink = dynamic(
    () => import('@react-pdf/renderer').then((mod) => mod.PDFDownloadLink),
    { ssr: false }
);

// Import react-pdf components directly (used in PDFReport component)
import {
    Document as PDFDocument,
    Page as PDFPage,
    Text as PDFText,
    View as PDFView,
    StyleSheet as PDFStyleSheet
} from '@react-pdf/renderer';

// PDF Styles
const styles = PDFStyleSheet.create({
    page: {
        padding: 40,
        fontFamily: 'Helvetica',
        fontSize: 11,
    },
    header: {
        marginBottom: 20,
        borderBottom: '2 solid #4F46E5',
        paddingBottom: 15,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 12,
        color: '#6B7280',
    },
    summaryContainer: {
        marginBottom: 20,
        padding: 15,
        backgroundColor: '#F3F4F6',
        borderRadius: 5,
    },
    summaryTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 10,
    },
    scoreRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5,
    },
    scoreLabel: {
        fontSize: 11,
        color: '#4B5563',
    },
    scoreValue: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#4F46E5',
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1F2937',
        marginTop: 15,
        marginBottom: 10,
        borderBottom: '1 solid #E5E7EB',
        paddingBottom: 5,
    },
    questionCard: {
        marginBottom: 15,
        padding: 10,
        backgroundColor: '#FAFAFA',
        borderLeft: '3 solid #4F46E5',
    },
    questionNumber: {
        fontSize: 10,
        color: '#6B7280',
        marginBottom: 3,
    },
    questionText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 8,
    },
    scoreContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
    },
    scoreBadge: {
        backgroundColor: '#4F46E5',
        color: '#FFFFFF',
        padding: '2 8',
        borderRadius: 3,
        fontSize: 10,
        fontWeight: 'bold',
        marginRight: 10,
    },
    feedback: {
        fontSize: 10,
        color: '#374151',
        lineHeight: 1.5,
    },
    keywords: {
        fontSize: 9,
        color: '#6B7280',
        marginTop: 5,
    },
    skippedBadge: {
        backgroundColor: '#9CA3AF',
        color: '#FFFFFF',
        padding: '2 8',
        borderRadius: 3,
        fontSize: 10,
    },
    // Technical feedback - blue theme
    technicalFeedbackContainer: {
        marginBottom: 15,
        padding: 12,
        backgroundColor: '#EFF6FF',  // Light blue background
        borderRadius: 5,
        borderLeft: '4 solid #2563EB',  // Blue left border
    },
    technicalFeedbackTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 6,
        color: '#1D4ED8',  // Dark blue
    },
    technicalFeedbackText: {
        fontSize: 10,
        color: '#1E40AF',  // Blue text
        lineHeight: 1.5,
    },
    // Soft skills feedback - purple theme
    softSkillsFeedbackContainer: {
        marginBottom: 15,
        padding: 12,
        backgroundColor: '#F5F3FF',  // Light purple background
        borderRadius: 5,
        borderLeft: '4 solid #7C3AED',  // Purple left border
    },
    softSkillsFeedbackTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 6,
        color: '#6D28D9',  // Dark purple
    },
    softSkillsFeedbackText: {
        fontSize: 10,
        color: '#5B21B6',  // Purple text
        lineHeight: 1.5,
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 40,
        right: 40,
        textAlign: 'center',
        fontSize: 9,
        color: '#9CA3AF',
    },
});

interface PDFReportProps {
    session: InterviewSession;
    questions: (ParsedQuestion | StarterQuestion)[];
    aggregateScores: ReturnType<typeof calculateAggregateScores>;
}

function PDFReport({ session, questions, aggregateScores }: PDFReportProps) {
    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    return (
        <PDFDocument>
            <PDFPage size="A4" style={styles.page}>
                {/* Header */}
                <PDFView style={styles.header}>
                    <PDFText style={styles.title}>Interview Assessment Report</PDFText>
                    <PDFText style={styles.subtitle}>
                        {session.candidateName || 'Candidate'} | {formatDate(session.date)}
                        {session.interviewerName && ` | Interviewer: ${session.interviewerName}`}
                    </PDFText>
                </PDFView>

                {/* Summary */}
                <PDFView style={styles.summaryContainer}>
                    <PDFText style={styles.summaryTitle}>Performance Summary</PDFText>
                    <PDFView style={styles.scoreRow}>
                        <PDFText style={styles.scoreLabel}>Overall Score:</PDFText>
                        <PDFText style={styles.scoreValue}>{aggregateScores.averageScore.toFixed(1)}/5</PDFText>
                    </PDFView>
                    <PDFView style={styles.scoreRow}>
                        <PDFText style={styles.scoreLabel}>Technical Score:</PDFText>
                        <PDFText style={styles.scoreValue}>{(session.overallTechnicalScore ?? aggregateScores.technicalScore).toFixed(1)}/5</PDFText>
                    </PDFView>
                    <PDFView style={styles.scoreRow}>
                        <PDFText style={styles.scoreLabel}>Soft Skills Score:</PDFText>
                        <PDFText style={styles.scoreValue}>{(session.overallSoftSkillScore ?? aggregateScores.softSkillScore).toFixed(1)}/5</PDFText>
                    </PDFView>
                    <PDFView style={styles.scoreRow}>
                        <PDFText style={styles.scoreLabel}>Questions Completed:</PDFText>
                        <PDFText style={styles.scoreValue}>{aggregateScores.completedCount} of {questions.length}</PDFText>
                    </PDFView>
                    {aggregateScores.skippedCount > 0 && (
                        <PDFView style={styles.scoreRow}>
                            <PDFText style={styles.scoreLabel}>Questions Skipped:</PDFText>
                            <PDFText style={styles.scoreValue}>{aggregateScores.skippedCount}</PDFText>
                        </PDFView>
                    )}
                </PDFView>

                {/* Overall Feedback Sections - Distinct colored backgrounds */}
                {(session.technicalFeedback || session.softSkillFeedback) && (
                    <>
                        {session.technicalFeedback && (
                            <PDFView style={styles.technicalFeedbackContainer}>
                                <PDFText style={styles.technicalFeedbackTitle}>Overall Technical Feedback</PDFText>
                                <PDFText style={styles.technicalFeedbackText}>{session.technicalFeedback}</PDFText>
                            </PDFView>
                        )}
                        {session.softSkillFeedback && (
                            <PDFView style={styles.softSkillsFeedbackContainer}>
                                <PDFText style={styles.softSkillsFeedbackTitle}>Overall Soft Skills Feedback</PDFText>
                                <PDFText style={styles.softSkillsFeedbackText}>{session.softSkillFeedback}</PDFText>
                            </PDFView>
                        )}
                    </>
                )}

                {/* Detailed Breakdown */}
                <PDFText style={styles.sectionTitle}>Detailed Question Breakdown</PDFText>

                {questions.map((question, index) => {
                    const assessment = session.assessments[question.id];
                    if (!assessment) return null;

                    const isParsedQuestion = 'modelAnswer' in question;
                    const questionText = isParsedQuestion
                        ? (question as ParsedQuestion).question
                        : (question as StarterQuestion).question;

                    return (
                        <PDFView key={question.id} style={styles.questionCard} wrap={false}>
                            <PDFText style={styles.questionNumber}>Question {index + 1}</PDFText>
                            <PDFText style={styles.questionText}>{questionText}</PDFText>

                            {assessment.didNotGetTo ? (
                                <PDFText style={styles.skippedBadge}>SKIPPED</PDFText>
                            ) : (
                                <>
                                    <PDFView style={styles.scoreContainer}>
                                        <PDFText style={styles.scoreBadge}>
                                            Score: {assessment.finalScore || assessment.llmScore || 'N/A'}/5
                                        </PDFText>
                                    </PDFView>
                                    <PDFText style={styles.feedback}>
                                        {assessment.finalFeedback || assessment.llmFeedback || 'No feedback available.'}
                                    </PDFText>
                                    {isParsedQuestion && assessment.keywordsHit.length > 0 && (
                                        <PDFText style={styles.keywords}>
                                            Keywords mentioned: {assessment.keywordsHit.join(', ')}
                                        </PDFText>
                                    )}
                                </>
                            )}
                        </PDFView>
                    );
                })}

                {/* Footer */}
                <PDFText style={styles.footer} fixed>
                    Generated by Interview Assessment Platform | {formatDate(new Date().toISOString())}
                </PDFText>
            </PDFPage>
        </PDFDocument>
    );
}

export default function PDFGenerationPage() {
    const router = useRouter();
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
        if (isClient && !session && !historySession) {
            router.push('/');
        }
    }, [session, historySession, isClient, router]);

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
        router.push('/');
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
                            onClick={handleNewInterview}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium flex items-center gap-2"
                        >
                            <RefreshCw className="w-4 h-4" />
                            New Interview
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
