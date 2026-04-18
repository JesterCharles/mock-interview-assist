import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { associateSettingsAccordion } from './sidebar-configs';

describe('associateSettingsAccordion factory', () => {
  it('returns a group labeled "Settings" with exactly 2 items', () => {
    const group = associateSettingsAccordion();
    expect(group.label).toBe('Settings');
    expect(group.items).toHaveLength(2);
  });

  it('first item is Profile and invokes the Profile callback when actioned', () => {
    const profileSpy = vi.fn();
    const securitySpy = vi.fn();
    const group = associateSettingsAccordion(profileSpy, securitySpy);

    expect(group.items[0].label).toBe('Profile');
    expect(group.items[0].href).toBeUndefined();
    expect(typeof group.items[0].action).toBe('function');

    group.items[0].action?.();

    expect(profileSpy).toHaveBeenCalledTimes(1);
    expect(securitySpy).not.toHaveBeenCalled();
  });

  it('second item is Security and invokes the Security callback when actioned', () => {
    const profileSpy = vi.fn();
    const securitySpy = vi.fn();
    const group = associateSettingsAccordion(profileSpy, securitySpy);

    expect(group.items[1].label).toBe('Security');
    expect(group.items[1].href).toBeUndefined();
    expect(typeof group.items[1].action).toBe('function');

    group.items[1].action?.();

    expect(securitySpy).toHaveBeenCalledTimes(1);
    expect(profileSpy).not.toHaveBeenCalled();
  });
});

describe('AssociateShell source wiring', () => {
  // Node-env static check: verifies the component imports and uses the factory + ProfileModal.
  // Catches regressions where the accordion gets torn out or ProfileModal mount is removed.
  const src = readFileSync(
    resolve(__dirname, 'AssociateShell.tsx'),
    'utf8',
  );

  it('imports associateSettingsAccordion from ./sidebar-configs', () => {
    expect(src).toMatch(/associateSettingsAccordion/);
    expect(src).toMatch(/from ['"]\.\/sidebar-configs['"]/);
  });

  it('imports ProfileModal from ./ProfileModal', () => {
    expect(src).toMatch(/from ['"]\.\/ProfileModal['"]/);
  });

  it('renders <ProfileModal at shell root', () => {
    expect(src).toMatch(/<ProfileModal[\s>]/);
  });

  it('P2 fix: mounts exactly ONE <ProfileModal instance in the shell', () => {
    // AvatarMenu used to self-mount a second ProfileModal via TopBar → AvatarMenu.
    // AssociateShell must mount ProfileModal exactly once at shell root; the
    // second instance in AvatarMenu is now skipped because the shell passes
    // onOpenProfile, which switches AvatarMenu to controlled mode.
    const mountMatches = src.match(/<ProfileModal[\s>]/g) ?? [];
    expect(mountMatches).toHaveLength(1);
  });

  it('P2 fix: forwards onOpenProfile to TopBar so AvatarMenu runs in controlled mode', () => {
    expect(src).toMatch(/onOpenProfile=\{openProfileTab\}/);
  });

  it('passes settingsGroup into SectionSidebar (not into TopBar)', () => {
    // settingsGroup must appear exactly once as a JSX prop assignment.
    const propMatches = src.match(/settingsGroup=\{/g) ?? [];
    expect(propMatches).toHaveLength(1);
  });
});

describe('AvatarMenu source wiring (P2 fix)', () => {
  const src = readFileSync(
    resolve(__dirname, 'AvatarMenu.tsx'),
    'utf8',
  );

  it('accepts onOpenProfile prop', () => {
    expect(src).toMatch(/onOpenProfile/);
  });

  it('skips internal <ProfileModal when controlled (onOpenProfile provided)', () => {
    // Source-text check: ProfileModal must be rendered inside a `!controlled &&`
    // conditional branch so the shell's single modal is the only mounted instance.
    expect(src).toMatch(/!controlled\s*&&[\s\S]*<ProfileModal/);
  });
});
