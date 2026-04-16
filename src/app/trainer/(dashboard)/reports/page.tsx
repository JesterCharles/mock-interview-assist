'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'

function ReportsContent() {
  const searchParams = useSearchParams()
  const cohortId = searchParams.get('cohort')

  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  async function handleExportCohortPdf() {
    setExporting(true)
    setExportError(null)
    try {
      const endpoint =
        '/api/trainer/reports/cohort-pdf' + (cohortId ? `?cohort=${cohortId}` : '')
      const res = await fetch(endpoint)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `nlm-cohort-${new Date().toISOString().split('T')[0]}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div
      style={{
        maxWidth: '720px',
        margin: '0 auto',
        padding: '48px 24px',
      }}
    >
      {/* Page title */}
      <h1
        style={{
          fontFamily: 'var(--font-display), "Clash Display", sans-serif',
          fontWeight: 500,
          fontSize: '32px',
          color: 'var(--ink)',
          marginBottom: '8px',
          letterSpacing: '-0.01em',
        }}
      >
        Reports
      </h1>
      <p
        style={{
          fontFamily: 'var(--font-dm-sans), "DM Sans", sans-serif',
          fontSize: '14px',
          color: 'var(--muted)',
          marginBottom: '40px',
        }}
      >
        Download analytics PDFs for cohort and per-associate performance.
      </p>

      {/* Cohort PDF export card */}
      <div
        style={{
          background: 'var(--surface, #FAF8F5)',
          border: '1px solid var(--border, #E8E2D9)',
          borderRadius: '10px',
          padding: '24px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '20px',
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            background: 'var(--accent, #C85A2E)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M4 3C4 2.44772 4.44772 2 5 2H12L16 6V17C16 17.5523 15.5523 18 15 18H5C4.44772 18 4 17.5523 4 17V3Z"
              stroke="white"
              strokeWidth="1.5"
              fill="none"
            />
            <path d="M12 2V6H16" stroke="white" strokeWidth="1.5" fill="none" />
            <path d="M7 11L10 14L13 11" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M10 8V14" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>

        {/* Text + button */}
        <div style={{ flex: 1 }}>
          <h2
            style={{
              fontFamily: 'var(--font-display), "Clash Display", sans-serif',
              fontWeight: 500,
              fontSize: '18px',
              color: 'var(--ink)',
              marginBottom: '6px',
            }}
          >
            Cohort Analytics PDF
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-dm-sans), "DM Sans", sans-serif',
              fontSize: '13px',
              color: 'var(--muted)',
              marginBottom: '16px',
            }}
          >
            KPI snapshot, gap-by-topic table, and roster summary
            {cohortId ? ' for the selected cohort.' : ' for all associates.'}
          </p>

          {exportError && (
            <p
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '13px',
                color: 'var(--danger, #B83B2E)',
                marginBottom: '12px',
              }}
            >
              {exportError}
            </p>
          )}

          <button
            onClick={handleExportCohortPdf}
            disabled={exporting}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              background: exporting ? 'var(--muted, #7A7267)' : 'var(--accent, #C85A2E)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontFamily: 'var(--font-dm-sans), "DM Sans", sans-serif',
              fontWeight: 500,
              fontSize: '14px',
              cursor: exporting ? 'not-allowed' : 'pointer',
              opacity: exporting ? 0.7 : 1,
              transition: 'opacity 150ms ease',
            }}
          >
            {exporting ? 'Exporting…' : 'Export Cohort PDF'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ReportsPage() {
  return (
    <Suspense fallback={null}>
      <ReportsContent />
    </Suspense>
  )
}
