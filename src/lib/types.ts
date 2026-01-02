// TypeScript types for the Interview Assessment app

export interface ParsedQuestion {
    id: string;
    questionNumber: number;
    question: string;
    keywords: string[];
    modelAnswer: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    weekNumber: number;
}

export interface StarterQuestion {
    id: string;
    question: string;
    type: 'about-yourself' | 'project-work';
    guidelines: string[];
}

export interface QuestionAssessment {
    questionId: string;
    keywordsHit: string[];
    keywordsMissed: string[];
    softSkills: SoftSkillsAssessment;
    interviewerNotes: string;
    didNotGetTo: boolean;
    llmScore?: number;
    llmFeedback?: string;
    finalScore?: number;
    finalFeedback?: string;
    status: 'pending' | 'in-progress' | 'processing' | 'ready' | 'validated';
}

export interface SoftSkillsAssessment {
    clearlySpoken: boolean;
    eyeContact: boolean;
    confidence: boolean;
    structuredThinking: boolean;
}

export interface InterviewSession {
    id: string;
    candidateName?: string;
    interviewerName?: string;
    date: string;
    selectedWeeks: number[];
    questionCount: number;
    starterQuestions: StarterQuestion[];
    questions: ParsedQuestion[];
    assessments: Record<string, QuestionAssessment>;
    currentQuestionIndex: number;
    status: 'setup' | 'in-progress' | 'review' | 'completed';
    // Editable overall scores and feedback
    overallTechnicalScore?: number;
    overallSoftSkillScore?: number;
    technicalFeedback?: string;
    softSkillFeedback?: string;
}

export interface ScoreSummary {
    totalQuestions: number;
    completedQuestions: number;
    skippedQuestions: number;
    averageScore: number;
    technicalScore: number;
    softSkillScore: number;
}

export const DEFAULT_SOFT_SKILLS: SoftSkillsAssessment = {
    clearlySpoken: false,
    eyeContact: false,
    confidence: false,
    structuredThinking: false,
};

// Starter question variations - randomly selected for each session
export const STARTER_QUESTION_CONFIG = {
    'about-yourself': {
        variations: [
            'Tell me about yourself and your background in technology.',
            'What\'s your backstory? How did you get into tech?',
            'Give me a brief overview of your professional background.',
            'Walk me through your career journey so far.',
            'Tell me a bit about yourself - who are you professionally?',
        ],
        guidelines: [
            'Clear and concise introduction',
            'Relevant technical background',
            'Career trajectory and goals',
            'Passion for the field',
        ],
    },
    'project-work': {
        variations: [
            'Tell me about a significant project you\'ve worked on.',
            'What\'s a recent project you\'re proud of?',
            'Describe a challenging project and your role in it.',
            'Walk me through a technical project from start to finish.',
            'What\'s a project that showcases your skills best?',
        ],
        guidelines: [
            'Project scope and objectives',
            'Your specific role and contributions',
            'Technologies used',
            'Challenges faced and solutions',
            'Results and learnings',
        ],
    },
};

/**
 * Generate starter questions with random variations
 */
export function generateStarterQuestions(): StarterQuestion[] {
    const aboutConfig = STARTER_QUESTION_CONFIG['about-yourself'];
    const projectConfig = STARTER_QUESTION_CONFIG['project-work'];

    // Pick random variation for each type
    const aboutVariation = aboutConfig.variations[
        Math.floor(Math.random() * aboutConfig.variations.length)
    ];
    const projectVariation = projectConfig.variations[
        Math.floor(Math.random() * projectConfig.variations.length)
    ];

    return [
        {
            id: 'starter-1',
            question: aboutVariation,
            type: 'about-yourself',
            guidelines: aboutConfig.guidelines,
        },
        {
            id: 'starter-2',
            question: projectVariation,
            type: 'project-work',
            guidelines: projectConfig.guidelines,
        },
    ];
}

// Fallback for backward compatibility
export const STARTER_QUESTIONS: StarterQuestion[] = generateStarterQuestions();
