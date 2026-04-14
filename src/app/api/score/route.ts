// API route for LLM-assisted interview scoring
// Uses OPENAI_API_KEY from environment variables (server-side only)

import { NextRequest, NextResponse } from 'next/server';
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StateGraph, START, END, Annotation } from "@langchain/langgraph";

// Enhanced prompt for TECHNICAL QUESTIONS - detailed feedback addressing missed keywords and soft skills
const TECHNICAL_SCORING_PROMPT = ChatPromptTemplate.fromMessages([
    ['system', `You are an expert technical interviewer providing DETAILED, SPECIFIC feedback on candidate responses.

Your feedback MUST be 4-5 sentences and include:
1. Acknowledge what they did well (1 sentence)
2. Review the "Keywords MISSED" list. Cross-reference these with the INTERVIEWER NOTES. If the candidate actually covered the underlying concept of a "missed keyword" using their own words or different phrasing, YOU MUST OVERRIDE AND TREAT IT AS A HIT. Only explain concepts that are genuinely missing or misunderstood (1-2 sentences). Do NOT blindly trust the "Keywords MISSED" list.
3. Address soft skills: praise positives, provide coaching for negatives (1 sentence)
4. Give ONE specific, actionable improvement tip (1 sentence)

SCORING GUIDELINES:
- Score 1: No answer, "I don't know", or completely wrong answer with no keywords
- Score 2: Attempted but missed most key concepts, vague or confused response
- Score 3: Basic understanding, hit some keywords, but major gaps in explanation
- Score 4: Solid answer but lacked focus or had a notable omission of a primary core concept.
- Score 5: Excellent! Demonstrates a solid grasp of the core concepts. ALWAYS DEFAULT to 5/5 if the candidate provides a fundamentally correct, coherent, and practically sound answer. Do NOT withhold a 5/5 just because they missed a nuance or secondary concept. Reward practical, real-world experience heavily.

NOTE: Do not be hyper-critical. Candidates have limited time to speak. A concise, accurate summary of the core concepts is sufficient for a 5/5. 
SEMANTIC FLEXIBILITY & PARAPHRASING: Do NOT dock points or withhold a 5/5 score if the candidate does not explicitly state every element from the core evaluation criteria or does not use exact terminology. If the candidate accurately conveys the underlying conceptual meaning or provides a valid real-world example proving competence, reward them with full credit (5/5). NEVER withhold a 5/5 for missing "reflective" elements like "lessons learned" or theoretical catchphrases (e.g., "disagree and commit") if their story demonstrates competence. The provided criteria are a guide, not a strict checklist.
PRIVACY & CONFIDENTIALITY AWARENESS: Candidates are often bound by Non-Disclosure Agreements (NDAs) or strict company privacy policies. Do NOT penalize candidates for omitting specific metrics, proprietary architectural details, company names, or granular evaluation criteria if they explain their general approach, outcomes, or the core trade-offs well. If they demonstrate clear analytical thinking without revealing proprietary details, reward them generously.

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
2. Explains ONLY genuinely missed core concepts. Critically evaluate the "Keywords MISSED" against the notes, and if the concept is semantically present, do NOT mention it as missed.
3. Comments on soft skills (both positive and areas to improve)
4. Gives one actionable improvement tip

SCORE: [1-5]
FEEDBACK: [your detailed feedback]`],
]);

// Public prompt for automated interviews - entirely transcript based
const PUBLIC_SCORING_PROMPT = ChatPromptTemplate.fromMessages([
    ['system', `You are an expert technical interviewer evaluating a candidate's response in an automated public interview.

You must provide DETAILED, SPECIFIC feedback (4-5 sentences) based ONLY on comparing their transcript to the expected model answer. Do NOT evaluate eye contact, confidence, or spoken clarity, as this is a text-based transcript analysis.

Your feedback MUST include:
1. What they got right (1-2 sentences)
2. What major technical concepts they missed or misunderstood (1-2 sentences). *CRITICAL: If they successfully covered the core concepts (even via paraphrasing), do NOT fabricate or nitpick misses just to fill this requirement. Instead, simply state that their coverage was thorough.*
3. One actionable improvement tip (1 sentence)

SCORING GUIDELINES:
- Score 1: No coherent answer, completely wrong, or completely off-topic.
- Score 2: Attempted but missed major core concepts from the expected answer.
- Score 3: Basic understanding, but missing significant key details.
- Score 4: Solid answer but lacked focus or had a notable factual omission of a primary core concept.
- Score 5: Excellent! Demonstrates clear, accurate understanding of the core concepts. ALWAYS DEFAULT to a 5/5 if the candidate provides a fundamentally correct, coherent, and practically sound answer. Do NOT withhold a 5/5 just because they missed a nuance or secondary concept from the model answer. Reward practical, real-world experience heavily.

NOTE: Do not be hyper-critical. Candidates have a limited word count (1000 chars) to express complex thoughts. A concise, accurate digest of the core concepts is sufficient for a 5/5. Do not demand an exhaustive textbook response.

SEMANTIC FLEXIBILITY & PARAPHRASING: Do NOT dock points or withhold a 5/5 score if the candidate does not explicitly state every element from the model answer or does not use exact terminology. If the candidate accurately conveys the underlying conceptual meaning or provides a strong real-world example, reward them with full credit (5/5). NEVER withhold a 5/5 for missing "reflective" elements like "lessons learned" or theoretical catchphrases (e.g., "disagree and commit") if their story demonstrates competence. The model answer is a guide, not a strict text-matching rubric.

PRIVACY & CONFIDENTIALITY AWARENESS: Candidates are often bound by Non-Disclosure Agreements (NDAs). Do NOT penalize candidates for omitting specific metrics, proprietary details, or granular criteria if they explain their general approach or outcomes. Reward analytical thinking and structured communication even if specific proprietary project details are withheld.`],
    ['human', `Evaluate this PUBLIC automated interview response from candidate '{candidateName}':

QUESTION: {question}

MODEL EXPECTATION:
{modelAnswerSection}

{transcript}

Provide DETAILED feedback (4-5 sentences) and a score from 1-5 evaluating only their technical accuracy.

SCORE: [1-5]
FEEDBACK: [your detailed feedback]`],
]);

// Separate prompt for STARTER QUESTIONS - evaluates against guidelines, not keywords
const STARTER_SCORING_PROMPT = ChatPromptTemplate.fromMessages([
    ['system', `You are evaluating a candidate's response to an introductory/behavioral interview question.

These questions ("tell me about yourself", "describe a project") don't have technical keywords.
Instead, evaluate based on the GUIDELINES provided and soft skills demonstrated.

SCORING CRITERIA:
- Score 5 (Excellent): Hit the main intent of the question, clear communication, solid professional example. ALWAYS DEFAULT to 5/5 if the answer is fundamentally sound and professional. Do NOT withhold a 5/5 for missing nuanced reflections (like "lessons learned") or explicit textbook catchphrases.
- Score 4 (Good): Clear communication but lacked focus or had a notable omission.
- Score 3 (Average): Hit some guidelines, adequate but could be more detailed/engaging
- Score 2: (Below Average): Missed key guidelines, unclear, too brief, or unfocused
- Score 1: (Poor): Minimal effort, didn't address the question, no structure

NOTE ON PRIVACY/CONFIDENTIALITY (CRITICAL):
Candidates are often bound by Non-Disclosure Agreements (NDAs) or strict company privacy policies. Do NOT penalize a candidate for omitting specific metrics, proprietary architectures, company names, or granular project details if they explain their high-level decisions, general approach, and outcomes well. Do not demand exhaustive detail or overly specific criteria if it sounds like they are describing a real corporate project. Give strong scores (4 or 5) for candidates who demonstrate analytical thinking and clear communication even if they must withhold specific proprietary details. Do not be overly harsh or default to a 3 just because details are sparse due to confidentiality.

SEMANTIC FLEXIBILITY & PARAPHRASING:
Do NOT dock points or withhold a 5/5 score if the candidate does not explicitly hit every single detail of the Expected Guidelines. If they convey the core conceptual meaning using their own phrasing or provide a strong real-world example, give them full credit (5/5). NEVER withhold a 5/5 for missing "reflective" elements like "lessons learned" or theoretical catchphrases (e.g., "disagree and commit") if the story itself demonstrates professional competence. Avoid treating the guidelines as a rigid, exact-match checklist where missing a minor detail drops their score.

Your feedback should be 4-5 sentences:
1. What they did well
2. Which guidelines they missed and how to address them. *CRITICAL: If they implicitly addressed the guidelines, do NOT penalize them or fabricate a miss. Only mention guidelines if genuinely completely missing.*
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
    isPublic?: boolean;
    candidateName?: string;
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

        // LANGGRAPH WORKFLOW SETUP
        const ScoringState = Annotation.Root({
            isPublic: Annotation<boolean>(),
            isStarter: Annotation<boolean>(),
            question: Annotation<any>(),
            assessment: Annotation<any>(),
            candidateName: Annotation<string>(),
            responseContent: Annotation<string>()
        });

        const routeEvaluation = (state: typeof ScoringState.State) => {
            if (state.isPublic) return "evaluatePublic";
            if (state.isStarter && state.question.guidelines) return "evaluateStarter";
            return "evaluateTechnical";
        };

        const evaluatePublic = async (state: typeof ScoringState.State) => {
            const input = {
                candidateName: state.candidateName,
                question: state.question.question,
                modelAnswerSection: state.question.modelAnswer || 'No model answer provided.',
                transcript: state.assessment.interviewerNotes || 'No transcript available.'
            };
            const response = await PUBLIC_SCORING_PROMPT.pipe(model).invoke(input, {
                tags: ["score-agent", "public-question"],
                metadata: {
                    type: 'public_technical',
                    candidate_name: state.candidateName,
                    question_length: state.question.question.length
                }
            });
            return { responseContent: typeof response.content === 'string' ? response.content : JSON.stringify(response.content) };
        };

        const evaluateStarter = async (state: typeof ScoringState.State) => {
            const input = {
                questionType: state.question.type === 'about-yourself' ? 'About Yourself / Background' : 'Project Experience',
                question: state.question.question,
                guidelines: state.question.guidelines.map((g: string, i: number) => `${i + 1}. ${g}`).join('\n'),
                clearlySpoken: state.assessment.softSkills.clearlySpoken ? 'Yes' : 'No',
                eyeContact: state.assessment.softSkills.eyeContact ? 'Yes' : 'No',
                confidence: state.assessment.softSkills.confidence ? 'Yes' : 'No',
                structuredThinking: state.assessment.softSkills.structuredThinking ? 'Yes' : 'No',
                notes: state.assessment.interviewerNotes || 'No additional notes',
            };
            const response = await STARTER_SCORING_PROMPT.pipe(model).invoke(input, {
                tags: ["score-agent", "starter-question"],
                metadata: {
                    type: state.question.type,
                    question_length: state.question.question.length
                }
            });
            return { responseContent: typeof response.content === 'string' ? response.content : JSON.stringify(response.content) };
        };

        const evaluateTechnical = async (state: typeof ScoringState.State) => {
            const keywordsHit = state.assessment.keywordsHit.length;
            const totalKeywords = keywordsHit + state.assessment.keywordsMissed.length;
            const input = {
                question: state.question.question,
                modelAnswerSection: state.question.modelAnswer
                    ? `MODEL ANSWER (for reference):\n${state.question.modelAnswer.slice(0, 800)}`
                    : '',
                keywordsHit: keywordsHit,
                totalKeywords: totalKeywords,
                keywordsList: state.assessment.keywordsHit.length > 0 ? state.assessment.keywordsHit.join(', ') : 'None',
                keywordsMissed: state.assessment.keywordsMissed.length > 0 ? state.assessment.keywordsMissed.join(', ') : 'None',
                clearlySpoken: state.assessment.softSkills.clearlySpoken ? 'Yes' : 'No',
                eyeContact: state.assessment.softSkills.eyeContact ? 'Yes' : 'No',
                confidence: state.assessment.softSkills.confidence ? 'Yes' : 'No',
                structuredThinking: state.assessment.softSkills.structuredThinking ? 'Yes' : 'No',
                notes: state.assessment.interviewerNotes || 'No additional notes',
            };
            const response = await TECHNICAL_SCORING_PROMPT.pipe(model).invoke(input, {
                tags: ["score-agent", "technical-question"],
                metadata: {
                    type: 'technical',
                    question_length: state.question.question.length,
                    model_answer_provided: !!state.question.modelAnswer
                }
            });
            return { responseContent: typeof response.content === 'string' ? response.content : JSON.stringify(response.content) };
        };

        const workflow = new StateGraph(ScoringState)
            .addNode("evaluatePublic", evaluatePublic)
            .addNode("evaluateStarter", evaluateStarter)
            .addNode("evaluateTechnical", evaluateTechnical)
            .addConditionalEdges(START, routeEvaluation)
            .addEdge("evaluatePublic", END)
            .addEdge("evaluateStarter", END)
            .addEdge("evaluateTechnical", END)
            .compile();

        const finalState = await workflow.invoke({
            isPublic: !!body.isPublic,
            isStarter: isStarterQuestion,
            question: question,
            assessment: assessment,
            candidateName: body.candidateName || 'Candidate',
            responseContent: ''
        }, {
            runName: "Scoring_Agent",
            tags: ["score-workflow"]
        });

        const content = finalState.responseContent;

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
