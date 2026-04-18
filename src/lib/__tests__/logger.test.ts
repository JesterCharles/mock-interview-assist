import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('logger', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    process.env = originalEnv;
  });

  it('emits JSON with severity INFO for log.info', async () => {
    const { log } = await import('../logger');
    log.info('test message', { route: '/health' });
    expect(logSpy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(payload.severity).toBe('INFO');
    expect(payload.message).toBe('test message');
    expect(payload.route).toBe('/health');
  });

  it('maps warn -> WARNING (Cloud Logging canonical)', async () => {
    const { log } = await import('../logger');
    log.warn('careful');
    const payload = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(payload.severity).toBe('WARNING');
  });

  it('maps error -> ERROR', async () => {
    const { log } = await import('../logger');
    log.error('oops');
    const payload = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(payload.severity).toBe('ERROR');
  });

  it('maps critical -> CRITICAL', async () => {
    const { log } = await import('../logger');
    log.critical('fire');
    const payload = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(payload.severity).toBe('CRITICAL');
  });

  it('maps debug -> DEBUG', async () => {
    const { log } = await import('../logger');
    log.debug('trace');
    const payload = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(payload.severity).toBe('DEBUG');
  });

  it('resolves env from NLM_ENV first', async () => {
    process.env.NLM_ENV = 'staging';
    vi.resetModules();
    const { log } = await import('../logger');
    log.info('hi');
    const payload = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(payload.env).toBe('staging');
  });

  it('falls back to K_SERVICE when NLM_ENV unset', async () => {
    delete process.env.NLM_ENV;
    process.env.K_SERVICE = 'nlm-staging';
    vi.resetModules();
    const { log } = await import('../logger');
    log.info('hi');
    const payload = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(payload.env).toBe('nlm-staging');
  });

  it('falls back to unknown when neither env var is set', async () => {
    delete process.env.NLM_ENV;
    delete process.env.K_SERVICE;
    vi.resetModules();
    const { log } = await import('../logger');
    log.info('hi');
    const payload = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(payload.env).toBe('unknown');
  });

  it('positional message overrides message key in extras', async () => {
    const { log } = await import('../logger');
    log.info('positional wins', { message: 'loses' } as unknown as Record<string, unknown>);
    const payload = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(payload.message).toBe('positional wins');
  });

  it('never throws on circular reference', async () => {
    const { log } = await import('../logger');
    type Circ = { self?: unknown };
    const circ: Circ = {};
    circ.self = circ;
    expect(() => log.info('circ', { circ })).not.toThrow();
    expect(logSpy).toHaveBeenCalled();
  });

  it('merges extras flat (no nested extra key)', async () => {
    const { log } = await import('../logger');
    log.info('flat', { userId: 'abc', latencyMs: 42 });
    const payload = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(payload.userId).toBe('abc');
    expect(payload.latencyMs).toBe(42);
    expect(payload.extra).toBeUndefined();
  });
});
