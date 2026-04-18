/**
 * scripts/lib/route-discovery.ts — Phase 49 Plan 03 Task 1 (HARD-02, D-09/D-20)
 *
 * Filesystem walk: every src/app/api/** /route.ts → ApiRoute[].
 *
 * Pure-Node (no glob dependency). Deterministic ordering.
 */
import fs from 'node:fs';
import path from 'node:path';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS';

export interface ApiRoute {
  /** Next.js App Router pattern, e.g. "/api/trainer/[slug]". */
  pathPattern: string;
  /** Absolute path to the route.ts file on disk. */
  filePath: string;
  /** HTTP methods parsed from `export (async )? function METHOD(...)`. */
  methods: HttpMethod[];
  /** true iff the pathPattern is legitimately unauthenticated per PUBLIC_ALLOWLIST. */
  isPublic: boolean;
}

/**
 * Hard-coded allowlist of routes that legitimately return 200 unauthenticated.
 * Phase 49 Plan 03 interfaces — keep in sync with middleware.ts.
 */
const PUBLIC_ALLOWLIST: Set<string> = new Set([
  '/api/health',
  '/api/associate/status',
  '/api/public/interview/start',
  '/api/public/interview/agent',
  '/api/public/interview/complete',
  '/api/question-banks',
  '/api/auth',
  '/api/auth/exchange',
  '/api/auth/callback-link',
  '/api/auth/magic-link',
  '/api/auth/reset/request',
  '/api/auth/password-status',
  // GitHub proxy: unauthenticated in scope but rate-limited; not strictly PII-returning.
  '/api/github',
  '/api/load-markdown',
]);

const METHOD_REGEX =
  /export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS)\b/g;

const VALID_METHODS: ReadonlySet<HttpMethod> = new Set<HttpMethod>([
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'OPTIONS',
]);

/**
 * Convert a filesystem path (absolute or repo-relative) to a Next.js App Router
 * URL pattern.
 *
 * Examples:
 *   src/app/api/trainer/[slug]/route.ts → /api/trainer/[slug]
 *   tmp/api/synthetic/route.ts          → /synthetic
 */
function toPathPattern(routeFile: string, rootDir: string): string {
  const absRoot = path.resolve(rootDir);
  const absFile = path.resolve(routeFile);
  // Remove /route.ts from the end.
  const dir = path.dirname(absFile);
  // Strip the rootDir prefix. If rootDir ends with "src/app/api" we want "/api/..." output.
  const rel = path.relative(absRoot, dir).split(path.sep).filter(Boolean);

  // If the rootDir itself looks like "src/app/api", prepend "/api" to preserve public URL form.
  const rootTail = absRoot.split(path.sep).slice(-2).join('/');
  if (rootTail === 'app/api' || absRoot.endsWith(path.join('app', 'api'))) {
    return `/api/${rel.join('/')}`.replace(/\/+$/, '') || '/api';
  }
  // Otherwise (custom rootDir, e.g. tmp/api), output relative path with leading slash.
  return `/${rel.join('/')}`.replace(/\/+$/, '') || '/';
}

function parseMethods(fileText: string): HttpMethod[] {
  const found = new Set<HttpMethod>();
  let m: RegExpExecArray | null;
  METHOD_REGEX.lastIndex = 0;
  while ((m = METHOD_REGEX.exec(fileText)) !== null) {
    const method = m[1] as HttpMethod;
    if (VALID_METHODS.has(method)) {
      found.add(method);
    }
  }
  return Array.from(found).sort();
}

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (entry.isFile() && entry.name === 'route.ts') {
      out.push(full);
    }
  }
  return out;
}

export function discoverApiRoutes(apiDir = 'src/app/api'): ApiRoute[] {
  const absRoot = path.resolve(apiDir);
  const files = walk(absRoot).sort();

  const routes: ApiRoute[] = files.map((filePath) => {
    let text = '';
    try {
      text = fs.readFileSync(filePath, 'utf8');
    } catch {
      // Non-readable — skip methods parse, log nothing (deterministic discovery only).
    }
    const methods = parseMethods(text);
    const pathPattern = toPathPattern(filePath, absRoot);
    const isPublic = PUBLIC_ALLOWLIST.has(pathPattern);
    return { pathPattern, filePath, methods, isPublic };
  });

  // Deterministic order: alphabetical by pathPattern.
  routes.sort((a, b) => a.pathPattern.localeCompare(b.pathPattern));
  return routes;
}
