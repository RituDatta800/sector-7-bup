/**
 * Series registry: one entry per mark on the energy chart.
 *
 * `color` points at a categorical slot from the validated palette in
 * globals.css. The slot ORDER is the colour-blindness safety mechanism — the
 * five slots used here clear adjacent CVD ΔE 9.1 (light) / 8.4 (dark). Adding a
 * sixth series means re-running the palette validator, not picking a nice hue.
 */

import type { ChartRow } from '@/lib/chart-data';

export type SeriesKey =
  | 'demand_kwh'
  | 'grid_kwh'
  | 'solar_used_kwh'
  | 'battery_charge_kwh'
  | 'battery_discharge_kwh';

export interface SeriesSpec {
  key: SeriesKey;
  label: string;
  /** CSS custom property holding the slot colour. */
  color: string;
  shape: 'line' | 'area' | 'bar';
  /** One line explaining what the mark means, shown in the legend tooltip. */
  hint: string;
}

export const SERIES: readonly SeriesSpec[] = [
  {
    key: 'demand_kwh',
    label: 'Campus demand',
    color: 'var(--viz-demand)',
    shape: 'line',
    hint: 'Total load the campus must be served this hour.',
  },
  {
    key: 'grid_kwh',
    label: 'Grid import',
    color: 'var(--viz-grid)',
    shape: 'area',
    hint: 'Energy bought from the utility — the quantity the solver minimises.',
  },
  {
    key: 'solar_used_kwh',
    label: 'Solar used',
    color: 'var(--viz-solar)',
    shape: 'area',
    hint: 'On-site generation actually consumed, after any operator curtailment.',
  },
  {
    key: 'battery_charge_kwh',
    label: 'Battery charge',
    color: 'var(--viz-battery)',
    shape: 'bar',
    hint: 'Energy stored this hour. Drawn above the zero line.',
  },
  {
    key: 'battery_discharge_kwh',
    label: 'Battery discharge',
    color: 'var(--viz-discharge)',
    shape: 'bar',
    hint: 'Energy released this hour. Drawn below the zero line.',
  },
] as const;

export const SERIES_BY_KEY: Record<SeriesKey, SeriesSpec> = SERIES.reduce(
  (acc, spec) => ({ ...acc, [spec.key]: spec }),
  {} as Record<SeriesKey, SeriesSpec>,
);

/**
 * Chart geometry shared between the SVG plot and the HTML strips rendered
 * beneath it (tariff ribbon, directive rail). Keeping these in one place is
 * what keeps the 24 HTML cells aligned to the 24 SVG hour slots.
 */
export const PLOT_LEFT_GUTTER = 48;
export const PLOT_RIGHT_GUTTER = 12;

/** The numeric x-domain: half a slot of padding so hour 0 and 23 sit fully inside. */
export const X_DOMAIN: [number, number] = [-0.5, 23.5];
export const X_TICKS = [0, 3, 6, 9, 12, 15, 18, 21] as const;

export type ChartRowKey = keyof ChartRow;
