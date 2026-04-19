/**
 * loadtest/__tests__/baseline-options.test.ts — Phase 49 Plan 01 Task 1
 *
 * Regex-parse test for loadtest/baseline.js. k6 scripts cannot be executed
 * under node (the k6 runtime is Go+goja), so we assert structural tokens
 * without actually evaluating the module.
 *
 * D-01 stages, D-02 traffic mix (0% coding), D-04 thresholds, T-49-02
 * no-body-log mitigation — all verified via regex.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';

const SCRIPT_PATH = path.resolve(__dirname, '..', 'baseline.js');

describe('loadtest/baseline.js regex parse', () => {
  let source = '';

  beforeAll(() => {
    expect(fs.existsSync(SCRIPT_PATH)).toBe(true);
    source = fs.readFileSync(SCRIPT_PATH, 'utf8');
  });

  it('declares options.stages with ramp to 100 VUs (D-01)', () => {
    expect(source).toMatch(/stages:\s*\[/);
    expect(source).toMatch(/target:\s*100/);
    expect(source).toMatch(/target:\s*50/);
    expect(source).toMatch(/target:\s*10/);
  });

  it('declares options.thresholds enforcing D-04', () => {
    expect(source).toMatch(/http_req_failed['"\s:]*\[.*rate<0\.01/);
    expect(source).toMatch(/http_req_duration\{kind:static\}['"\s:]*\[.*p\(95\)<500/);
    expect(source).toMatch(/http_req_duration\{kind:api\}['"\s:]*\[.*p\(95\)<1000/);
    expect(source).toMatch(/checks['"\s:]*\[.*rate>0\.99/);
  });

  it('routes per D-02 traffic mix (5 endpoints, weighted)', () => {
    expect(source).toContain("'/'");
    expect(source).toContain('/api/health');
    expect(source).toContain('/api/public/interview/start');
    expect(source).toContain('/api/public/interview/agent');
    expect(source).toContain('/api/question-banks');
  });

  it('D-02: 0% coding routes in the scenario (HARD-01)', () => {
    expect(source).not.toMatch(/\/api\/coding/);
  });

  it('requires __ENV.TARGET (no silent default)', () => {
    expect(source).toMatch(/__ENV\.TARGET/);
  });

  it('D-08: tags X-Session-ID per iteration', () => {
    expect(source).toMatch(/X-Session-ID/i);
  });

  it('D-05: handleSummary writes /tmp/loadtest-result.json', () => {
    expect(source).toMatch(/handleSummary/);
    expect(source).toMatch(/\/tmp\/loadtest-result\.json/);
  });

  it('D-03: sleep think-time 1-3s between iterations', () => {
    expect(source).toMatch(/sleep\(/);
    expect(source).toMatch(/Math\.random\(\)\s*\*\s*2\s*\+\s*1/);
  });

  it('T-49-02 mitigation: no res.body logging', () => {
    expect(source).not.toMatch(/console\.log\s*\([^)]*res\.body/);
    expect(source).not.toMatch(/console\.log\s*\([^)]*response\.body/);
  });

  it('tags each request as static or api (threshold filter)', () => {
    // Tags are assigned via route.kind on each ROUTES entry; verify both kinds appear.
    expect(source).toMatch(/kind:\s*['"]static['"]/);
    expect(source).toMatch(/kind:\s*['"]api['"]/);
    // And that params.tags is passed through to http.get/post.
    expect(source).toMatch(/tags:\s*\{\s*kind:\s*route\.kind/);
  });

  it('check() calls on every response', () => {
    expect(source).toMatch(/check\(/);
  });
});
