'use client';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { ChartRow } from '@/lib/chart-data';
import { formatTariff, hourRangeLabel } from '@/lib/format';
import { cn } from '@/lib/utils';
import { PLOT_LEFT_GUTTER, PLOT_RIGHT_GUTTER } from './series';

/** Seven steps of a single hue, light → dark. A sequential scale, never a rainbow. */
const RAMP = [
  'var(--ramp-1)',
  'var(--ramp-2)',
  'var(--ramp-3)',
  'var(--ramp-4)',
  'var(--ramp-5)',
  'var(--ramp-6)',
  'var(--ramp-7)',
] as const;

function rampStep(value: number, min: number, max: number): string {
  if (max <= min) return RAMP[3]!;
  const ratio = (value - min) / (max - min);
  const index = Math.min(RAMP.length - 1, Math.max(0, Math.round(ratio * (RAMP.length - 1))));
  return RAMP[index]!;
}

/**
 * Tariff lives here rather than on a second y-axis inside the plot: two scales
 * on one pair of axes invents a correlation the data does not contain. This is
 * a separate encoding with its own scale legend, aligned hour-for-hour to the
 * chart above it.
 */
export function TariffRibbon({
  rows,
  className,
}: {
  rows: readonly ChartRow[];
  className?: string;
}) {
  if (rows.length === 0) return null;

  const tariffs = rows.map((row) => row.tariff_bdt_per_kwh);
  const min = Math.min(...tariffs);
  const max = Math.max(...tariffs);

  return (
    <div className={cn('select-none', className)}>
      <div
        className="flex items-center justify-between gap-4 pb-1.5"
        style={{ paddingLeft: PLOT_LEFT_GUTTER, paddingRight: PLOT_RIGHT_GUTTER }}
      >
        <span className="text-subtle-foreground text-[10px] font-medium tracking-wide uppercase">
          Tariff
        </span>
        <span className="text-subtle-foreground flex items-center gap-1.5 text-[10px]">
          <span className="tabular">{formatTariff(min)}</span>
          <span aria-hidden className="flex">
            {RAMP.map((step) => (
              <span key={step} className="h-2 w-2.5" style={{ background: step }} />
            ))}
          </span>
          <span className="tabular">{formatTariff(max)}</span>
        </span>
      </div>

      <div
        className="grid gap-[2px]"
        style={{
          gridTemplateColumns: `repeat(${rows.length}, minmax(0, 1fr))`,
          paddingLeft: PLOT_LEFT_GUTTER,
          paddingRight: PLOT_RIGHT_GUTTER,
        }}
      >
        {rows.map((row) => (
          <Tooltip key={row.hour}>
            <TooltipTrigger asChild>
              <div
                className="focus-visible:ring-ring h-2.5 cursor-help rounded-[2px] outline-none focus-visible:ring-2"
                tabIndex={0}
                style={{ background: rampStep(row.tariff_bdt_per_kwh, min, max) }}
                aria-label={`${hourRangeLabel(row.hour)}: ${formatTariff(row.tariff_bdt_per_kwh)}`}
              />
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <span className="tabular">
                {hourRangeLabel(row.hour)} · {formatTariff(row.tariff_bdt_per_kwh)}
              </span>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}
