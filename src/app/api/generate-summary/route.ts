// API route for generating overall interview feedback summary
import { NextRequest, NextResponse } from 'next/server';
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';

const SUMMARY_PROMPT = ChatPromptTemplate.fromMessages([
    ['system', `You are an expert technical interviewer creating a high-level summary of a candidate's performance.

Your goal is to synthesize detailed question-by-question data into two distinct, professional summaries.

INPUT DATA:
- List of questions asked
- Candidate's score (1-5) per question
- Detailed feedback given for each question
- List of keywords hit/missed
- Soft skills observations

OUTPUT FORMAT (JSON):
{{
  "technicalFeedback": "...",
  "softSkillFeedback": "..."
}}

GUIDELINES:

1. TECHNICAL FEEDBACK (3-4 paragraphs):
   - Do NOT list every missed keyword. Instead, identify THEMES.
   - Example directly from user request: "Technically they showed strength in [Broad Concept X] but struggled with [Architecture/Tech Y]."
   - Group missed concepts into "Areas for Review".
   - PROVIDE 2-3 SPECIFIC ACTION ITEMS. (e.g., "Review the difference between L1 and L2 regularization", "Read up on Vector DB indexing types").
   - Tone: Constructive, professional, coaching-oriented.

2. SOFT SKILLS FEEDBACK (2-3 paragraphs):
   - Create a NARRATIVE, not a list.
   - Synthesize the observations across all questions. 
   - Example: "Showed strength in [X] & [Y] but lacked [Z]."
   - If they were consistently clear, say that. If they faltered on harder questions, note that pattern.
   - Mention confidence, structure, and clarity specifically.

Ensure the output is valid JSON.`],
    ['human', `Generate an interview summary for this session:

{sessionData}
`]
]);

export async function POST(request: NextRequest) {
    try {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey || !apiKey.startsWith('sk-')) {
            return NextResponse.json({
                error: 'OpenAI API Key not configured'
            }, { status: 500 });
        }

        const body = await request.json();
        const { assessments, questions } = body;

        // format data for the prompt to save tokens but keep context
        const sessionSummary = questions.map((q: any, i: number) => {
            const assessment = assessments[q.id];
            if (!assessment || assessment.didNotGetTo) return null;

            return `
Q${i + 1} (${q.type || 'Technical'}): ${q.question.substring(0, 100)}...
Score: ${assessment.llmScore || assessment.finalScore}/5
Keywords Hit: ${assessment.keywordsHit?.join(', ') || 'N/A'}
Keywords Missed: ${assessment.keywordsMissed?.join(', ') || 'N/A'}
Soft Skills: clearlySpoken=${assessment.softSkills?.clearlySpoken}, structured=${assessment.softSkills?.structuredThinking}
Specific Feedback: ${assessment.llmFeedback || assessment.finalFeedback}
`;
        }).filter(Boolean).join('\n---\n');

        const model = new ChatOpenAI({
            modelName: 'gpt-4o-mini',
            temperature: 0.4, // Slightly creative for narrative, but grounded
            openAIApiKey: apiKey,
        });

        const chain = SUMMARY_PROMPT.pipe(model);
        const response = await chain.invoke({
            sessionData: sessionSummary
        });

        // Parse JSON output
        let content = response.content as string;
        // Clean markdown code blocks if present
        content = content.replace(/```json\n?|\n?```/g, '').trim();

        const result = JSON.parse(content);

        return NextResponse.json(result);

    } catch (error) {
        console.error('Summary generation failed:', error);
        return NextResponse.json({
            error: 'Failed to generate summary',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
