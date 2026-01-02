// LangChain v1.0 integration for interview scoring

import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { QuestionAssessment, ParsedQuestion, StarterQuestion } from './types';

// Score generation prompt template
const SCORING_PROMPT = ChatPromptTemplate.fromMessages([
    ['system', `You are an expert technical interviewer providing feedback on candidate responses.
Your feedback should be professional, constructive, and concise (2-3 sentences max).
Focus on: technical accuracy, communication quality, and actionable improvement areas.
Be direct but encouraging.`],
    ['human', `Evaluate this interview response:

QUESTION: {question}
{modelAnswerSection}
KEYWORDS HIT: {keywordsHit} of {totalKeywords} ({keywordsList})
KEYWORDS MISSED: {keywordsMissed}
SOFT SKILLS:
- Clearly Spoken: {clearlySpoken}
- Eye Contact: {eyeContact}
- Confidence: {confidence}
- Structured Thinking: {structuredThinking}

INTERVIEWER NOTES: {notes}

Provide:
1. SCORE: A number from 1-5 (1=Poor, 2=Below Average, 3=Average, 4=Good, 5=Excellent)
2. FEEDBACK: Professional, concise feedback (2-3 sentences)

Format your response exactly as:
SCORE: [number]
FEEDBACK: [your feedback]`],
]);

interface ScoreResult {
    score: number;
    feedback: string;
}

/**
 * Generate LLM-assisted score and feedback for a question assessment
 */
export async function generateScore(
    question: ParsedQuestion | StarterQuestion,
    assessment: QuestionAssessment,
    apiKey: string
): Promise<ScoreResult> {
    // Defensive check: validate API key before attempting to use it
    if (!apiKey || apiKey.trim().length === 0 || !apiKey.startsWith('sk-')) {
        console.warn('generateScore called without valid API key');
        return {
            score: 3,
            feedback: 'AI scoring not available - no valid API key provided. Please review manually.',
        };
    }

    const model = new ChatOpenAI({
        modelName: 'gpt-4o-mini', // Cost-effective, good for scoring
        temperature: 0.3, // More consistent outputs
        openAIApiKey: apiKey,
    });

    const isParsedQuestion = 'modelAnswer' in question;

    const keywordsHit = assessment.keywordsHit.length;
    const totalKeywords = keywordsHit + assessment.keywordsMissed.length;

    const input = {
        question: isParsedQuestion ? question.question : question.question,
        modelAnswerSection: isParsedQuestion
            ? `MODEL ANSWER: ${question.modelAnswer.slice(0, 500)}...`
            : '',
        keywordsHit: keywordsHit,
        totalKeywords: totalKeywords,
        keywordsList: assessment.keywordsHit.join(', ') || 'None',
        keywordsMissed: assessment.keywordsMissed.join(', ') || 'None',
        clearlySpoken: assessment.softSkills.clearlySpoken ? 'Yes' : 'No',
        eyeContact: assessment.softSkills.eyeContact ? 'Yes' : 'No',
        confidence: assessment.softSkills.confidence ? 'Yes' : 'No',
        structuredThinking: assessment.softSkills.structuredThinking ? 'Yes' : 'No',
        notes: assessment.interviewerNotes || 'No additional notes',
    };

    const chain = SCORING_PROMPT.pipe(model);
    const response = await chain.invoke(input);

    // Parse the response
    const content = typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content);

    const scoreMatch = content.match(/SCORE:\s*(\d)/);
    const feedbackMatch = content.match(/FEEDBACK:\s*(.+)/s);

    const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 3;
    const feedback = feedbackMatch ? feedbackMatch[1].trim() : 'Unable to generate feedback.';

    return {
        score: Math.min(5, Math.max(1, score)),
        feedback,
    };
}

/**
 * Queue-based processing for background scoring
 */
export class ScoringQueue {
    private queue: Array<{
        questionId: string;
        question: ParsedQuestion | StarterQuestion;
        assessment: QuestionAssessment;
        resolve: (result: ScoreResult) => void;
        reject: (error: Error) => void;
    }> = [];

    private processing = false;
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    /**
     * Add a question to the scoring queue
     */
    async enqueue(
        questionId: string,
        question: ParsedQuestion | StarterQuestion,
        assessment: QuestionAssessment
    ): Promise<ScoreResult> {
        return new Promise((resolve, reject) => {
            this.queue.push({ questionId, question, assessment, resolve, reject });
            this.processQueue();
        });
    }

    /**
     * Process the queue sequentially
     */
    private async processQueue(): Promise<void> {
        if (this.processing || this.queue.length === 0) return;

        this.processing = true;

        while (this.queue.length > 0) {
            const item = this.queue.shift()!;

            try {
                const result = await generateScore(item.question, item.assessment, this.apiKey);
                item.resolve(result);
            } catch (error) {
                item.reject(error instanceof Error ? error : new Error('Scoring failed'));
            }

            // Small delay between requests to avoid rate limiting
            await new Promise(r => setTimeout(r, 200));
        }

        this.processing = false;
    }
}

/**
 * Calculate aggregate scores from all assessments
 */
export function calculateAggregateScores(
    assessments: Record<string, QuestionAssessment>
): {
    averageScore: number;
    technicalScore: number;
    softSkillScore: number;
    completedCount: number;
    skippedCount: number;
} {
    // Only count assessments that have been completed (have a score) and weren't skipped
    const validAssessments = Object.values(assessments).filter(a =>
        !a.didNotGetTo &&
        (a.finalScore !== undefined || a.llmScore !== undefined) &&
        (a.status === 'validated' || a.status === 'ready')
    );

    const skippedCount = Object.values(assessments).filter(a => a.didNotGetTo).length;

    if (validAssessments.length === 0) {
        return {
            averageScore: 0,
            technicalScore: 0,
            softSkillScore: 0,
            completedCount: 0,
            skippedCount,
        };
    }

    // Use finalScore if available, otherwise fall back to llmScore
    const averageScore = validAssessments.reduce((sum, a) => sum + (a.finalScore ?? a.llmScore ?? 0), 0) / validAssessments.length;

    // Calculate soft skills score (percentage of positive indicators)
    const softSkillsTotal = validAssessments.reduce((sum, a) => {
        const skills = a.softSkills;
        const positiveCount = [
            skills.clearlySpoken,
            skills.eyeContact,
            skills.confidence,
            skills.structuredThinking,
        ].filter(Boolean).length;
        return sum + positiveCount;
    }, 0);

    const softSkillScore = (softSkillsTotal / (validAssessments.length * 4)) * 5;

    // Technical score based on keyword coverage (only for questions WITH keywords)
    const technicalAssessments = validAssessments.filter(a =>
        (a.keywordsHit.length + a.keywordsMissed.length) > 0
    );

    let technicalScore = 0;
    if (technicalAssessments.length > 0) {
        const keywordCoverage = technicalAssessments.reduce((sum, a) => {
            const total = a.keywordsHit.length + a.keywordsMissed.length;
            return sum + (a.keywordsHit.length / total);
        }, 0) / technicalAssessments.length;
        technicalScore = keywordCoverage * 5;
    }

    return {
        averageScore: Math.round(averageScore * 10) / 10,
        technicalScore: Math.round(technicalScore * 10) / 10,
        softSkillScore: Math.round(softSkillScore * 10) / 10,
        completedCount: validAssessments.length,
        skippedCount,
    };
}
