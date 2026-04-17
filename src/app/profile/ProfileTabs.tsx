'use client';

import { useState, FormEvent } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

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

interface ProfileTabsProps {
  profile: ProfileData;
  email: string;
  role: string;
  readiness: ReadinessData | null;
}

const inputBase: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  fontSize: '14px',
  color: 'var(--ink)',
  backgroundColor: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif",
};

const readonlyInput: React.CSSProperties = {
  ...inputBase,
  backgroundColor: 'var(--surface-muted)',
  cursor: 'not-allowed',
  color: 'var(--muted)',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--ink)',
  marginBottom: 6,
};

const fieldGroup: React.CSSProperties = {
  marginBottom: 16,
};

type Tab = 'profile' | 'security' | 'learning';

function readinessBadgeStyle(status: string): React.CSSProperties {
  if (status === 'ready') {
    return {
      background: 'var(--success-bg)',
      color: 'var(--success)',
      padding: '2px 10px',
      borderRadius: 9999,
      fontSize: 12,
      fontWeight: 600,
      display: 'inline-block',
    };
  }
  if (status === 'improving') {
    return {
      background: 'var(--warning-bg)',
      color: 'var(--warning)',
      padding: '2px 10px',
      borderRadius: 9999,
      fontSize: 12,
      fontWeight: 600,
      display: 'inline-block',
    };
  }
  return {
    background: 'var(--danger-bg)',
    color: 'var(--danger)',
    padding: '2px 10px',
    borderRadius: 9999,
    fontSize: 12,
    fontWeight: 600,
    display: 'inline-block',
  };
}

export function ProfileTabs({ profile, email, role, readiness }: ProfileTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  // Profile tab state
  const [displayName, setDisplayName] = useState(profile.displayName ?? '');
  const [githubUsername, setGithubUsername] = useState(profile.githubUsername ?? '');
  const [bio, setBio] = useState(profile.bio ?? '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // Security tab state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordStatus, setPasswordStatus] = useState<'idle' | 'submitting' | 'success'>('idle');

  // Learning tab state
  const [learningGoals, setLearningGoals] = useState(profile.learningGoals ?? '');
  const [goalsSaving, setGoalsSaving] = useState(false);
  const [goalsSaved, setGoalsSaved] = useState(false);

  async function saveProfile() {
    setProfileSaving(true);
    try {
      await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName, githubUsername, bio }),
      });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    } finally {
      setProfileSaving(false);
    }
  }

  async function saveGoals() {
    setGoalsSaving(true);
    try {
      await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ learningGoals }),
      });
      setGoalsSaved(true);
      setTimeout(() => setGoalsSaved(false), 2000);
    } finally {
      setGoalsSaving(false);
    }
  }

  async function handlePasswordSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (passwordStatus === 'submitting') return;

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setPasswordError(null);
    setPasswordStatus('submitting');

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setPasswordError(error.message || 'Failed to update password. Please try again.');
      setPasswordStatus('idle');
      return;
    }

    // Write passwordSetAt to Profile (non-blocking)
    try {
      await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passwordSetAt: new Date().toISOString() }),
      });
    } catch {
      // Non-blocking — metadata is already updated as fallback
      console.warn('[ProfileTabs] Failed to update Profile.passwordSetAt');
    }

    setPasswordStatus('success');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPasswordStatus('idle'), 3000);
  }

  const tabButtonStyle = (tab: Tab): React.CSSProperties => ({
    padding: '12px 20px',
    fontSize: 14,
    fontWeight: 500,
    fontFamily: "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif",
    color: activeTab === tab ? 'var(--ink)' : 'var(--muted)',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
    marginBottom: -1,
    transition: 'color 0.15s, border-color 0.15s',
  });

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        backgroundColor: 'var(--bg)',
        padding: '48px 16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 600,
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 40,
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-clash-display), 'Clash Display', system-ui, sans-serif",
            fontSize: 28,
            fontWeight: 600,
            margin: '0 0 24px 0',
            letterSpacing: '-0.02em',
            color: 'var(--ink)',
            lineHeight: 1.2,
          }}
        >
          Settings
        </h1>

        {/* Tab bar */}
        <div
          style={{
            display: 'flex',
            gap: 0,
            borderBottom: '1px solid var(--border)',
            marginBottom: 28,
          }}
        >
          <button style={tabButtonStyle('profile')} onClick={() => setActiveTab('profile')}>
            Profile
          </button>
          <button style={tabButtonStyle('security')} onClick={() => setActiveTab('security')}>
            Security
          </button>
          <button style={tabButtonStyle('learning')} onClick={() => setActiveTab('learning')}>
            Learning
          </button>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div>
            <div style={fieldGroup}>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={email}
                readOnly
                style={readonlyInput}
              />
            </div>

            <div style={{ ...fieldGroup }}>
              <label style={labelStyle}>Role</label>
              <div>
                <span
                  style={{
                    fontSize: 12,
                    fontFamily: "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif",
                    fontWeight: 500,
                    color: role === 'admin' ? 'var(--warning)' : role === 'trainer' ? 'var(--success)' : 'var(--muted)',
                    padding: '2px 10px',
                    borderRadius: 9999,
                    background:
                      role === 'admin'
                        ? 'rgba(183,121,31,0.1)'
                        : role === 'trainer'
                        ? 'rgba(45,106,79,0.1)'
                        : 'var(--surface-muted)',
                    display: 'inline-block',
                  }}
                >
                  {role}
                </span>
              </div>
            </div>

            <div style={fieldGroup}>
              <label htmlFor="displayName" style={labelStyle}>
                Display name
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                style={inputBase}
              />
            </div>

            <div style={fieldGroup}>
              <label htmlFor="githubUsername" style={labelStyle}>
                GitHub username
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                <span
                  style={{
                    padding: '10px 10px 10px 14px',
                    fontSize: 14,
                    color: 'var(--muted)',
                    backgroundColor: 'var(--surface-muted)',
                    border: '1px solid var(--border)',
                    borderRight: 'none',
                    borderRadius: '8px 0 0 8px',
                    fontFamily: "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif",
                    whiteSpace: 'nowrap',
                  }}
                >
                  github.com/
                </span>
                <input
                  id="githubUsername"
                  type="text"
                  value={githubUsername}
                  onChange={(e) => setGithubUsername(e.target.value)}
                  placeholder="username"
                  style={{
                    ...inputBase,
                    borderRadius: '0 8px 8px 0',
                    flex: 1,
                  }}
                />
              </div>
            </div>

            <div style={fieldGroup}>
              <label htmlFor="bio" style={labelStyle}>
                Bio
              </label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                placeholder="A brief description about yourself"
                style={{
                  ...inputBase,
                  resize: 'vertical',
                  lineHeight: 1.5,
                }}
              />
            </div>

            <button
              onClick={saveProfile}
              disabled={profileSaving}
              className="btn-accent-flat"
              style={{ width: '100%' }}
            >
              {profileSaved ? 'Saved' : profileSaving ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div>
            <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 24px 0', lineHeight: 1.5 }}>
              Update your password. You will remain signed in after changing it.
            </p>

            {passwordStatus === 'success' ? (
              <div
                role="status"
                style={{
                  padding: 16,
                  backgroundColor: 'var(--surface-muted)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  fontSize: 14,
                  color: 'var(--ink)',
                  lineHeight: 1.5,
                }}
              >
                Password updated successfully.
              </div>
            ) : (
              <form onSubmit={handlePasswordSubmit} noValidate>
                <div style={fieldGroup}>
                  <label htmlFor="new-password" style={labelStyle}>
                    New password
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    disabled={passwordStatus === 'submitting'}
                    style={inputBase}
                  />
                </div>

                <div style={fieldGroup}>
                  <label htmlFor="confirm-password" style={labelStyle}>
                    Confirm password
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    disabled={passwordStatus === 'submitting'}
                    style={inputBase}
                  />
                </div>

                {passwordError && (
                  <div role="alert" style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 16 }}>
                    {passwordError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={passwordStatus === 'submitting' || !newPassword || !confirmPassword}
                  className="btn-accent-flat"
                  style={{ width: '100%' }}
                >
                  {passwordStatus === 'submitting' ? 'Updating…' : 'Update password'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Learning Tab */}
        {activeTab === 'learning' && (
          <div>
            {role !== 'associate' ? (
              <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}>
                Learning data is available for associates.
              </p>
            ) : (
              <>
                {readiness && (
                  <div
                    style={{
                      background: 'var(--surface-muted)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      padding: 20,
                      marginBottom: 24,
                    }}
                  >
                    <p
                      style={{
                        fontSize: 11,
                        fontFamily: "'JetBrains Mono', monospace",
                        fontWeight: 500,
                        textTransform: 'uppercase',
                        letterSpacing: '0.07em',
                        color: 'var(--muted)',
                        margin: '0 0 12px 0',
                      }}
                    >
                      Readiness Summary
                    </p>

                    <div style={{ marginBottom: 8 }}>
                      <span style={readinessBadgeStyle(readiness.status)}>
                        {readiness.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.8 }}>
                      <div>
                        <span style={{ color: 'var(--muted)' }}>Score: </span>
                        {readiness.score != null ? `${readiness.score}%` : 'No scores yet'}
                      </div>
                      <div>
                        <span style={{ color: 'var(--muted)' }}>Focus area: </span>
                        {readiness.recommendedArea ?? 'None identified'}
                      </div>
                      <div>
                        <span style={{ color: 'var(--muted)' }}>Sessions: </span>
                        {readiness.sessionCount} completed
                      </div>
                    </div>
                  </div>
                )}

                <div style={fieldGroup}>
                  <label htmlFor="learningGoals" style={labelStyle}>
                    Learning goals
                  </label>
                  <textarea
                    id="learningGoals"
                    value={learningGoals}
                    onChange={(e) => setLearningGoals(e.target.value)}
                    rows={5}
                    placeholder="What do you want to achieve? Which skills do you want to improve?"
                    style={{
                      ...inputBase,
                      resize: 'vertical',
                      lineHeight: 1.5,
                    }}
                  />
                </div>

                <button
                  onClick={saveGoals}
                  disabled={goalsSaving}
                  className="btn-accent-flat"
                  style={{ width: '100%' }}
                >
                  {goalsSaved ? 'Saved' : goalsSaving ? 'Saving…' : 'Save goals'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
