// API route for LLM-assisted interview scoring
// Uses OPENAI_API_KEY from environment variables (server-side only)

import { NextRequest, NextResponse } from 'next/server';
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';

// Enhanced prompt for TECHNICAL QUESTIONS - detailed feedback addressing missed keywords and soft skills
const TECHNICAL_SCORING_PROMPT = ChatPromptTemplate.fromMessages([
    ['system', `You are an expert technical interviewer providing DETAILED, SPECIFIC feedback on candidate responses.

Your feedback MUST be 4-5 sentences and include:
1. Acknowledge what they did well (1 sentence)
2. For EACH missed keyword: explain what it is and why it matters in this context (1-2 sentences)
3. Address soft skills: praise positives, provide coaching for negatives (1 sentence)
4. Give ONE specific, actionable improvement tip (1 sentence)

SCORING GUIDELINES:
- Score 1: No answer, "I don't know", or completely wrong answer with no keywords
- Score 2: Attempted but missed most key concepts, vague or confused response
- Score 3: Basic understanding, hit some keywords, but gaps in explanation
- Score 4: Good answer, hit most keywords, clear communication
- Score 5: Excellent, comprehensive, hit all/most keywords with confident delivery

Example good feedback:
"Strong explanation of the core concept, demonstrating solid foundational knowledge. However, you missed mentioning 'gradient descent' - this is the optimization algorithm that adjusts model weights during training, essential for explaining how learning happens. You also didn't cover 'backpropagation' which describes how errors flow backward through the network to update weights. Your structured thinking was excellent, though maintaining more eye contact would improve engagement. For future interviews, try practicing the 'what, why, how' framework: explain what the concept is, why it matters, and how it works in practice."`],
    ['human', `Evaluate this TECHNICAL interview response:

QUESTION: {question}
{modelAnswerSection}

KEYWORD ANALYSIS:
- Keywords HIT ({keywordsHit} of {totalKeywords}): {keywordsList}
- Keywords MISSED: {keywordsMissed}

SOFT SKILLS OBSERVED:
- Clearly Spoken: {clearlySpoken}
- Eye Contact: {eyeContact}
- Confidence: {confidence}
- Structured Thinking: {structuredThinking}

INTERVIEWER NOTES: {notes}

Provide DETAILED feedback (4-5 sentences) that:
1. Acknowledges strengths
2. Explains EACH missed keyword and why it matters
3. Comments on soft skills (both positive and areas to improve)
4. Gives one actionable improvement tip

SCORE: [1-5]
FEEDBACK: [your detailed feedback]`],
]);

// Separate prompt for STARTER QUESTIONS - evaluates against guidelines, not keywords
const STARTER_SCORING_PROMPT = ChatPromptTemplate.fromMessages([
    ['system', `You are evaluating a candidate's response to an introductory/behavioral interview question.

These questions ("tell me about yourself", "describe a project") don't have technical keywords.
Instead, evaluate based on the GUIDELINES provided and soft skills demonstrated.

SCORING CRITERIA:
- Score 5 (Excellent): Hit all guidelines, confident, engaging, well-structured, memorable
- Score 4 (Good): Hit most guidelines, clear communication, good flow, professional
- Score 3 (Average): Hit some guidelines, adequate but could be more detailed/engaging
- Score 2 (Below Average): Missed key guidelines, unclear, too brief, or unfocused
- Score 1 (Poor): Minimal effort, didn't address the question, no structure

Your feedback should be 4-5 sentences:
1. What they did well
2. Which guidelines they missed and how to address them
3. Soft skills observations
4. One specific tip for improvement

Example good feedback:
"Good overview of your technical background with clear progression from junior to senior roles. However, you missed discussing your career goals and what drives your passion for technology - interviewers want to see where you're headed and what motivates you. Your delivery was confident with good eye contact, though adding more structure (e.g., 'past, present, future' format) would help. Consider preparing a 90-second version that ends with why you're excited about this specific opportunity."`],
    ['human', `Evaluate this STARTER/BEHAVIORAL interview response:

QUESTION TYPE: {questionType}
QUESTION: {question}

EXPECTED GUIDELINES:
{guidelines}

SOFT SKILLS OBSERVED:
- Clearly Spoken: {clearlySpoken}
- Eye Contact: {eyeContact}
- Confidence: {confidence}
- Structured Thinking: {structuredThinking}

INTERVIEWER NOTES: {notes}

Evaluate how well they addressed each guideline and their overall presentation.

SCORE: [1-5]
FEEDBACK: [your detailed feedback]`],
]);

interface ScoreRequestBody {
    question: {
        question: string;
        modelAnswer?: string;
        type?: 'about-yourself' | 'project-work';  // For starter questions
        guidelines?: string[];  // For starter questions
    };
    assessment: {
        keywordsHit: string[];
        keywordsMissed: string[];
        softSkills: {
            clearlySpoken: boolean;
            eyeContact: boolean;
            confidence: boolean;
            structuredThinking: boolean;
        };
        interviewerNotes: string;
    };
}

export async function POST(request: NextRequest) {
    try {
        // Get API key from environment variable
        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey || !apiKey.startsWith('sk-')) {
            return NextResponse.json({
                score: 3,
                feedback: 'AI scoring not available - OPENAI_API_KEY environment variable not configured. Please review manually.',
            });
        }

        const body: ScoreRequestBody = await request.json();
        const { question, assessment } = body;

        const model = new ChatOpenAI({
            modelName: 'gpt-4o-mini',
            temperature: 0.3,
            openAIApiKey: apiKey,
        });

        // Determine if this is a starter question or technical question
        const isStarterQuestion = question.type === 'about-yourself' || question.type === 'project-work';

        let response;

        if (isStarterQuestion && question.guidelines) {
            // Use starter question prompt
            const input = {
                questionType: question.type === 'about-yourself' ? 'About Yourself / Background' : 'Project Experience',
                question: question.question,
                guidelines: question.guidelines.map((g, i) => `${i + 1}. ${g}`).join('\n'),
                clearlySpoken: assessment.softSkills.clearlySpoken ? 'Yes' : 'No',
                eyeContact: assessment.softSkills.eyeContact ? 'Yes' : 'No',
                confidence: assessment.softSkills.confidence ? 'Yes' : 'No',
                structuredThinking: assessment.softSkills.structuredThinking ? 'Yes' : 'No',
                notes: assessment.interviewerNotes || 'No additional notes',
            };

            const chain = STARTER_SCORING_PROMPT.pipe(model);
            response = await chain.invoke(input);
        } else {
            // Use technical question prompt
            const keywordsHit = assessment.keywordsHit.length;
            const totalKeywords = keywordsHit + assessment.keywordsMissed.length;

            const input = {
                question: question.question,
                modelAnswerSection: question.modelAnswer
                    ? `MODEL ANSWER (for reference):\n${question.modelAnswer.slice(0, 800)}`
                    : '',
                keywordsHit: keywordsHit,
                totalKeywords: totalKeywords,
                keywordsList: assessment.keywordsHit.length > 0 ? assessment.keywordsHit.join(', ') : 'None',
                keywordsMissed: assessment.keywordsMissed.length > 0 ? assessment.keywordsMissed.join(', ') : 'None',
                clearlySpoken: assessment.softSkills.clearlySpoken ? 'Yes' : 'No',
                eyeContact: assessment.softSkills.eyeContact ? 'Yes' : 'No',
                confidence: assessment.softSkills.confidence ? 'Yes' : 'No',
                structuredThinking: assessment.softSkills.structuredThinking ? 'Yes' : 'No',
                notes: assessment.interviewerNotes || 'No additional notes',
            };

            const chain = TECHNICAL_SCORING_PROMPT.pipe(model);
            response = await chain.invoke(input);
        }

        // Parse the response - try multiple formats
        const content = typeof response.content === 'string'
            ? response.content
            : JSON.stringify(response.content);

        // Log for debugging
        console.log('LLM Response:', content.slice(0, 500));

        // Try to extract score with various patterns
        let score = 3;
        const scorePatterns = [
            /SCORE:\s*(\d)/i,
            /Score:\s*(\d)/i,
            /\*\*SCORE\*\*:\s*(\d)/i,
            /(\d)\s*\/\s*5/,
        ];

        for (const pattern of scorePatterns) {
            const match = content.match(pattern);
            if (match) {
                score = parseInt(match[1], 10);
                break;
            }
        }

        // Try to extract feedback with various patterns
        let feedback = '';
        const feedbackPatterns = [
            /FEEDBACK:\s*(.+)/is,
            /Feedback:\s*(.+)/is,
            /\*\*FEEDBACK\*\*:\s*(.+)/is,
        ];

        for (const pattern of feedbackPatterns) {
            const match = content.match(pattern);
            if (match) {
                feedback = match[1].trim();
                // Remove any trailing markdown or formatting
                feedback = feedback.replace(/\n+SCORE:.*/is, '').trim();
                break;
            }
        }

        // If no structured feedback found, use the whole response (minus score line)
        if (!feedback && content.length > 20) {
            feedback = content
                .replace(/SCORE:\s*\d/gi, '')
                .replace(/Score:\s*\d/gi, '')
                .replace(/^\s*[\d]\s*\/\s*5\s*/gm, '')
                .trim();

            // Limit length if too long
            if (feedback.length > 1000) {
                feedback = feedback.slice(0, 1000) + '...';
            }
        }

        if (!feedback) {
            feedback = 'Feedback could not be parsed from LLM response. Please review manually.';
            console.warn('Could not parse feedback from response:', content.slice(0, 200));
        }

        return NextResponse.json({
            score: Math.min(5, Math.max(1, score)),
            feedback,
        });
    } catch (error) {
        console.error('Scoring API error:', error);
        return NextResponse.json({
            score: 3,
            feedback: 'Scoring temporarily unavailable. Please click retry or review manually.',
            error: true,
        });
    }
}
