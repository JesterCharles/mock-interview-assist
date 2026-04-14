'use client';

import { useState } from 'react';

interface GeneratePinButtonProps {
  associateId: number;
  associateName: string;
}

const tokens = {
  ink: '#1A1A1A',
  muted: '#7A7267',
  accent: '#C85A2E',
  accentHover: '#B04E27',
  border: '#DDD5C8',
  surface: '#FFFFFF',
  surfaceMuted: '#F0EBE2',
  warningBg: '#FEF3E0',
  warning: '#B7791F',
  danger: '#B83B2E',
  dangerBg: '#FDECEB',
  success: '#2D6A4F',
} as const;

export function GeneratePinButton({ associateId, associateName }: GeneratePinButtonProps) {
  const [submitting, setSubmitting] = useState(false);
  const [pin, setPin] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    if (submitting) return;
    setError(null);
    setCopied(false);
    setSubmitting(true);
    try {
      const res = await fetch('/api/associate/pin/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ associateId }),
      });
      if (!res.ok) {
        if (res.status === 401) {
          setError('Your trainer session expired. Please sign in again.');
        } else if (res.status === 404) {
          setError('Associate not found.');
        } else {
          setError(`Failed to generate PIN (${res.status}).`);
        }
        return;
      }
      const data = (await res.json()) as { pin: string };
      setPin(data.pin);
    } catch (err) {
      console.error('[GeneratePinButton] generate failed', err);
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopy() {
    if (!pin) return;
    try {
      await navigator.clipboard.writeText(pin);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('[GeneratePinButton] copy failed', err);
    }
  }

  function handleClose() {
    setPin(null);
    setError(null);
    setCopied(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleGenerate}
        disabled={submitting}
        style={{
          padding: '8px 14px',
          fontSize: '13px',
          fontWeight: 600,
          fontFamily: "'DM Sans', sans-serif",
          color: '#FFFFFF',
          backgroundColor: submitting ? tokens.muted : tokens.accent,
          border: 'none',
          borderRadius: '8px',
          cursor: submitting ? 'not-allowed' : 'pointer',
          transition: 'background-color 150ms ease-out',
        }}
        onMouseEnter={(e) => {
          if (!submitting) e.currentTarget.style.backgroundColor = tokens.accentHover;
        }}
        onMouseLeave={(e) => {
          if (!submitting) e.currentTarget.style.backgroundColor = tokens.accent;
        }}
      >
        {submitting ? 'Generating…' : 'Generate PIN'}
      </button>

      {error && !pin && (
        <div
          role="alert"
          style={{
            marginTop: '8px',
            padding: '8px 12px',
            fontSize: '13px',
            color: tokens.danger,
            backgroundColor: tokens.dangerBg,
            border: `1px solid ${tokens.danger}`,
            borderRadius: '8px',
          }}
        >
          {error}
        </div>
      )}

      {pin && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pin-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(26, 26, 26, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            zIndex: 1000,
          }}
          onClick={(e) => {
            // Do NOT close on backdrop click — PIN is one-shot, explicit close only.
            e.stopPropagation();
          }}
        >
          <div
            style={{
              backgroundColor: tokens.surface,
              border: `1px solid ${tokens.border}`,
              borderRadius: '12px',
              padding: '28px',
              width: '100%',
              maxWidth: '440px',
              fontFamily: "'DM Sans', sans-serif",
              color: tokens.ink,
            }}
          >
            <h2
              id="pin-modal-title"
              style={{
                fontFamily: "'Clash Display', sans-serif",
                fontSize: '22px',
                fontWeight: 600,
                margin: '0 0 6px 0',
                letterSpacing: '-0.01em',
              }}
            >
              PIN for {associateName}
            </h2>
            <p
              style={{
                fontSize: '13px',
                color: tokens.muted,
                margin: '0 0 20px 0',
              }}
            >
              Send this PIN to the associate via a trusted channel.
            </p>

            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '40px',
                fontWeight: 600,
                letterSpacing: '0.2em',
                textAlign: 'center',
                padding: '20px',
                backgroundColor: tokens.surfaceMuted,
                border: `1px solid ${tokens.border}`,
                borderRadius: '8px',
                color: tokens.ink,
                marginBottom: '16px',
              }}
            >
              {pin}
            </div>

            <button
              type="button"
              onClick={handleCopy}
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: '13px',
                fontWeight: 600,
                color: copied ? '#FFFFFF' : tokens.ink,
                backgroundColor: copied ? tokens.success : tokens.surface,
                border: `1px solid ${copied ? tokens.success : tokens.border}`,
                borderRadius: '8px',
                cursor: 'pointer',
                marginBottom: '16px',
                transition: 'background-color 150ms ease-out, color 150ms ease-out',
              }}
            >
              {copied ? 'Copied to clipboard' : 'Copy PIN'}
            </button>

            <div
              style={{
                padding: '12px',
                fontSize: '12px',
                lineHeight: 1.5,
                color: tokens.warning,
                backgroundColor: tokens.warningBg,
                border: `1px solid ${tokens.warning}`,
                borderRadius: '8px',
                marginBottom: '20px',
              }}
            >
              <strong>This PIN will not be shown again.</strong> Copy and send it to{' '}
              {associateName} now. Generating a new PIN immediately revokes any prior
              session cookie.
            </div>

            <button
              type="button"
              onClick={handleClose}
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#FFFFFF',
                backgroundColor: tokens.accent,
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
}
