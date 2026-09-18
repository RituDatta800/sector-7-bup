/**
 * Typed client for the optimize-energy endpoint.
 *
 * Every response is validated against the contract before it reaches the UI,
 * so a backend that drifts surfaces as a clear error rather than as blank
 * cards and NaN axes.
 */

import axios, { AxiosError } from 'axios';
import { ZodError } from 'zod';
import {
  optimizeEnergyResponseSchema,
  type OptimizeEnergyRequest,
  type OptimizeEnergyResponse,
} from '@/lib/schemas';

export type ApiErrorKind =
  | 'invalid_request'
  | 'contract_mismatch'
  | 'upstream_error'
  | 'upstream_unreachable'
  | 'upstream_timeout'
  | 'unknown';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  readonly detail?: string;

  constructor(kind: ApiErrorKind, message: string, options?: { status?: number; detail?: string }) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = options?.status;
    this.detail = options?.detail;
  }
}

const client = axios.create({
  baseURL: '/api',
  headers: { 'content-type': 'application/json' },
  timeout: 60_000,
});

interface ErrorEnvelope {
  error?: string;
  message?: string;
  detail?: string;
}

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (error instanceof ZodError) {
    return new ApiError(
      'contract_mismatch',
      'The optimizer replied with a body that does not match the API contract.',
      {
        detail: error.issues
          .slice(0, 5)
          .map((issue) => `${issue.path.join('.') || 'response'}: ${issue.message}`)
          .join('; '),
      },
    );
  }

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ErrorEnvelope>;
    const envelope = axiosError.response?.data;
    const kind = (envelope?.error as ApiErrorKind | undefined) ?? 'unknown';

    if (axiosError.code === 'ECONNABORTED') {
      return new ApiError('upstream_timeout', 'The request timed out before the optimizer replied.');
    }

    return new ApiError(
      kind,
      envelope?.message ?? axiosError.message ?? 'The optimizer request failed.',
      { status: axiosError.response?.status, detail: envelope?.detail },
    );
  }

  return new ApiError('unknown', error instanceof Error ? error.message : String(error));
}

export async function optimizeEnergy(
  payload: OptimizeEnergyRequest,
  signal?: AbortSignal,
): Promise<OptimizeEnergyResponse> {
  try {
    const { data } = await client.post<unknown>('/optimize-energy', payload, { signal });
    return optimizeEnergyResponseSchema.parse(data);
  } catch (error) {
    throw toApiError(error);
  }
}

/** Human-facing headline for a failure, used by the toast and the error card. */
export function describeError(error: unknown): { title: string; description: string } {
  const apiError = toApiError(error);

  const titles: Record<ApiErrorKind, string> = {
    invalid_request: 'Scenario rejected',
    contract_mismatch: 'Unexpected response shape',
    upstream_error: 'Optimizer returned an error',
    upstream_unreachable: 'Optimizer unreachable',
    upstream_timeout: 'Optimizer timed out',
    unknown: 'Optimization failed',
  };

  return {
    title: titles[apiError.kind],
    description: apiError.detail ? `${apiError.message} — ${apiError.detail}` : apiError.message,
  };
}
