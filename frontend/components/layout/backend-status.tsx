'use client';

import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface HealthPayload {
  reachable: boolean;
  status?: number;
  target: string;
  detail?: string;
}

/** Live reachability of the NestJS optimizer, polled through the local proxy. */
export function BackendStatus() {
  const { data, isPending, isError } = useQuery<HealthPayload>({
    queryKey: ['backend-health'],
    queryFn: async () => (await axios.get<HealthPayload>('/api/health')).data,
    refetchInterval: 30_000,
    staleTime: 15_000,
    retry: 1,
  });

  const reachable = data?.reachable === true;
  const label = isPending ? 'Checking optimizer…' : reachable ? 'Optimizer online' : 'Optimizer offline';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="text-muted-foreground flex cursor-help items-center gap-1.5 text-[11px]">
          <span className="relative flex size-1.5">
            {reachable ? (
              <span
                className="absolute inline-flex size-full animate-ping rounded-full opacity-60"
                style={{ background: 'var(--status-good)' }}
              />
            ) : null}
            <span
              className={cn('relative inline-flex size-1.5 rounded-full')}
              style={{
                background: isPending
                  ? 'var(--subtle-foreground)'
                  : reachable
                    ? 'var(--status-good)'
                    : 'var(--status-critical)',
              }}
            />
          </span>
          <span className="hidden sm:inline">{label}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-64">
        {isError
          ? 'The health probe itself failed.'
          : reachable
            ? `Reachable at ${data?.target}`
            : `No response from ${data?.target ?? 'the configured backend'}. Start the NestJS service, or point GRIDWISE_API_BASE_URL elsewhere.`}
      </TooltipContent>
    </Tooltip>
  );
}
