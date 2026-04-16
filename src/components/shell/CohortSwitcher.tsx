'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronDown, Check } from 'lucide-react';

interface Cohort {
  id: string;
  name: string;
  _count: { associates: number };
}

export function CohortSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState(false);

  // Resolve selected cohort: URL param first, then localStorage
  useEffect(() => {
    const fromParam = searchParams.get('cohort');
    if (fromParam) {
      setSelected(fromParam);
    } else {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('nlm_cohort_id') : null;
      if (stored) {
        router.replace(`${pathname}?cohort=${stored}`);
        setSelected(stored);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch cohorts
  useEffect(() => {
    let cancelled = false;
    fetch('/api/cohorts')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch cohorts');
        return res.json();
      })
      .then((data: { cohorts: Cohort[] }) => {
        if (!cancelled) setCohorts(data.cohorts ?? []);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => { cancelled = true; };
  }, []);

  const handleSelect = (cohortId: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (cohortId) {
      params.set('cohort', cohortId);
      if (typeof window !== 'undefined') localStorage.setItem('nlm_cohort_id', cohortId);
    } else {
      params.delete('cohort');
      if (typeof window !== 'undefined') localStorage.removeItem('nlm_cohort_id');
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
    setSelected(cohortId);
  };

  const selectedCohort = cohorts.find((c) => c.id === selected);
  const triggerLabel = selectedCohort ? selectedCohort.name : 'All Cohorts';

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            maxWidth: 160,
            padding: '4px 8px',
            borderRadius: 6,
            border: '1px solid var(--border)',
            background: 'var(--surface-muted)',
            color: 'var(--ink)',
            fontSize: 13,
            fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
            fontWeight: 500,
            cursor: 'pointer',
            outline: 'none',
          }}
          className="hover:bg-[var(--highlight)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {triggerLabel}
          </span>
          <ChevronDown className="w-3 h-3 shrink-0" aria-hidden="true" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side="bottom"
          align="start"
          sideOffset={8}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            minWidth: 200,
            padding: '4px 0',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            zIndex: 50,
          }}
        >
          {error ? (
            <div
              style={{
                padding: '8px 12px',
                fontSize: 13,
                color: 'var(--muted)',
                fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
              }}
            >
              Couldn&apos;t load cohorts. Refresh to try again.
            </div>
          ) : (
            <>
              {/* All Cohorts option */}
              <DropdownMenu.Item
                onSelect={() => handleSelect(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  fontSize: 13,
                  fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
                  fontWeight: 500,
                  color: 'var(--ink)',
                  cursor: 'pointer',
                  outline: 'none',
                }}
                className="hover:bg-[var(--highlight)] focus-visible:bg-[var(--highlight)]"
              >
                <span>All Cohorts</span>
                {selected === null && <Check className="w-3 h-3" style={{ color: 'var(--accent)' }} />}
              </DropdownMenu.Item>

              {cohorts.map((cohort) => (
                <DropdownMenu.Item
                  key={cohort.id}
                  onSelect={() => handleSelect(cohort.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    fontSize: 13,
                    fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
                    fontWeight: 500,
                    color: 'var(--ink)',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                  className="hover:bg-[var(--highlight)] focus-visible:bg-[var(--highlight)]"
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {cohort.name}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 400 }}>
                      {cohort._count.associates}
                    </span>
                    {selected === cohort.id && (
                      <Check className="w-3 h-3" style={{ color: 'var(--accent)' }} />
                    )}
                  </span>
                </DropdownMenu.Item>
              ))}
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
