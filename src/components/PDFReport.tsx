import React from 'react';
import {
    Document as PDFDocument,
    Page as PDFPage,
    Text as PDFText,
    View as PDFView,
    StyleSheet as PDFStyleSheet
} from '@react-pdf/renderer';
import { calculateAggregateScores } from '@/lib/langchain';
import { ParsedQuestion, StarterQuestion, InterviewSession } from '@/lib/types';

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
    technicalFeedbackContainer: {
        marginBottom: 15,
        padding: 12,
        backgroundColor: '#EFF6FF',
        borderRadius: 5,
        borderLeft: '4 solid #2563EB',
    },
    technicalFeedbackTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 6,
        color: '#1D4ED8',
    },
    technicalFeedbackText: {
        fontSize: 10,
        color: '#1E40AF',
        lineHeight: 1.5,
    },
    softSkillsFeedbackContainer: {
        marginBottom: 15,
        padding: 12,
        backgroundColor: '#F5F3FF',
        borderRadius: 5,
        borderLeft: '4 solid #7C3AED',
    },
    transcriptContainer: {
        marginTop: 10,
        marginBottom: 10,
        padding: 10,
        backgroundColor: '#F3F4F6',
        borderRadius: 4,
        borderLeft: '3 solid #9CA3AF',
    },
    transcriptTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#4B5563',
        marginBottom: 4,
    },
    transcriptText: {
        fontSize: 9,
        color: '#374151',
        lineHeight: 1.5,
        fontStyle: 'italic',
    },
    softSkillsFeedbackTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 6,
        color: '#6D28D9',
    },
    softSkillsFeedbackText: {
        fontSize: 10,
        color: '#5B21B6',
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
    automatedWarning: {
        backgroundColor: '#FEF2F2',
        padding: 10,
        marginBottom: 15,
        borderRadius: 4,
        borderLeft: '4 solid #EF4444',
    },
    automatedWarningText: {
        color: '#B91C1C',
        fontSize: 10,
        fontWeight: 'bold',
        textAlign: 'center',
    }
});

export interface PDFReportProps {
    session: InterviewSession;
    questions: (ParsedQuestion | StarterQuestion)[];
    aggregateScores: ReturnType<typeof calculateAggregateScores>;
    isAutomatedPublic?: boolean;
}

export function PDFReport({ session, questions, aggregateScores, isAutomatedPublic = false }: PDFReportProps) {
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
                {/* AI Warning Banner for Public Interface */}
                {isAutomatedPublic && (
                    <PDFView style={styles.automatedWarning}>
                        <PDFText style={styles.automatedWarningText}>
                            WARNING: This feedback was AI-generated with no Human-in-the-Loop (Trainer) oversight.
                        </PDFText>
                    </PDFView>
                )}

                {/* Header */}
                <PDFView style={styles.header}>
                    <PDFText style={styles.title}>Interview Assessment Report</PDFText>
                    <PDFText style={styles.subtitle}>
                        {session.candidateName || 'Candidate'} | {formatDate(session.date)}
                        {session.interviewerName && ` | Interviewer: ${session.interviewerName}`}
                        {isAutomatedPublic && ` | Type: Public Automated`}
                    </PDFText>
                </PDFView>

                {/* Summary */}
                <PDFView style={styles.summaryContainer}>
                    <PDFText style={styles.summaryTitle}>Performance Summary</PDFText>
                    <PDFView style={styles.scoreRow}>
                        <PDFText style={styles.scoreLabel}>Overall Score:</PDFText>
                        <PDFText style={styles.scoreValue}>{aggregateScores.averageScore.toFixed(1)}/5</PDFText>
                    </PDFView>
                    {!isAutomatedPublic && (
                        <>
                            <PDFView style={styles.scoreRow}>
                                <PDFText style={styles.scoreLabel}>Technical Score:</PDFText>
                                <PDFText style={styles.scoreValue}>{(session.overallTechnicalScore ?? aggregateScores.technicalScore).toFixed(1)}/5</PDFText>
                            </PDFView>
                            <PDFView style={styles.scoreRow}>
                                <PDFText style={styles.scoreLabel}>Soft Skills Score:</PDFText>
                                <PDFText style={styles.scoreValue}>{(session.overallSoftSkillScore ?? aggregateScores.softSkillScore).toFixed(1)}/5</PDFText>
                            </PDFView>
                        </>
                    )}
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
                                    {isAutomatedPublic && assessment.interviewerNotes && (
                                        <PDFView style={styles.transcriptContainer}>
                                            <PDFText style={styles.transcriptTitle}>Your Speech-to-Text Transcript:</PDFText>
                                            <PDFText style={styles.transcriptText}>
                                                {assessment.interviewerNotes.includes('Candidate Transcript:\n')
                                                    ? assessment.interviewerNotes.split('Agent Reasoning:')[0].replace('Candidate Transcript:\n', '').trim()
                                                    : assessment.interviewerNotes}
                                            </PDFText>
                                        </PDFView>
                                    )}
                                    <PDFView style={styles.scoreContainer}>
                                        <PDFText style={styles.scoreBadge}>
                                            Score: {assessment.finalScore || assessment.llmScore || 'N/A'}/5
                                        </PDFText>
                                    </PDFView>
                                    <PDFText style={styles.feedback}>
                                        {assessment.finalFeedback || assessment.llmFeedback || 'No feedback available.'}
                                    </PDFText>
                                    {isParsedQuestion && assessment.keywordsHit?.length > 0 && (
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
