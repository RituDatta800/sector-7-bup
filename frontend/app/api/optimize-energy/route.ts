/**
 * Server-side proxy to the GridWise NestJS service.
 *
 * Keeps the upstream URL out of the browser bundle, sidesteps CORS entirely,
 * and normalises transport failures into a single error envelope the client
 * can render. It does not reshape successful responses — the body is passed
 * through verbatim so the client validates the real contract.
 */

import { NextResponse } from 'next/server';
import { optimizeEnergyRequestSchema } from '@/lib/schemas';

export const dynamic = 'force-dynamic';

const UPSTREAM_BASE_URL = process.env.GRIDWISE_API_BASE_URL ?? 'http://localhost:3000';
const TIMEOUT_MS = Number(process.env.GRIDWISE_API_TIMEOUT_MS ?? 45_000);

export interface ApiErrorBody {
  error: string;
  message: string;
  detail?: string;
}

function errorResponse(status: number, error: string, message: string, detail?: string) {
  return NextResponse.json<ApiErrorBody>({ error, message, detail }, { status });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return errorResponse(400, 'invalid_json', 'The request body was not valid JSON.');
  }

  const parsed = optimizeEnergyRequestSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(
      400,
      'invalid_request',
      'The scenario does not satisfy the /optimize-energy contract.',
      parsed.error.issues
        .slice(0, 5)
        .map((issue) => `${issue.path.join('.') || 'payload'}: ${issue.message}`)
        .join('; '),
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const upstream = await fetch(`${UPSTREAM_BASE_URL}/optimize-energy`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(parsed.data),
      signal: controller.signal,
      cache: 'no-store',
    });

    const text = await upstream.text();

    if (!upstream.ok) {
      return errorResponse(
        upstream.status,
        'upstream_error',
        `The optimizer returned ${upstream.status} ${upstream.statusText}.`,
        text.slice(0, 600),
      );
    }

    return new NextResponse(text, {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError';

    if (aborted) {
      return errorResponse(
        504,
        'upstream_timeout',
        `The optimizer did not respond within ${Math.round(TIMEOUT_MS / 1000)}s.`,
        'Note interpretation calls an LLM; raise GRIDWISE_API_TIMEOUT_MS if this is expected.',
      );
    }

    return errorResponse(
      502,
      'upstream_unreachable',
      `Could not reach the optimizer at ${UPSTREAM_BASE_URL}.`,
      error instanceof Error ? error.message : String(error),
    );
  } finally {
    clearTimeout(timeout);
  }
}
