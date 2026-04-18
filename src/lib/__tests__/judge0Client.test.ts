import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Import lazily per-test via dynamic import so env stubs take effect before module eval.
async function loadClient() {
  return await import('../judge0Client');
}

async function loadErrors() {
  return await import('../judge0Errors');
}

const BASE_URL = 'http://judge0-server:2358';
const TOKEN = 'test-token-xyz';

function mockFetchOnce(response: Partial<Response> & { jsonBody?: unknown; textBody?: string }) {
  const res = {
    ok: (response.status ?? 200) < 400,
    status: response.status ?? 200,
    json: vi.fn().mockResolvedValue(response.jsonBody ?? {}),
    text: vi.fn().mockResolvedValue(response.textBody ?? ''),
  } as unknown as Response;
  (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(res);
}

function mockFetchReject(err: unknown) {
  (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(err);
}

describe('judge0Client', () => {
  beforeEach(() => {
    vi.stubEnv('JUDGE0_URL', BASE_URL);
    vi.stubEnv('JUDGE0_AUTH_TOKEN', TOKEN);
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ---------- 1. Language map completeness ----------
  it('JUDGE0_LANGUAGE_MAP has exactly 6 entries matching the type union', async () => {
    const { JUDGE0_LANGUAGE_MAP } = await loadClient();
    const keys = Object.keys(JUDGE0_LANGUAGE_MAP).sort();
    expect(keys).toEqual(['csharp', 'java', 'javascript', 'python', 'sql', 'typescript']);
  });

  // ---------- 2. Env guard at call time ----------
  it('submit() throws Judge0ConfigError when JUDGE0_URL is unset', async () => {
    vi.stubEnv('JUDGE0_URL', '');
    const { submit } = await loadClient();
    const { Judge0ConfigError } = await loadErrors();
    await expect(
      submit({ sourceCode: 'x', language: 'python', stdin: '' }),
    ).rejects.toBeInstanceOf(Judge0ConfigError);
  });

  it('submit() throws Judge0ConfigError when JUDGE0_AUTH_TOKEN is unset', async () => {
    vi.stubEnv('JUDGE0_AUTH_TOKEN', '');
    const { submit } = await loadClient();
    const { Judge0ConfigError } = await loadErrors();
    await expect(
      submit({ sourceCode: 'x', language: 'python', stdin: '' }),
    ).rejects.toBeInstanceOf(Judge0ConfigError);
  });

  // ---------- 3. Unsupported language ----------
  it('submit() throws UnsupportedLanguageError for unknown language', async () => {
    const { submit } = await loadClient();
    const { UnsupportedLanguageError } = await loadErrors();
    await expect(
      submit({ sourceCode: 'x', language: 'cobol' as never, stdin: '' }),
    ).rejects.toBeInstanceOf(UnsupportedLanguageError);
  });

  // ---------- 4. Submit happy path ----------
  it('submit() POSTs with X-Auth-Token + Content-Type and returns token', async () => {
    mockFetchOnce({ status: 201, jsonBody: { token: 'abc-123' } });
    const { submit } = await loadClient();
    const out = await submit({
      sourceCode: 'print(1)',
      language: 'python',
      stdin: '',
      expectedStdout: '1\n',
    });
    expect(out).toEqual({ token: 'abc-123' });
    const [, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(init.method).toBe('POST');
    const headers = init.headers as Record<string, string>;
    expect(headers['X-Auth-Token']).toBe(TOKEN);
    expect(headers['Content-Type']).toBe('application/json');
    const body = JSON.parse(init.body);
    expect(body.source_code).toBe('print(1)');
    expect(body.language_id).toBe(71); // python
    expect(body.stdin).toBe('');
    expect(body.expected_output).toBe('1\n');
  });

  // ---------- 5. No wait=true ever ----------
  it('submit() URL never contains wait=true', async () => {
    mockFetchOnce({ status: 201, jsonBody: { token: 'w1' } });
    const { submit } = await loadClient();
    await submit({ sourceCode: 'x', language: 'python', stdin: '' });
    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(url)).not.toContain('wait=true');
  });

  // ---------- 6. Retry on 5xx ----------
  it('submit() retries once on 5xx and succeeds with 2 fetch calls + 1s backoff', async () => {
    mockFetchOnce({ status: 503 });
    mockFetchOnce({ status: 201, jsonBody: { token: 'retry-ok' } });
    const { submit } = await loadClient();
    const startMs = Date.now();
    const result = await submit({ sourceCode: 'x', language: 'python', stdin: '' });
    const elapsed = Date.now() - startMs;
    expect(result).toEqual({ token: 'retry-ok' });
    expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(2);
    expect(elapsed).toBeGreaterThanOrEqual(900); // ~1s backoff
  });

  // ---------- 7. No retry on 4xx ----------
  it('submit() does NOT retry on 4xx', async () => {
    mockFetchOnce({ status: 400, textBody: 'bad request' });
    const { submit } = await loadClient();
    const { Judge0UnavailableError } = await loadErrors();
    await expect(
      submit({ sourceCode: 'x', language: 'python', stdin: '' }),
    ).rejects.toBeInstanceOf(Judge0UnavailableError);
    expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });

  // ---------- 7b. WR-02: 4xx body truncated at 500 chars ----------
  it('submit() truncates oversize 4xx response body to 500 chars with marker', async () => {
    const huge = 'X'.repeat(2000);
    mockFetchOnce({ status: 400, textBody: huge });
    const { submit } = await loadClient();
    try {
      await submit({ sourceCode: 'x', language: 'python', stdin: '' });
      throw new Error('expected throw');
    } catch (err) {
      // Response body is surfaced on `cause` for logging — MUST be bounded.
      const cause = String((err as { cause?: unknown }).cause ?? '');
      // Full 2000-char body must NOT appear verbatim.
      expect(cause).not.toContain(huge);
      // Must contain truncation marker.
      expect(cause).toMatch(/\[truncated\]/i);
      // Total cause length must be bounded (500 body + envelope overhead).
      expect(cause.length).toBeLessThan(700);
    }
  });

  it('getSubmission() truncates oversize 4xx response body to 500 chars with marker', async () => {
    const huge = 'Y'.repeat(1500);
    mockFetchOnce({ status: 404, textBody: huge });
    const { getSubmission } = await loadClient();
    try {
      await getSubmission('nope');
      throw new Error('expected throw');
    } catch (err) {
      const cause = String((err as { cause?: unknown }).cause ?? '');
      expect(cause).not.toContain(huge);
      expect(cause).toMatch(/\[truncated\]/i);
      expect(cause.length).toBeLessThan(700);
    }
  });

  it('submit() does NOT truncate when 4xx body is already short', async () => {
    mockFetchOnce({ status: 400, textBody: 'bad request' });
    const { submit } = await loadClient();
    try {
      await submit({ sourceCode: 'x', language: 'python', stdin: '' });
      throw new Error('expected throw');
    } catch (err) {
      const cause = String((err as { cause?: unknown }).cause ?? '');
      expect(cause).toContain('bad request');
      expect(cause).not.toMatch(/\[truncated\]/i);
    }
  });

  // ---------- 8. Retry on timeout/AbortError ----------
  it('submit() retries once on AbortError and succeeds', async () => {
    const abortErr = Object.assign(new Error('aborted'), { name: 'AbortError' });
    mockFetchReject(abortErr);
    mockFetchOnce({ status: 201, jsonBody: { token: 'ok-after-timeout' } });
    const { submit } = await loadClient();
    const out = await submit({ sourceCode: 'x', language: 'python', stdin: '' });
    expect(out).toEqual({ token: 'ok-after-timeout' });
    expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(2);
  });

  // ---------- 9. Failure after retry ----------
  it('submit() throws Judge0UnavailableError after 2 consecutive 5xx', async () => {
    mockFetchOnce({ status: 503 });
    mockFetchOnce({ status: 502 });
    const { submit } = await loadClient();
    const { Judge0UnavailableError } = await loadErrors();
    await expect(
      submit({ sourceCode: 'x', language: 'python', stdin: '' }),
    ).rejects.toBeInstanceOf(Judge0UnavailableError);
    expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(2);
  });

  // ---------- 10. getSubmission happy path ----------
  it('getSubmission() GETs with X-Auth-Token and returns parsed JSON', async () => {
    const submission = {
      token: 'abc',
      stdout: '1\n',
      stderr: null,
      compile_output: null,
      message: null,
      status: { id: 3, description: 'Accepted' },
      time: '0.01',
      memory: 1024,
      exit_code: 0,
    };
    mockFetchOnce({ status: 200, jsonBody: submission });
    const { getSubmission } = await loadClient();
    const out = await getSubmission('abc');
    expect(out).toEqual(submission);
    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(url)).toContain('/submissions/abc');
    const headers = init.headers as Record<string, string>;
    expect(headers['X-Auth-Token']).toBe(TOKEN);
  });

  // ---------- 11. systemInfo happy path ----------
  it('systemInfo() GETs /system_info with X-Auth-Token and returns parsed body', async () => {
    mockFetchOnce({ status: 200, jsonBody: { version: '1.13.1' } });
    const { systemInfo } = await loadClient();
    const info = await systemInfo(2000);
    expect(info.version).toBe('1.13.1');
    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(url)).toContain('/system_info');
    const headers = init.headers as Record<string, string>;
    expect(headers['X-Auth-Token']).toBe(TOKEN);
  });

  // ---------- 12. systemInfo timeout → Judge0UnavailableError, no retry ----------
  it('systemInfo() wraps fetch error in Judge0UnavailableError and does NOT retry', async () => {
    const abortErr = Object.assign(new Error('aborted'), { name: 'AbortError' });
    mockFetchReject(abortErr);
    const { systemInfo } = await loadClient();
    const { Judge0UnavailableError } = await loadErrors();
    await expect(systemInfo(50)).rejects.toBeInstanceOf(Judge0UnavailableError);
    expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });
});
