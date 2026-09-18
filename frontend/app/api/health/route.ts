/** Connectivity probe for the header indicator. Proxies the backend's /health. */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const UPSTREAM_BASE_URL = process.env.GRIDWISE_API_BASE_URL ?? 'http://localhost:3000';

export async function GET() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    const upstream = await fetch(`${UPSTREAM_BASE_URL}/health`, {
      signal: controller.signal,
      cache: 'no-store',
    });

    return NextResponse.json({
      reachable: upstream.ok,
      status: upstream.status,
      target: UPSTREAM_BASE_URL,
    });
  } catch (error) {
    return NextResponse.json({
      reachable: false,
      target: UPSTREAM_BASE_URL,
      detail: error instanceof Error ? error.message : String(error),
    });
  } finally {
    clearTimeout(timeout);
  }
}
