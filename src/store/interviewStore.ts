// Zustand store for interview session state

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
    InterviewSession,
    ParsedQuestion,
    QuestionAssessment,
    SoftSkillsAssessment,
    StarterQuestion,
    generateStarterQuestions,
    DEFAULT_SOFT_SKILLS,
} from '@/lib/types';
import { selectRandomQuestions } from '@/lib/markdownParser';
import { GitHubFile } from '@/lib/github-service';

interface InterviewStore {
    session: InterviewSession | null;

    // Setup Wizard State
    setupPhase: 1 | 2 | 3;
    repoConfig: {
        owner: string;
        repo: string;
        branch: string;
    };
    interviewLevel: 'entry' | 'experienced';
    selectedTechs: GitHubFile[];
    loadingQuestions: boolean;

    // Actions
    setSetupPhase: (phase: 1 | 2 | 3) => void;
    setRepoConfig: (config: { owner: string; repo: string; branch: string }) => void;
    setInterviewLevel: (level: 'entry' | 'experienced') => void;
    setSelectedTechs: (techs: GitHubFile[]) => void;
    setLoadingQuestions: (loading: boolean) => void;

    // Session management
    createSession: (
        questions: ParsedQuestion[],
        questionCount: number,
        selectedWeeks: number[], // Kept for backward compat, though we might use selectedTechs now
        candidateName?: string,
        interviewerName?: string,
        interviewLevel?: 'entry' | 'experienced'
    ) => void;

    resetSession: () => void;

    // Question navigation
    setCurrentQuestionIndex: (index: number) => void;
    nextQuestion: () => void;
    previousQuestion: () => void;

    // Assessment updates
    updateAssessment: (questionId: string, updates: Partial<QuestionAssessment>) => void;
    toggleKeyword: (questionId: string, keyword: string) => void;
    toggleSoftSkill: (questionId: string, skill: keyof SoftSkillsAssessment) => void;
    setInterviewerNotes: (questionId: string, notes: string) => void;
    markDidNotGetTo: (questionId: string, value: boolean) => void;

    // LLM scoring
    setLLMResult: (questionId: string, score: number, feedback: string) => void;
    validateScore: (questionId: string, score: number, feedback: string) => void;

    // Session status
    completeQuestion: (questionId: string) => void;
    finishInterview: () => void;
    completeReview: () => void;

    // Overall scores and feedback
    setOverallScores: (technicalScore: number, softSkillScore: number) => void;
    setOverallFeedback: (technicalFeedback: string, softSkillFeedback: string) => void;

    // Computed helpers
    getCurrentQuestion: () => ParsedQuestion | StarterQuestion | null;
    getAssessment: (questionId: string) => QuestionAssessment | undefined;
    getAllQuestions: () => (ParsedQuestion | StarterQuestion)[];
    getProgress: () => { current: number; total: number };
}

const generateSessionId = () => `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const useInterviewStore = create<InterviewStore>()(
    persist(
        (set, get) => ({
            session: null,
            setupPhase: 1,
            repoConfig: {
                owner: 'Cognizant-Training', // Default placeholder
                repo: 'Question-Bank',
                branch: 'main'
            },
            interviewLevel: 'entry',
            selectedTechs: [],
            loadingQuestions: false,

            setSetupPhase: (phase) => set({ setupPhase: phase }),
            setRepoConfig: (config) => set({ repoConfig: config }),
            setInterviewLevel: (level) => set({ interviewLevel: level }),
            setSelectedTechs: (techs) => set({ selectedTechs: techs }),
            setLoadingQuestions: (loading) => set({ loadingQuestions: loading }),

            createSession: (questions, questionCount, selectedWeeks, candidateName, interviewerName, interviewLevel = 'entry') => {
                const selectedQuestions = selectRandomQuestions(questions, questionCount, interviewLevel);
                // Generate fresh starter questions with random variations
                const starterQuestions = generateStarterQuestions();

                // Create initial assessments for all questions
                const assessments: Record<string, QuestionAssessment> = {};

                // Starter questions assessments
                starterQuestions.forEach(sq => {
                    assessments[sq.id] = {
                        questionId: sq.id,
                        keywordsHit: [],
                        keywordsMissed: [],
                        softSkills: { ...DEFAULT_SOFT_SKILLS },
                        interviewerNotes: '',
                        didNotGetTo: false,
                        status: 'pending',
                    };
                });

                // Technical questions assessments
                selectedQuestions.forEach(q => {
                    assessments[q.id] = {
                        questionId: q.id,
                        keywordsHit: [],
                        keywordsMissed: [...q.keywords], // All keywords start as missed
                        softSkills: { ...DEFAULT_SOFT_SKILLS },
                        interviewerNotes: '',
                        didNotGetTo: false,
                        status: 'pending',
                    };
                });

                set({
                    session: {
                        id: generateSessionId(),
                        candidateName,
                        interviewerName,
                        date: new Date().toISOString(),
                        selectedWeeks,
                        questionCount,
                        starterQuestions,
                        questions: selectedQuestions,
                        assessments,
                        currentQuestionIndex: 0,
                        status: 'in-progress',
                    },
                });
            },

            resetSession: () => set({ session: null }),

            setCurrentQuestionIndex: (index) => {
                const { session } = get();
                if (session) {
                    set({ session: { ...session, currentQuestionIndex: index } });
                }
            },

            nextQuestion: () => {
                const { session, getAllQuestions } = get();
                if (session) {
                    const totalQuestions = getAllQuestions().length;
                    const newIndex = Math.min(session.currentQuestionIndex + 1, totalQuestions - 1);
                    set({ session: { ...session, currentQuestionIndex: newIndex } });
                }
            },

            previousQuestion: () => {
                const { session } = get();
                if (session) {
                    const newIndex = Math.max(session.currentQuestionIndex - 1, 0);
                    set({ session: { ...session, currentQuestionIndex: newIndex } });
                }
            },

            updateAssessment: (questionId, updates) => {
                const { session } = get();
                if (session && session.assessments[questionId]) {
                    set({
                        session: {
                            ...session,
                            assessments: {
                                ...session.assessments,
                                [questionId]: {
                                    ...session.assessments[questionId],
                                    ...updates,
                                },
                            },
                        },
                    });
                }
            },

            toggleKeyword: (questionId, keyword) => {
                const { session } = get();
                if (!session) return;

                const assessment = session.assessments[questionId];
                if (!assessment) return;

                const isHit = assessment.keywordsHit.includes(keyword);

                if (isHit) {
                    // Move from hit to missed
                    set({
                        session: {
                            ...session,
                            assessments: {
                                ...session.assessments,
                                [questionId]: {
                                    ...assessment,
                                    keywordsHit: assessment.keywordsHit.filter(k => k !== keyword),
                                    keywordsMissed: [...assessment.keywordsMissed, keyword],
                                },
                            },
                        },
                    });
                } else {
                    // Move from missed to hit
                    set({
                        session: {
                            ...session,
                            assessments: {
                                ...session.assessments,
                                [questionId]: {
                                    ...assessment,
                                    keywordsHit: [...assessment.keywordsHit, keyword],
                                    keywordsMissed: assessment.keywordsMissed.filter(k => k !== keyword),
                                },
                            },
                        },
                    });
                }
            },

            toggleSoftSkill: (questionId, skill) => {
                const { session } = get();
                if (!session) return;

                const assessment = session.assessments[questionId];
                if (!assessment) return;

                set({
                    session: {
                        ...session,
                        assessments: {
                            ...session.assessments,
                            [questionId]: {
                                ...assessment,
                                softSkills: {
                                    ...assessment.softSkills,
                                    [skill]: !assessment.softSkills[skill],
                                },
                            },
                        },
                    },
                });
            },

            setInterviewerNotes: (questionId, notes) => {
                const { updateAssessment } = get();
                updateAssessment(questionId, { interviewerNotes: notes });
            },

            markDidNotGetTo: (questionId, value) => {
                const { updateAssessment } = get();
                updateAssessment(questionId, { didNotGetTo: value });
            },

            setLLMResult: (questionId, score, feedback) => {
                const { updateAssessment } = get();
                updateAssessment(questionId, {
                    llmScore: score,
                    llmFeedback: feedback,
                    status: 'ready',
                });
            },

            validateScore: (questionId, score, feedback) => {
                const { updateAssessment } = get();
                updateAssessment(questionId, {
                    finalScore: score,
                    finalFeedback: feedback,
                    status: 'validated',
                });
            },

            completeQuestion: (questionId) => {
                const { updateAssessment } = get();
                updateAssessment(questionId, { status: 'processing' });
            },

            finishInterview: () => {
                const { session } = get();
                if (session) {
                    set({ session: { ...session, status: 'review' } });
                }
            },

            completeReview: () => {
                const { session } = get();
                if (session) {
                    set({ session: { ...session, status: 'completed' } });
                }
            },

            setOverallScores: (technicalScore, softSkillScore) => {
                const { session } = get();
                if (session) {
                    set({
                        session: {
                            ...session,
                            overallTechnicalScore: technicalScore,
                            overallSoftSkillScore: softSkillScore,
                        },
                    });
                }
            },

            setOverallFeedback: (technicalFeedback, softSkillFeedback) => {
                const { session } = get();
                if (session) {
                    set({
                        session: {
                            ...session,
                            technicalFeedback,
                            softSkillFeedback,
                        },
                    });
                }
            },

            getCurrentQuestion: () => {
                const { session, getAllQuestions } = get();
                if (!session) return null;
                const allQuestions = getAllQuestions();
                return allQuestions[session.currentQuestionIndex] || null;
            },

            getAssessment: (questionId) => {
                const { session } = get();
                return session?.assessments[questionId];
            },

            getAllQuestions: () => {
                const { session } = get();
                if (!session) return [];
                return [...session.starterQuestions, ...session.questions];
            },

            getProgress: () => {
                const { session, getAllQuestions } = get();
                if (!session) return { current: 0, total: 0 };
                return {
                    current: session.currentQuestionIndex + 1,
                    total: getAllQuestions().length,
                };
            },
        }),
        {
            name: 'interview-session-storage',
            partialize: (state) => ({
                session: state.session,
                repoConfig: state.repoConfig,
                setupPhase: state.setupPhase, // Optional: persist phase?
                // Don't persist large tech lists if not needed, but maybe useful
            }),
        }
    )
);
