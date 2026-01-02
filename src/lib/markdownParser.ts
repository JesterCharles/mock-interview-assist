// Markdown parser for interview questions

import { ParsedQuestion } from './types';

/**
 * Parses interview questions markdown file content
 * Extracts question text, keywords, and model answers
 */
export function parseInterviewQuestions(
    content: string,
    weekNumber: number
): ParsedQuestion[] {
    const questions: ParsedQuestion[] = [];

    // Normalize line endings to \n (Windows uses \r\n)
    const normalizedContent = content.replace(/\r\n/g, '\n');

    // Split by question headers (### Q#:)
    const questionBlocks = normalizedContent.split(/(?=###\s+Q\d+:)/);

    let currentDifficulty: 'beginner' | 'intermediate' | 'advanced' = 'beginner';

    for (const block of questionBlocks) {
        // Check for difficulty section headers
        if (block.includes('## Beginner') || block.includes('Foundational')) {
            currentDifficulty = 'beginner';
        } else if (block.includes('## Intermediate') || block.includes('Application')) {
            currentDifficulty = 'intermediate';
        } else if (block.includes('## Advanced') || block.includes('Deep Dive')) {
            currentDifficulty = 'advanced';
        }

        // Match question header
        const questionMatch = block.match(/###\s+Q(\d+):\s*(.+?)(?=\n|$)/);
        if (!questionMatch) continue;

        const questionNumber = parseInt(questionMatch[1], 10);
        const questionText = questionMatch[2].trim();

        // Extract keywords
        const keywordsMatch = block.match(/\*\*Keywords:\*\*\s*(.+?)(?=\n|$)/);
        const keywords = keywordsMatch
            ? keywordsMatch[1].split(',').map(k => k.trim())
            : [];

        // Extract model answer from details block
        const detailsMatch = block.match(/<details>[\s\S]*?<summary>[\s\S]*?<\/summary>([\s\S]*?)<\/details>/);
        const modelAnswer = detailsMatch
            ? cleanModelAnswer(detailsMatch[1])
            : '';

        questions.push({
            id: `week${weekNumber}-q${questionNumber}`,
            questionNumber,
            question: questionText,
            keywords,
            modelAnswer,
            difficulty: currentDifficulty,
            weekNumber,
        });
    }

    return questions;
}

/**
 * Clean up model answer text
 */
function cleanModelAnswer(raw: string): string {
    return raw
        .trim()
        .replace(/```[\s\S]*?```/g, '[Code Example]') // Simplify code blocks for display
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n'); // Normalize line breaks
}

/**
 * Randomly shuffle an array using Fisher-Yates algorithm
 */
export function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Select random questions from parsed questions
 * Stratifies by WEEK first, then by difficulty within each week
 * This ensures dispersed sampling across all selected weeks
 */
export function selectRandomQuestions(
    questions: ParsedQuestion[],
    count: number,
    interviewLevel: 'entry' | 'experienced' = 'entry' // Default to entry
): ParsedQuestion[] {
    // Group questions by week (or source)
    const byWeek = new Map<number, ParsedQuestion[]>();
    questions.forEach(q => {
        // Fallback to week 0 or 99 if undefined
        const weekNum = q.weekNumber || 99;
        if (!byWeek.has(weekNum)) {
            byWeek.set(weekNum, []);
        }
        byWeek.get(weekNum)!.push(q);
    });

    const weeks = Array.from(byWeek.keys()).sort();
    const numWeeks = weeks.length;

    if (numWeeks === 0) return [];

    // Determine how many questions per week (as evenly as possible)
    const perWeek = Math.floor(count / numWeeks);
    const remainder = count % numWeeks;

    const selected: ParsedQuestion[] = [];

    // Difficulty Weights
    let beginnerRatio = 0.5;
    let intermediateRatio = 0.4;
    let advancedRatio = 0.1;

    if (interviewLevel === 'experienced') {
        beginnerRatio = 0.1;
        intermediateRatio = 0.4;
        advancedRatio = 0.5;
    }

    weeks.forEach((week, index) => {
        const weekQuestions = byWeek.get(week)!;
        // Give extra question to first 'remainder' weeks for even distribution
        const weekCount = perWeek + (index < remainder ? 1 : 0);

        // Within each week, stratify by difficulty
        const beginnerQuestions = weekQuestions.filter(q => q.difficulty === 'beginner');
        const intermediateQuestions = weekQuestions.filter(q => q.difficulty === 'intermediate');
        const advancedQuestions = weekQuestions.filter(q => q.difficulty === 'advanced');

        // Calculate counts based on difficulty distribution
        const advancedCount = Math.min(
            advancedQuestions.length,
            Math.max(0, Math.round(weekCount * advancedRatio))
        );
        const intermediateCount = Math.min(
            intermediateQuestions.length,
            Math.max(0, Math.round(weekCount * intermediateRatio))
        );
        // Fill remainder with beginner (or others if beginner runs out)
        const beginnerCount = Math.max(0, weekCount - intermediateCount - advancedCount);

        // Select from each difficulty
        const weekSelected: ParsedQuestion[] = [];

        /* 
          Logic: Try to fulfill the calculated counts. 
          If a category runs out, the `remaining` block below handles filling the gap 
          from the entire week's pool (regardless of difficulty).
        */

        weekSelected.push(...shuffleArray(beginnerQuestions).slice(0, Math.min(beginnerQuestions.length, beginnerCount)));
        weekSelected.push(...shuffleArray(intermediateQuestions).slice(0, Math.min(intermediateQuestions.length, intermediateCount)));
        weekSelected.push(...shuffleArray(advancedQuestions).slice(0, Math.min(advancedQuestions.length, advancedCount)));

        // If we haven't reached weekCount (due to limited questions in a category or rounding), fill from remaining
        if (weekSelected.length < weekCount) {
            const alreadySelectedIds = new Set(weekSelected.map(q => q.id));
            const remaining = shuffleArray(weekQuestions.filter(q => !alreadySelectedIds.has(q.id)));
            weekSelected.push(...remaining.slice(0, weekCount - weekSelected.length));
        }

        selected.push(...weekSelected);
    });

    // If we still need more questions (rare case), fill from the full pool
    if (selected.length < count) {
        const alreadySelectedIds = new Set(selected.map(q => q.id));
        const remaining = shuffleArray(questions.filter(q => !alreadySelectedIds.has(q.id)));
        selected.push(...remaining.slice(0, count - selected.length));
    }

    // Shuffle the final selection so weeks are interleaved
    return shuffleArray(selected);
}

/**
 * Get difficulty badge color
 */
export function getDifficultyColor(difficulty: 'beginner' | 'intermediate' | 'advanced'): string {
    switch (difficulty) {
        case 'beginner':
            return 'bg-green-100 text-green-800';
        case 'intermediate':
            return 'bg-yellow-100 text-yellow-800';
        case 'advanced':
            return 'bg-red-100 text-red-800';
    }
}
