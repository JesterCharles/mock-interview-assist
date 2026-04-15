import { prisma } from '@/lib/prisma';
import { Prisma } from '@/generated/prisma';
import { InterviewSession } from '@/lib/types';
import { validateSlug } from '@/lib/slug-validation';

type SessionMode = 'trainer-led' | 'automated';

/**
 * Persist an InterviewSession to Supabase.
 * If the session includes an associateSlug, upserts the Associate record
 * and links the session via associateId.
 * Returns true on success, false on failure (caller decides how to handle).
 *
 * `mode` defaults to "trainer-led" (matches schema default) so existing
 * trainer-led callers don't need to pass it. The associate authenticated
 * automated entry passes 'automated' so reporting and the readiness sweep
 * can distinguish (Codex finding P2).
 */
export async function persistSessionToDb(
  session: InterviewSession,
  options: { mode?: SessionMode } = {}
): Promise<boolean> {
  const mode: SessionMode = options.mode ?? 'trainer-led';
  try {
    let associateId: number | null = null;

    // Phase 3: Associate upsert if slug provided
    if (session.associateSlug) {
      const validation = validateSlug(session.associateSlug);
      if (validation.success) {
        try {
          const associate = await prisma.associate.upsert({
            where: { slug: validation.slug },
            update: session.candidateName
              ? { displayName: session.candidateName }
              : {},
            create: {
              slug: validation.slug,
              displayName: session.candidateName ?? null,
            },
          });
          associateId = associate.id;
        } catch (associateErr) {
          console.error('[session-persistence] Associate upsert failed:', associateErr);
          // Do not fail the session write — continue without associate linkage
        }
      } else {
        console.warn('[session-persistence] Invalid associate slug, skipping upsert:', validation.error);
      }
    }

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
        techMap: session.techMap ? (session.techMap as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
        associateId,
        mode,
      },
      update: {
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
        techMap: session.techMap ? (session.techMap as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
        ...(associateId !== null ? { associateId } : {}),
        mode,
      },
    });
    return true;
  } catch (error) {
    console.error('[session-persistence] DB write failed:', error);
    return false;
  }
}
