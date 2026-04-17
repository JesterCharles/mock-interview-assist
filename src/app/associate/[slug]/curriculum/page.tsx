import { prisma } from '@/lib/prisma';
import { getCallerIdentity } from '@/lib/identity';
import { validateSlug } from '@/lib/slug-validation';
import { listWeeks } from '@/lib/curriculumService';
import { redirect, notFound } from 'next/navigation';
import { BookOpen } from 'lucide-react';
import { CurriculumBanner } from '@/components/associate/CurriculumBanner';
import { CurriculumSchedule } from '@/components/associate/CurriculumSchedule';

/**
 * Associate Curriculum Page (Phase 30 Plan 01).
 *
 * Server-rendered. Replaces Phase 27 placeholder with a read-only curriculum
 * schedule grid showing collapsible week rows, 5-color score dots, current-week
 * highlight, and empty state for associates not assigned to a cohort.
 *
 * Auth guard pattern matches dashboard/page.tsx:
 *   anonymous → /signin redirect
 *   wrong-slug associate → 403
 *   trainer/admin → allowed for any slug
 */

interface PageProps {
  params: Promise<{ slug: string }>;
}

type TimeState = 'past' | 'current' | 'future';

function renderForbidden() {
  return (
    <div
      data-testid="curriculum-forbidden"
      data-http-status="403"
      style={{
        maxWidth: '480px',
        margin: '0 auto',
        textAlign: 'center',
        padding: '48px 0',
      }}
    >
      <h1
        style={{
          fontFamily:
            "var(--font-clash-display), 'Clash Display', system-ui, sans-serif",
          fontSize: '28px',
          fontWeight: 600,
          margin: '0 0 8px 0',
          color: 'var(--ink)',
        }}
      >
        Access denied
      </h1>
      <p
        style={{
          fontSize: '14px',
          color: 'var(--muted)',
          margin: 0,
          fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
        }}
      >
        You are signed in as a different associate. Contact your trainer if you believe this is
        an error.
      </p>
    </div>
  );
}

export default async function CurriculumPage({ params }: PageProps) {
  const { slug } = await params;
  const slugValidation = validateSlug(slug);
  if (!slugValidation.success) {
    notFound();
  }

  const caller = await getCallerIdentity();

  if (caller.kind === 'anonymous') {
    redirect(
      '/signin?as=associate&next=' +
        encodeURIComponent('/associate/' + slugValidation.slug + '/curriculum'),
    );
  }

  // Fetch associate to get id + cohortId
  const associate = await prisma.associate.findUnique({
    where: { slug: slugValidation.slug },
    select: { id: true, cohortId: true },
  });

  if (!associate) {
    notFound();
  }

  // Auth guard: wrong associate → 403
  const isTrainerOrAdmin = caller.kind === 'trainer' || caller.kind === 'admin';
  if (!isTrainerOrAdmin && caller.kind === 'associate' && caller.associateId !== associate.id) {
    return renderForbidden();
  }

  // Empty state: associate not assigned to a cohort
  if (!associate.cohortId) {
    return (
      <div
        style={{
          maxWidth: 480,
          margin: '0 auto',
          textAlign: 'center',
          padding: '64px 24px',
        }}
      >
        <BookOpen
          size={48}
          color="var(--muted)"
          style={{ margin: '0 auto 16px', display: 'block', opacity: 0.5 }}
        />
        <h1
          style={{
            fontFamily:
              "var(--font-clash-display), 'Clash Display', system-ui, sans-serif",
            fontSize: 28,
            fontWeight: 600,
            color: 'var(--ink)',
            margin: '0 0 12px',
          }}
        >
          Curriculum
        </h1>
        <p
          style={{
            fontSize: 16,
            color: 'var(--muted)',
            lineHeight: 1.5,
            margin: 0,
            fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
          }}
        >
          You haven&apos;t been assigned to a cohort yet. Your trainer will add you when your
          cohort starts.
        </p>
      </div>
    );
  }

  // Fetch curriculum weeks + all gap scores in parallel
  const [weeks, gapScores] = await Promise.all([
    listWeeks(associate.cohortId),
    prisma.gapScore.findMany({
      where: { associateId: associate.id },
      select: { skill: true, topic: true, weightedScore: true },
    }),
  ]);

  // Build skill-level and topic-level score maps
  const skillScoreMap = new Map<string, number>();
  const topicScoreMap = new Map<string, number>();

  for (const gs of gapScores) {
    const slug = gs.skill.split('/')[0].toLowerCase();
    if (!gs.topic || gs.topic === '') {
      // Skill-level score — keep highest if multiple paths
      const existing = skillScoreMap.get(slug);
      if (existing === undefined || gs.weightedScore > existing) {
        skillScoreMap.set(slug, gs.weightedScore);
      }
    } else {
      // Topic-level score
      const key = `${slug}:${gs.topic.toLowerCase()}`;
      const existing = topicScoreMap.get(key);
      if (existing === undefined || gs.weightedScore > existing) {
        topicScoreMap.set(key, gs.weightedScore);
      }
    }
  }

  // Determine current week: latest week where startDate <= now
  const now = new Date();
  const startedWeeks = weeks.filter((w) => new Date(w.startDate) <= now);
  const currentWeek =
    startedWeeks.length > 0 ? startedWeeks[startedWeeks.length - 1] : null;

  // Map weeks to ScheduleWeek with timeState and topic scores
  const scheduleWeeks = weeks.map((week) => {
    const weekStart = new Date(week.startDate);
    let timeState: TimeState;
    if (weekStart > now) {
      timeState = 'future';
    } else if (currentWeek && week.weekNumber === currentWeek.weekNumber) {
      timeState = 'current';
    } else {
      timeState = 'past';
    }

    const skillSlug = week.skillSlug.toLowerCase();

    return {
      weekNumber: week.weekNumber,
      skillName: week.skillName,
      startDate: week.startDate.toISOString(),
      topics: week.topicTags.map((tag) => {
        const topicKey = `${skillSlug}:${tag.toLowerCase()}`;
        const score =
          topicScoreMap.get(topicKey) ?? skillScoreMap.get(skillSlug) ?? null;
        return { topicName: tag, score };
      }),
      timeState,
    };
  });

  // Count unassessed topics in current week
  const currentScheduleWeek = scheduleWeeks.find((w) => w.timeState === 'current');
  const unassessedCount = currentScheduleWeek
    ? currentScheduleWeek.topics.filter((t) => t.score === null).length
    : 0;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
      <h1
        style={{
          fontFamily:
            "var(--font-clash-display), 'Clash Display', system-ui, sans-serif",
          fontSize: 28,
          fontWeight: 600,
          color: 'var(--ink)',
          margin: '0 0 24px',
        }}
      >
        Curriculum
      </h1>

      <CurriculumBanner unassessedCount={unassessedCount} interviewHref="/" />

      <CurriculumSchedule weeks={scheduleWeeks} />
    </div>
  );
}
