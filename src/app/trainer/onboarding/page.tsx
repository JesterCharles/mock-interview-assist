'use client';

import { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { EmailChipInput } from './EmailChipInput';
import { CohortDropdown } from './CohortDropdown';
import { BulkPreviewTable } from './BulkPreviewTable';
import { BulkResultTable } from './BulkResultTable';
import {
  classifyEmails,
  type PreviewRow,
  type CohortOption,
  type RosterAssociate,
} from '@/lib/bulkInvitePreview';
import { getChipSummary, isOverCap, type ParsedEmail } from '@/lib/emailParser';

type Screen = 'input' | 'preview' | 'results';

interface BulkResult {
  email: string;
  status: string;
  error?: string;
}

export default function OnboardingPage() {
  const [screen, setScreen] = useState<Screen>('input');
  const [chips, setChips] = useState<ParsedEmail[]>([]);
  const [selectedCohortId, setSelectedCohortId] = useState<number | null>(null);
  const [cohorts, setCohorts] = useState<CohortOption[]>([]);
  const [roster, setRoster] = useState<RosterAssociate[]>([]);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [results, setResults] = useState<BulkResult[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [rosterFetchError, setRosterFetchError] = useState<string | null>(null);

  // Load cohorts on mount
  useEffect(() => {
    fetch('/api/cohorts')
      .then(r => r.json())
      .then((data: CohortOption[]) => {
        setCohorts(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        // Non-blocking — CohortDropdown renders the no-cohorts error state
        setCohorts([]);
      });
  }, []);

  const summary = getChipSummary(chips);
  const overCap = isOverCap(chips, 50);
  const previewDisabled =
    chips.length === 0 ||
    selectedCohortId === null ||
    summary.valid === 0 ||
    overCap ||
    isLoadingPreview;

  async function handlePreview() {
    if (!selectedCohortId) return;
    setIsLoadingPreview(true);
    setRosterFetchError(null);
    try {
      const res = await fetch('/api/trainer/associates');
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      const rosterData: RosterAssociate[] = (Array.isArray(data) ? data : []).map(
        (a: { email?: string | null; cohortId?: number | null; lastInvitedAt?: string | null; slug?: string }) => ({
          email: a.email ?? null,
          cohortId: a.cohortId ?? null,
          lastInvitedAt: a.lastInvitedAt ?? null,
          slug: a.slug ?? '',
        }),
      );
      setRoster(rosterData);
      const rows = classifyEmails(chips, rosterData, selectedCohortId, cohorts);
      setPreviewRows(rows);
      setScreen('preview');
    } catch {
      setRosterFetchError('Failed to load roster. Retry.');
    } finally {
      setIsLoadingPreview(false);
    }
  }

  function toggleRow(index: number) {
    setPreviewRows(prev =>
      prev.map((r, i) =>
        i === index && r.checkable ? { ...r, checked: !r.checked } : r,
      ),
    );
  }

  function handleBack() {
    setApiError(null);
    setScreen('input');
  }

  async function handleConfirm() {
    if (!selectedCohortId) return;
    setIsSending(true);
    setApiError(null);
    const emails = previewRows.filter(r => r.checked).map(r => r.email);
    try {
      const res = await fetch('/api/trainer/invites/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails, cohortId: selectedCohortId }),
      });
      const data = await res.json();
      if (res.status === 429) {
        setApiError(data.error ?? 'Daily invite limit reached.');
        return;
      }
      if (!res.ok) {
        setApiError(data.error ?? 'An error occurred. Please try again.');
        return;
      }
      const resultList: BulkResult[] = data.results ?? [];
      setResults(resultList);
      setScreen('results');
      // Fire toast
      const failCount = resultList.filter(r => r.status === 'failed').length;
      if (failCount === 0) {
        toast.success('All invites sent.', { duration: 4000 });
      } else {
        toast(`${failCount} failed. Check the results table for details.`, {
          icon: '!',
          duration: 4000,
        });
      }
    } catch {
      setApiError('Network error. Please check your connection and retry.');
    } finally {
      setIsSending(false);
    }
  }

  function handleInviteMore() {
    setChips([]);
    setPreviewRows([]);
    setResults([]);
    setApiError(null);
    setRosterFetchError(null);
    setScreen('input');
    // Keep cohort selection
  }

  return (
    <div
      style={{
        maxWidth: '800px',
        margin: '0 auto',
        paddingTop: 'var(--space-2xl, 48px)',
        paddingLeft: 'var(--space-lg, 24px)',
        paddingRight: 'var(--space-lg, 24px)',
        paddingBottom: 'var(--space-2xl, 48px)',
      }}
    >
      <Toaster position="bottom-right" />

      {/* Page header */}
      <h1
        style={{
          fontFamily: 'Clash Display, sans-serif',
          fontSize: '28px',
          fontWeight: 600,
          color: 'var(--ink)',
          margin: '0 0 8px',
          lineHeight: 1.2,
        }}
      >
        Bulk Invite
      </h1>
      <p
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '16px',
          fontWeight: 400,
          color: 'var(--muted)',
          margin: '0 0 32px',
        }}
      >
        Invite associates by email and assign them to a cohort.
      </p>

      {/* Screen 1 — Input */}
      {screen === 'input' && (
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: 'var(--space-lg, 24px)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-md, 16px)',
          }}
        >
          {/* Email field label */}
          <div>
            <p
              style={{
                fontFamily: 'Clash Display, sans-serif',
                fontSize: '16px',
                fontWeight: 600,
                color: 'var(--ink)',
                margin: '0 0 8px',
              }}
            >
              Email Addresses
            </p>
            <EmailChipInput chips={chips} onChipsChange={setChips} />
          </div>

          {/* Cohort dropdown */}
          <CohortDropdown
            cohorts={cohorts}
            selectedId={selectedCohortId}
            onChange={setSelectedCohortId}
          />

          {/* Roster fetch error */}
          {rosterFetchError && (
            <p
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '13px',
                color: 'var(--danger)',
                margin: 0,
              }}
            >
              {rosterFetchError}{' '}
              <button
                type="button"
                onClick={handlePreview}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent)',
                  cursor: 'pointer',
                  padding: 0,
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '13px',
                  textDecoration: 'underline',
                }}
              >
                Retry
              </button>
            </p>
          )}

          {/* Preview button */}
          <div>
            <button
              type="button"
              className="btn-accent-flat"
              onClick={handlePreview}
              disabled={previewDisabled}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {isLoadingPreview ? (
                <>
                  <ButtonSpinner />
                  Loading...
                </>
              ) : (
                'Preview Invites'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Screen 2 — Preview */}
      {screen === 'preview' && (
        <div>
          <h2
            style={{
              fontFamily: 'Clash Display, sans-serif',
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--ink)',
              margin: '0 0 16px',
            }}
          >
            Review Invites
          </h2>

          {/* API error banner */}
          {apiError && (
            <div
              style={{
                background: 'var(--danger-bg)',
                border: '1px solid var(--danger)',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '16px',
                color: 'var(--danger)',
              }}
            >
              {apiError}
            </div>
          )}

          <BulkPreviewTable
            rows={previewRows}
            onToggleRow={toggleRow}
            onConfirm={handleConfirm}
            onBack={handleBack}
            isSending={isSending}
          />
        </div>
      )}

      {/* Screen 3 — Results */}
      {screen === 'results' && (
        <div>
          <h2
            style={{
              fontFamily: 'Clash Display, sans-serif',
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--ink)',
              margin: '0 0 16px',
            }}
          >
            Invites Sent
          </h2>
          <BulkResultTable results={results} onInviteMore={handleInviteMore} />
        </div>
      )}
    </div>
  );
}

function ButtonSpinner() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      style={{ animation: 'spin 1s linear infinite' }}
    >
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" />
      <path
        d="M14 8a6 6 0 0 0-6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}
