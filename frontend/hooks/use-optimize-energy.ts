'use client';

import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { optimizeEnergy } from '@/lib/api';
import type { OptimizeEnergyRequest, OptimizeEnergyResponse } from '@/lib/schemas';

export interface OptimizeVariables {
  payload: OptimizeEnergyRequest;
}

export type OptimizeMutation = UseMutationResult<
  OptimizeEnergyResponse,
  unknown,
  OptimizeVariables
>;

interface Options {
  onSuccess?: (response: OptimizeEnergyResponse, variables: OptimizeVariables) => void;
  onError?: (error: unknown) => void;
}

export function useOptimizeEnergy(options: Options = {}): OptimizeMutation {
  return useMutation<OptimizeEnergyResponse, unknown, OptimizeVariables>({
    mutationKey: ['optimize-energy'],
    mutationFn: ({ payload }) => optimizeEnergy(payload),
    retry: false,
    onSuccess: options.onSuccess,
    onError: options.onError,
  });
}
