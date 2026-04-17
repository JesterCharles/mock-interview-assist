import { prisma } from '@/lib/prisma';
import { getCallerIdentity } from '@/lib/identity';
import { getAssociateIdBySlug } from '@/lib/associateService';
import { validateSlug } from '@/lib/slug-validation';
import { getSettings } from '@/lib/settingsService';
import { redirect, notFound } from 'next/navigation';
import { AssociateDashboardClient } from './AssociateDashboardClient';
import type { GapScoreEntry, SessionSummary } from '@/lib/trainer-types';

/**
 * Associate Self-Dashboard (Phase 29 Plan 03).
 *
 * Server-rendered. Restructured with 2-column layout, all new visualization
 * components wired via AssociateDashboardClient. RecommendedAreaCard removed.
 * Identity guard matches the profile page matrix:
 *   anonymous → /signin
 *   wrong-slug associate → 403
 *   trainer/admin → allowed for any slug
 */

interface PageProps {
  params: Promise<{ slug: string }>;
}

function renderForbidden() {
  return (
    <div
      data-testid="dashboard-forbidden"
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
      <p style={{ fontSize: '14px', color: 'var(--muted)', margin: 0 }}>
        You are signed in as a different associate. Contact your trainer if
        you believe this is an error.
      </p>
    </div>
  );
}

export default async function AssociateDashboardPage({ params }: PageProps) {
  const { slug } = await params;
  const slugValidation = validateSlug(slug);
  if (!slugValidation.success) {
    notFound();
  }

  const caller = await getCallerIdentity();

  if (caller.kind === 'anonymous') {
    redirect(
      '/signin?as=associate&next=' +
        encodeURIComponent('/associate/' + slugValidation.slug + '/dashboard'),
    );
  }

  const targetId = await getAssociateIdBySlug(slugValidation.slug);
  if (targetId === null) {
    notFound();
  }

  const isTrainerOrAdmin = caller.kind === 'trainer' || caller.kind === 'admin';
  if (!isTrainerOrAdmin && caller.kind === 'associate' && caller.associateId !== targetId) {
    return renderForbidden();
  }

  // Direct Prisma query — not API calls (no trainer-gated routes)
  const associate = await prisma.associate.findUnique({
    where: { slug: slugValidation.slug },
    select: {
      id: true,
      slug: true,
      displayName: true,
      readinessStatus: true,
      recommendedArea: true,
      gapScores: {
        select: { skill: true, topic: true, weightedScore: true, sessionCount: true },
      },
      sessions: {
        where: { status: 'completed' },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          createdAt: true,
          overallTechnicalScore: true,
          overallSoftSkillScore: true,
          status: true,
          assessments: true,
        },
      },
    },
  });

  if (!associate) {
    notFound();
  }

  const settings = await getSettings();

  // Compute readiness percentage server-side
  const skillLevelScores = (associate.gapScores ?? []).filter(
    (g) => g.topic === '' || g.topic === null,
  );
  const readinessPercent =
    skillLevelScores.length > 0
      ? Math.round(
          skillLevelScores.reduce((sum, g) => sum + g.weightedScore, 0) /
            skillLevelScores.length,
        )
      : 0;

  // Lowest skill for FocusHero
  const sortedSkills = [...skillLevelScores].sort(
    (a, b) => a.weightedScore - b.weightedScore,
  );
  const lowestSkill = sortedSkills[0];
  const lowestScore = lowestSkill?.weightedScore ?? null;

  // Map Prisma data to trainer-types for visualization components
  const gapScoreEntries: GapScoreEntry[] = (associate.gapScores ?? []).map((g) => ({
    skill: g.skill,
    topic: g.topic,
    weightedScore: g.weightedScore,
    sessionCount: g.sessionCount,
  }));

  const sessionSummaries: SessionSummary[] = (associate.sessions ?? []).map((s) => ({
    id: s.id,
    date: s.createdAt instanceof Date ? s.createdAt.toISOString() : String(s.createdAt),
    overallTechnicalScore: s.overallTechnicalScore,
    overallSoftSkillScore: s.overallSoftSkillScore,
    status: s.status,
    assessments: (s.assessments as SessionSummary['assessments']) ?? {},
  }));

  const displayName = associate.displayName || associate.slug;

  return (
    <div
      style={{
        maxWidth: '1120px',
        margin: '0 auto',
        padding: '32px 24px',
      }}
    >
      {/* Page heading */}
      <h1
        style={{
          fontFamily:
            "var(--font-clash-display), 'Clash Display', system-ui, sans-serif",
          fontSize: '24px',
          fontWeight: 600,
          color: 'var(--ink)',
          margin: '0 0 32px 0',
        }}
      >
        {displayName}&rsquo;s Dashboard
      </h1>

      {/* Client component holds all filter state and renders the 2-column layout */}
      <AssociateDashboardClient
        displayName={displayName}
        gapScores={gapScoreEntries}
        sessions={sessionSummaries}
        readinessPercent={readinessPercent}
        threshold={settings.readinessThreshold}
        recommendedArea={associate.recommendedArea}
        lowestScore={lowestScore}
        lowestSkillSessionCount={lowestSkill?.sessionCount ?? 0}
      />
    </div>
  );
}
