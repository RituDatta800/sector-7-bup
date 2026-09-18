'use client';

import { useId, useMemo } from 'react';
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ChartRow, DirectiveWindow } from '@/lib/chart-data';
import { buildDirectiveHourIndex } from '@/lib/chart-data';
import { hourLabel } from '@/lib/format';
import { EnergyTooltip } from './chart-tooltip';
import { X_DOMAIN, X_TICKS, PLOT_LEFT_GUTTER, PLOT_RIGHT_GUTTER } from './series';

export interface EnergyChartProps {
  rows: readonly ChartRow[];
  /** Baseline rows, so the tooltip can show the per-hour delta once solved. */
  compareRows?: readonly ChartRow[] | null;
  directiveWindows: readonly DirectiveWindow[];
  capacityKwh: number;
  /**
   * Fixed y-domain spanning both datasets. Holding the axis still across the
   * swap is what makes the marks look like they *move* to the new plan rather
   * than the whole chart re-rendering underneath them.
   */
  yDomain: [number, number];
  /**
   * Tween length for the marks. Short while the user is editing the scenario
   * (the chart is a live preview), long for the baseline → optimized swap where
   * the movement itself carries the story. Zero for reduced-motion users.
   */
  animationMs?: number;
}

const AXIS_TICK = {
  fill: 'var(--subtle-foreground)',
  fontSize: 10,
  fontVariantNumeric: 'tabular-nums',
} as const;

export function EnergyChart({
  rows,
  compareRows,
  directiveWindows,
  capacityKwh,
  yDomain,
  animationMs = 900,
}: EnergyChartProps) {
  const gradientId = useId().replace(/:/g, '');
  const directivesByHour = useMemo(
    () => buildDirectiveHourIndex(directiveWindows),
    [directiveWindows],
  );

  const animationDuration = Math.max(0, animationMs);

  return (
    <ResponsiveContainer width="100%" height="100%" debounce={0}>
      <ComposedChart
        data={rows as ChartRow[]}
        margin={{ top: 10, right: PLOT_RIGHT_GUTTER, bottom: 0, left: 0 }}
        stackOffset="sign"
        accessibilityLayer
      >
        <defs>
          <linearGradient id={`${gradientId}-grid`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--viz-grid)" stopOpacity={0.26} />
            <stop offset="100%" stopColor="var(--viz-grid)" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id={`${gradientId}-solar`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--viz-solar)" stopOpacity={0.3} />
            <stop offset="100%" stopColor="var(--viz-solar)" stopOpacity={0.02} />
          </linearGradient>
        </defs>

        <CartesianGrid
          vertical={false}
          stroke="var(--viz-grid-line)"
          strokeWidth={1}
          strokeDasharray="0"
        />

        {/* Directive windows sit behind every mark. */}
        {directiveWindows.map((window) => (
          <ReferenceArea
            key={window.key}
            x1={window.start - 0.5}
            x2={window.end + 0.5}
            fill="var(--viz-highlight)"
            fillOpacity={1}
            stroke="var(--viz-highlight-edge)"
            strokeWidth={1}
            ifOverflow="hidden"
          />
        ))}

        <XAxis
          type="number"
          dataKey="hour"
          domain={X_DOMAIN}
          ticks={[...X_TICKS]}
          tickFormatter={hourLabel}
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={{ stroke: 'var(--viz-axis)', strokeWidth: 1 }}
          tickMargin={8}
          height={26}
          allowDecimals={false}
        />

        <YAxis
          width={PLOT_LEFT_GUTTER}
          domain={yDomain}
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          tickMargin={6}
          allowDecimals={false}
        />

        {/* The battery baseline: above is charging, below is discharging. */}
        <ReferenceLine y={0} stroke="var(--viz-axis)" strokeWidth={1} />

        <RechartsTooltip
          cursor={{ fill: 'var(--viz-highlight)' }}
          isAnimationActive={false}
          content={({ active, payload }) => (
            <EnergyTooltip
              active={active}
              payload={payload}
              directivesByHour={directivesByHour}
              capacityKwh={capacityKwh}
              compareRows={compareRows}
            />
          )}
        />

        <Area
          type="monotone"
          dataKey="grid_kwh"
          name="Grid import"
          stroke="var(--viz-grid)"
          strokeWidth={2}
          fill={`url(#${gradientId}-grid)`}
          activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--viz-surface)' }}
          animationDuration={animationDuration}
          animationEasing="ease-out"
        />

        <Area
          type="monotone"
          dataKey="solar_used_kwh"
          name="Solar used"
          stroke="var(--viz-solar)"
          strokeWidth={2}
          fill={`url(#${gradientId}-solar)`}
          activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--viz-surface)' }}
          animationDuration={animationDuration}
          animationEasing="ease-out"
          animationBegin={80}
        />

        <Bar
          dataKey="battery_charge_kwh"
          name="Battery charge"
          stackId="battery"
          fill="var(--viz-battery)"
          barSize={9}
          radius={[3, 3, 0, 0]}
          animationDuration={animationDuration}
          animationEasing="ease-out"
          animationBegin={160}
        />

        <Bar
          dataKey="battery_discharge_kwh"
          name="Battery discharge"
          stackId="battery"
          fill="var(--viz-discharge)"
          barSize={9}
          radius={[0, 0, 3, 3]}
          animationDuration={animationDuration}
          animationEasing="ease-out"
          animationBegin={160}
        />

        <Line
          type="monotone"
          dataKey="demand_kwh"
          name="Campus demand"
          stroke="var(--viz-demand)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--viz-surface)' }}
          animationDuration={animationDuration}
          animationEasing="ease-out"
          animationBegin={40}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
