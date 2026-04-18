/**
 * codingApiErrors.ts
 *
 * Phase 39 Plan 03 Task 1. Shared error envelope for /api/coding/* routes.
 *
 * One helper, one typed code union, one consistent shape:
 *   { error: { code: CodingApiErrorCode; message: string; details?: unknown } }
 *
 * RATE_LIMITED adds a `Retry-After` header. Error-instance details are
 * sanitized to prevent stack-trace leakage.
 */

import { NextResponse } from 'next/server';

export const CODING_API_ERROR_CODES = {
  AUTH_REQUIRED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  LANGUAGE_NOT_SUPPORTED: 400,
  RATE_LIMITED: 429,
  JUDGE0_UNAVAILABLE: 503,
  INTERNAL: 500,
} as const;

export type CodingApiErrorCode = keyof typeof CODING_API_ERROR_CODES;

export interface CodingApiErrorOptions {
  retryAfterSeconds?: number;
}

function sanitizeDetails(details: unknown): unknown {
  if (details instanceof Error) {
    // Strip stack trace — log elsewhere, not on the wire
    return { name: details.name, message: details.message };
  }
  return details;
}

export function codingApiError(
  code: CodingApiErrorCode,
  message: string,
  details?: unknown,
  options: CodingApiErrorOptions = {},
): NextResponse {
  const status = CODING_API_ERROR_CODES[code];
  const body: { error: { code: string; message: string; details?: unknown } } = {
    error: { code, message },
  };
  if (details !== undefined) {
    body.error.details = sanitizeDetails(details);
  }
  const headers: Record<string, string> = {};
  if (code === 'RATE_LIMITED' && options.retryAfterSeconds !== undefined) {
    headers['Retry-After'] = String(Math.ceil(options.retryAfterSeconds));
  }
  return NextResponse.json(body, { status, headers });
}
