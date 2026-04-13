import { prisma } from '@/lib/prisma';
import { Prisma } from '@/generated/prisma';
import { InterviewSession } from '@/lib/types';

/**
 * Persist an InterviewSession to Supabase.
 * Returns true on success, false on failure (caller decides how to handle).
 */
export async function persistSessionToDb(session: InterviewSession): Promise<boolean> {
  try {
    await prisma.session.upsert({
      where: { id: session.id },
      create: {
        id: session.id,
        candidateName: session.candidateName ?? null,
        interviewerName: session.interviewerName ?? null,
        date: session.date,
        status: session.status,
        questionCount: session.questionCount,
        selectedWeeks: session.selectedWeeks as unknown as Prisma.InputJsonValue,
        overallTechnicalScore: session.overallTechnicalScore ?? null,
        overallSoftSkillScore: session.overallSoftSkillScore ?? null,
        technicalFeedback: session.technicalFeedback ?? null,
        softSkillFeedback: session.softSkillFeedback ?? null,
        questions: session.questions as unknown as Prisma.InputJsonValue,
        starterQuestions: session.starterQuestions as unknown as Prisma.InputJsonValue,
        assessments: session.assessments as unknown as Prisma.InputJsonValue,
      },
      update: {
        candidateName: session.candidateName ?? null,
        interviewerName: session.interviewerName ?? null,
        status: session.status,
        overallTechnicalScore: session.overallTechnicalScore ?? null,
        overallSoftSkillScore: session.overallSoftSkillScore ?? null,
        technicalFeedback: session.technicalFeedback ?? null,
        softSkillFeedback: session.softSkillFeedback ?? null,
        questions: session.questions as unknown as Prisma.InputJsonValue,
        starterQuestions: session.starterQuestions as unknown as Prisma.InputJsonValue,
        assessments: session.assessments as unknown as Prisma.InputJsonValue,
      },
    });
    return true;
  } catch (error) {
    console.error('[session-persistence] DB write failed:', error);
    return false;
  }
}
