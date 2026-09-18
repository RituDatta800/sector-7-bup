'use client';

import { motion } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { PlanTotals } from '@/lib/chart-data';
import { formatBdt, formatKwh, formatPercent } from '@/lib/format';
import { revealVariants } from '@/components/motion/variants';
import { cn } from '@/lib/utils';

type Direction = 'lower-is-better' | 'higher-is-better';

interface StatSpec {
  id: string;
  label: string;
  value: string;
  raw: number;
  baseline: number;
  direction: Direction;
  format: (value: number) => string;
  hint: string;
  hero?: boolean;
}

function DeltaBadge({
  current,
  baseline,
  direction,
  format,
}: {
  current: number;
  baseline: number;
  direction: Direction;
  format: (value: number) => string;
}) {
  const delta = current - baseline;
  const pct = baseline !== 0 ? (delta / Math.abs(baseline)) * 100 : 0;

  if (Math.abs(pct) < 0.05) {
    return (
      <span className="text-subtle-foreground flex items-center gap-1 text-[11px]">
        <Minus className="size-3" />
        Unchanged vs baseline
      </span>
    );
  }

  const improved = direction === 'lower-is-better' ? delta < 0 : delta > 0;
  const Icon: LucideIcon = delta < 0 ? ArrowDownRight : ArrowUpRight;

  // Wording follows the direction the number actually moved. "Saved" is only
  // right for a cost-like measure that fell; a metric that dropped is "below
  // baseline", never "above" it.
  const caption =
    direction === 'lower-is-better' && delta < 0
      ? 'saved vs baseline'
      : delta < 0
        ? 'below baseline'
        : 'above baseline';

  return (
    <span
      className="flex items-center gap-1 text-[11px] font-medium"
      style={{ color: improved ? 'var(--status-good)' : 'var(--status-serious)' }}
    >
      <Icon className="size-3" aria-hidden />
      {format(Math.abs(delta))}
      <span className="tabular font-normal opacity-80">({formatPercent(Math.abs(pct), 1)})</span>
      <span className="text-subtle-foreground font-normal">{caption}</span>
    </span>
  );
}

/**
 * The headline read on the solve. Every figure is stated against the baseline
 * dispatch (solar first, battery idle), because "৳48,200" only means something
 * next to what the day would otherwise have cost.
 */
export function SummaryStats({
  optimized,
  baseline,
  className,
}: {
  optimized: PlanTotals;
  baseline: PlanTotals;
  className?: string;
}) {
  const stats: StatSpec[] = [
    {
      id: 'cost',
      label: 'Total cost',
      value: formatBdt(optimized.totalCostBdt),
      raw: optimized.totalCostBdt,
      baseline: baseline.totalCostBdt,
      direction: 'lower-is-better',
      format: formatBdt,
      hint: 'Sum of grid import × the tariff in force that hour, across all 24 hours.',
      hero: true,
    },
    {
      id: 'grid',
      label: 'Grid import',
      value: formatKwh(optimized.totalGridKwh),
      raw: optimized.totalGridKwh,
      baseline: baseline.totalGridKwh,
      direction: 'lower-is-better',
      format: formatKwh,
      hint: 'Total energy bought from the utility over the day.',
    },
    {
      id: 'peak',
      label: 'Peak grid hour',
      value: formatKwh(optimized.peakGridKwh),
      raw: optimized.peakGridKwh,
      baseline: baseline.peakGridKwh,
      direction: 'lower-is-better',
      format: formatKwh,
      hint: 'The single highest hour of grid import — what demand charges are set against.',
    },
    {
      id: 'self',
      label: 'Self-sufficiency',
      value: formatPercent(optimized.selfSufficiencyPct),
      raw: optimized.selfSufficiencyPct,
      baseline: baseline.selfSufficiencyPct,
      direction: 'higher-is-better',
      format: (value) => formatPercent(value),
      hint: 'Share of campus demand met from solar and the battery instead of the grid.',
    },
  ];

  return (
    <div className={cn('grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4', className)}>
      {stats.map((stat) => (
        <motion.div key={stat.id} variants={revealVariants}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="h-full cursor-help justify-between gap-3 p-4">
                <span className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                  {stat.label}
                </span>
                <span
                  className={cn(
                    'leading-none font-semibold tracking-tight',
                    stat.hero ? 'text-[2rem]' : 'text-2xl',
                  )}
                >
                  {stat.value}
                </span>
                <DeltaBadge
                  current={stat.raw}
                  baseline={stat.baseline}
                  direction={stat.direction}
                  format={stat.format}
                />
              </Card>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-64">
              {stat.hint}
            </TooltipContent>
          </Tooltip>
        </motion.div>
      ))}
    </div>
  );
}
