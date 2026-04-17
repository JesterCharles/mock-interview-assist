'use client';

import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { ProfileTabs } from '@/app/profile/ProfileTabs';

type Tab = 'profile' | 'security' | 'learning';

interface ProfileData {
  displayName: string | null;
  githubUsername: string | null;
  bio: string | null;
  learningGoals: string | null;
}

interface ReadinessData {
  status: string;
  recommendedArea: string | null;
  score: number | null;
  sessionCount: number;
}

interface ProfileApiResponse {
  profile: ProfileData;
  email: string;
  role: string;
  readiness: ReadinessData | null;
}

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
  initialTab?: Tab;
}

export function ProfileModal({ open, onClose, initialTab = 'profile' }: ProfileModalProps) {
  const [data, setData] = useState<ProfileApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    fetch('/api/profile')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load profile');
        return res.json() as Promise<ProfileApiResponse>;
      })
      .then((json) => {
        setData(json);
      })
      .catch(() => {
        setError('Could not load profile data.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [open]);

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 60,
          }}
        />
        <Dialog.Content
          aria-describedby={undefined}
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '90vw',
            maxWidth: 640,
            maxHeight: '90vh',
            overflowY: 'auto',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            zIndex: 61,
            padding: 0,
          }}
        >
          <Dialog.Title style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}>
            Profile Settings
          </Dialog.Title>

          {/* Close button */}
          <Dialog.Close asChild>
            <button
              aria-label="Close profile"
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                zIndex: 1,
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'var(--surface-muted)',
                border: '1px solid var(--border)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--muted)',
              }}
            >
              <X size={16} />
            </button>
          </Dialog.Close>

          {/* Content */}
          {loading && (
            <div
              style={{
                padding: 48,
                textAlign: 'center',
                color: 'var(--muted)',
                fontSize: 14,
                fontFamily: "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif",
              }}
            >
              Loading profile…
            </div>
          )}

          {error && !loading && (
            <div
              style={{
                padding: 48,
                textAlign: 'center',
                color: 'var(--danger)',
                fontSize: 14,
                fontFamily: "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif",
              }}
            >
              {error}
            </div>
          )}

          {data && !loading && (
            <ProfileTabs
              profile={data.profile}
              email={data.email}
              role={data.role}
              readiness={data.readiness}
              initialTab={initialTab}
            />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
