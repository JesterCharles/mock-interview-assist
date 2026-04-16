'use client';

import { useState, useEffect } from 'react';

interface RecommendedAreaCardProps {
  recommendedArea: string | null;
  lowestScore: number | null;
  slug: string;
}

interface DismissRecord {
  dismissedAt: string;
  recommendedArea: string;
}

export function getDismissRecord(slug: string): DismissRecord | null {
  try {
    const raw = localStorage.getItem(`nlm_dismiss_recommended_${slug}`);
    if (!raw) return null;
    return JSON.parse(raw) as DismissRecord;
  } catch {
    return null;
  }
}

export function isDismissedForArea(slug: string, area: string): boolean {
  const record = getDismissRecord(slug);
  if (!record) return false;

  // Different area — no longer dismissed
  if (record.recommendedArea !== area) return false;

  // Check 7-day window
  const dismissedAt = new Date(record.dismissedAt);
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  return Date.now() - dismissedAt.getTime() < sevenDaysMs;
}

export function RecommendedAreaCard({
  recommendedArea,
  lowestScore,
  slug,
}: RecommendedAreaCardProps) {
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (recommendedArea) {
      setDismissed(isDismissedForArea(slug, recommendedArea));
    }
  }, [slug, recommendedArea]);

  if (!recommendedArea) return null;
  // Avoid flash of card before localStorage check completes
  if (!mounted) return null;
  if (dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(
      `nlm_dismiss_recommended_${slug}`,
      JSON.stringify({
        dismissedAt: new Date().toISOString(),
        recommendedArea,
      })
    );
    setDismissed(true);
  };

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '12px',
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '16px',
      }}
    >
      <div>
        <h3
          style={{
            fontFamily:
              "var(--font-clash-display), 'Clash Display', system-ui, sans-serif",
            fontSize: '18px',
            fontWeight: 600,
            color: 'var(--ink)',
            margin: '0 0 6px 0',
          }}
        >
          Recommended Next Practice Area
        </h3>
        <p
          style={{
            fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
            fontSize: '14px',
            color: 'var(--ink)',
            margin: '0 0 4px 0',
            fontWeight: 500,
          }}
        >
          {recommendedArea}
        </p>
        {lowestScore !== null && (
          <p
            style={{
              fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
              fontSize: '13px',
              color: 'var(--muted)',
              margin: 0,
            }}
          >
            Your lowest gap score is in {recommendedArea} &mdash;{' '}
            {Math.round(lowestScore * 100)}%
          </p>
        )}
      </div>
      <button
        onClick={handleDismiss}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--muted)',
          fontSize: '13px',
          fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
          padding: '2px 0',
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}
      >
        Not now
      </button>
    </div>
  );
}
