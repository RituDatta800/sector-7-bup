'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Activity, GitCompareArrows } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ChartRow, DirectiveWindow } from '@/lib/chart-data';
import { cn } from '@/lib/utils';
import {
  CHART_PLOT_HEIGHT,
  SPRING_SOFT,
  SWING_KEYFRAMES,
  swingTransition,
  type Stage,
} from '@/components/motion/variants';
import { ChartLegend } from './chart-legend';
import { DirectiveRail } from './directive-rail';
import { EnergyChart } from './energy-chart';
import { TariffRibbon } from './tariff-ribbon';

export type ChartView = 'optimized' | 'baseline';

export interface ChartStageProps {
  stage: Stage;
  scenarioId: string;
  /** Rows currently plotted. Swapping this array is what animates the marks. */
  rows: readonly ChartRow[];
  baselineRows: readonly ChartRow[];
  directiveWindows: readonly DirectiveWindow[];
  capacityKwh: number;
  yDomain: [number, number];
  hasResult: boolean;
  view: ChartView;
  onViewChange: (view: ChartView) => void;
  /** Tween length for the marks, forwarded to the plot. */
  animationMs: number;
}

/**
 * The one element that survives the whole flow.
 *
 * On submit it swings upward and settles into a shorter, pinned header chart
 * while the panels below it swap out — it is never unmounted, so the reader
 * keeps a continuous view of the day being planned.
 */
export function ChartStage({
  stage,
  scenarioId,
  rows,
  baselineRows,
  directiveWindows,
  capacityKwh,
  yDomain,
  hasResult,
  view,
  onViewChange,
  animationMs,
}: ChartStageProps) {
  const reduceMotion = useReducedMotion();
  const [pinned, setPinned] = useState(false);

  // Sticky only engages once the swing has settled — a transformed element
  // mid-animation makes for a jittery sticky edge.
  useEffect(() => {
    if (stage === 'compose') setPinned(false);
  }, [stage]);

  const swingTarget = reduceMotion
    ? { rotateX: 0, y: 0 }
    : stage === 'compose'
      ? { rotateX: 0, y: 0 }
      : { rotateX: [...SWING_KEYFRAMES.rotateX], y: [...SWING_KEYFRAMES.y] };

  return (
    <div className={cn('z-30 transition-[padding]', pinned && 'sticky top-3')}>
      <motion.div
        animate={swingTarget}
        transition={
          reduceMotion
            ? { duration: 0 }
            : stage === 'compose'
              ? SPRING_SOFT
              : swingTransition
        }
        onAnimationComplete={() => {
          if (stage !== 'compose') setPinned(true);
        }}
        style={{ transformPerspective: 1600, transformOrigin: 'center bottom' }}
      >
        <Card
          className={cn(
            'overflow-hidden transition-shadow duration-500',
            pinned ? 'shadow-lg' : 'shadow-xs',
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 pt-4">
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden
                className={cn(
                  'grid size-7 place-items-center rounded-md',
                  hasResult ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                )}
              >
                <Activity className="size-3.5" />
              </span>
              <div className="leading-tight">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold tracking-tight">24-hour energy plan</h2>
                  <Badge variant={hasResult ? 'default' : 'outline'}>
                    {hasResult ? (view === 'optimized' ? 'Optimized' : 'Baseline') : 'Baseline'}
                  </Badge>
                </div>
                <p className="text-subtle-foreground tabular mt-0.5 text-[11px]">
                  {scenarioId} · kWh per hour
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <ChartLegend className="hidden lg:flex" />
              {hasResult ? (
                <Tabs value={view} onValueChange={(next) => onViewChange(next as ChartView)}>
                  <TabsList>
                    <TabsTrigger value="optimized">
                      <GitCompareArrows /> Optimized
                    </TabsTrigger>
                    <TabsTrigger value="baseline">Baseline</TabsTrigger>
                  </TabsList>
                </Tabs>
              ) : null}
            </div>
          </div>

          <ChartLegend className="mt-3 px-5 lg:hidden" />

          <motion.div
            className="mt-2 w-full px-1"
            animate={{ height: CHART_PLOT_HEIGHT[stage] }}
            initial={false}
            transition={reduceMotion ? { duration: 0 } : SPRING_SOFT}
          >
            <EnergyChart
              rows={rows}
              compareRows={hasResult && view === 'optimized' ? baselineRows : null}
              directiveWindows={directiveWindows}
              capacityKwh={capacityKwh}
              yDomain={yDomain}
              animationMs={reduceMotion ? 0 : animationMs}
            />
          </motion.div>

          <div className="space-y-2.5 px-4 pt-1 pb-4">
            <TariffRibbon rows={rows} />
            <DirectiveRail windows={directiveWindows} />
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
