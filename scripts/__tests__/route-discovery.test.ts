/**
 * scripts/__tests__/route-discovery.test.ts — Phase 49 Plan 03 Task 1
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { discoverApiRoutes, type ApiRoute } from '../lib/route-discovery';

const TMP_DIR = path.resolve(__dirname, '..', '..', 'tmp', 'api');

describe('discoverApiRoutes', () => {
  afterEach(() => {
    // Clean up fixture directories.
    if (fs.existsSync(path.resolve(__dirname, '..', '..', 'tmp'))) {
      fs.rmSync(path.resolve(__dirname, '..', '..', 'tmp'), { recursive: true, force: true });
    }
  });

  it('(a) discovers all route.ts files under src/app/api', () => {
    const discovered = discoverApiRoutes();
    const fsCount = parseInt(
      execSync('find src/app/api -name route.ts | wc -l').toString().trim(),
      10,
    );
    expect(discovered.length).toBe(fsCount);
    expect(fsCount).toBeGreaterThan(40);
  });

  it('(b) /api/health is marked public and has GET method', () => {
    const routes = discoverApiRoutes();
    const health = routes.find((r: ApiRoute) => r.pathPattern === '/api/health');
    expect(health).toBeDefined();
    expect(health!.isPublic).toBe(true);
    expect(health!.methods).toContain('GET');
  });

  it('(c) /api/trainer/[slug] is marked protected and has GET', () => {
    const routes = discoverApiRoutes();
    const trainer = routes.find((r: ApiRoute) => r.pathPattern === '/api/trainer/[slug]');
    expect(trainer).toBeDefined();
    expect(trainer!.isPublic).toBe(false);
    expect(trainer!.methods).toContain('GET');
  });

  it('(d) /api/cohorts/[id]/curriculum/[weekId] preserves nested dynamic segments', () => {
    const routes = discoverApiRoutes();
    const week = routes.find(
      (r: ApiRoute) => r.pathPattern === '/api/cohorts/[id]/curriculum/[weekId]',
    );
    expect(week).toBeDefined();
    expect(week!.isPublic).toBe(false);
  });

  it('(e) discovers a synthetic fixture route when pointed at tmp/api', () => {
    fs.mkdirSync(path.join(TMP_DIR, 'synthetic'), { recursive: true });
    fs.writeFileSync(
      path.join(TMP_DIR, 'synthetic', 'route.ts'),
      `export async function GET() { return new Response(''); }\nexport async function POST() { return new Response(''); }\n`,
    );
    const routes = discoverApiRoutes(TMP_DIR);
    const syn = routes.find((r: ApiRoute) => r.pathPattern === '/synthetic');
    expect(syn).toBeDefined();
    expect(syn!.methods).toEqual(['GET', 'POST']);
  });
});
