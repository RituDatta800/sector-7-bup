'use client';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { SERIES, type SeriesSpec } from './series';

function Swatch({ spec }: { spec: SeriesSpec }) {
  if (spec.shape === 'line') {
    return (
      <span
        aria-hidden
        className="h-0.5 w-3.5 shrink-0 rounded-full"
        style={{ background: spec.color }}
      />
    );
  }

  if (spec.shape === 'area') {
    return (
      <span
        aria-hidden
        className="h-2.5 w-3.5 shrink-0 rounded-[2px] border-t-2"
        style={{
          borderTopColor: spec.color,
          background: `color-mix(in oklab, ${spec.color} 22%, transparent)`,
        }}
      />
    );
  }

  return (
    <span
      aria-hidden
      className="h-3 w-2 shrink-0 rounded-[2px]"
      style={{ background: spec.color }}
    />
  );
}

/**
 * Always rendered: with five series on the plot, identity can never rest on
 * colour alone. Hovering a legend entry explains what the mark represents.
 */
export function ChartLegend({ className }: { className?: string }) {
  return (
    <ul className={cn('flex flex-wrap items-center gap-x-4 gap-y-1.5', className)}>
      {SERIES.map((spec) => (
        <li key={spec.key}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-muted-foreground hover:text-foreground flex cursor-help items-center gap-1.5 text-[11px] leading-4 transition-colors">
                <Swatch spec={spec} />
                {spec.label}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top">{spec.hint}</TooltipContent>
          </Tooltip>
        </li>
      ))}
    </ul>
  );
}
