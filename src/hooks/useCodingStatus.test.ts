// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCodingStatus, resetCodingStatusCache } from './useCodingStatus';

describe('useCodingStatus', () => {
  beforeEach(() => {
    resetCodingStatusCache();
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts in loading state', () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ enabled: true }),
    } as Response);
    const { result } = renderHook(() => useCodingStatus());
    expect(result.current.status).toBe('loading');
  });

  it('resolves to enabled:true when endpoint says so', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ enabled: true }),
    } as Response);
    const { result } = renderHook(() => useCodingStatus());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.enabled).toBe(true);
  });

  it('resolves to enabled:false when endpoint says so', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ enabled: false }),
    } as Response);
    const { result } = renderHook(() => useCodingStatus());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.enabled).toBe(false);
  });

  it('returns error state on network failure (fail-open)', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('boom'),
    );
    const { result } = renderHook(() => useCodingStatus());
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.enabled).toBeNull();
  });

  it('caches across remounts within TTL', async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ enabled: true }),
    } as Response);
    const first = renderHook(() => useCodingStatus());
    await waitFor(() => expect(first.result.current.status).toBe('ready'));
    first.unmount();
    const second = renderHook(() => useCodingStatus());
    await waitFor(() => expect(second.result.current.status).toBe('ready'));
    // Only one fetch across the two mounts — second used cache.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
