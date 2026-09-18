/**
 * Transforms between the API contract and the shape the chart consumes.
 *
 * Baseline and optimized rows deliberately share the *same keys*: Recharts
 * tweens a series when its data array changes but its dataKey does not, so
 * swapping one array for the other animates every mark from the old plan to
 * the new one instead of remounting the chart.
 */

import type {
  DirectiveInterpretationEntry,
  DirectiveType,
  OptimizeEnergyRequest,
  OptimizeEnergyResponse,
} from '@/lib/schemas';
import type { BatteryAction } from '@/lib/schemas';

export interface ChartRow {
  hour: number;
  /** Solar the sky offers this hour, before any operator directive. */
  solar_available_kwh: number;
  demand_kwh: number;
  solar_used_kwh: number;
  grid_kwh: number;
  /** Positive, drawn above the zero line. */
  battery_charge_kwh: number;
  /** Negative, drawn below the zero line — sign is the encoding, not a value. */
  battery_discharge_kwh: number;
  battery_energy_after_kwh: number;
  battery_action: BatteryAction;
  tariff_bdt_per_kwh: number;
  cost_bdt: number;
}

export interface PlanTotals {
  totalGridKwh: number;
  totalCostBdt: number;
  peakGridKwh: number;
  totalSolarUsedKwh: number;
  totalDemandKwh: number;
  /** Share of demand met without the grid, 0–100. */
  selfSufficiencyPct: number;
}

export interface DirectiveWindow {
  key: string;
  noteIndex: number;
  directiveType: DirectiveType;
  /** First hour the directive covers. */
  start: number;
  /** Last hour the directive covers, inclusive. */
  end: number;
  hours: number[];
  explanation: string;
}

const EMPTY_TOTALS: PlanTotals = {
  totalGridKwh: 0,
  totalCostBdt: 0,
  peakGridKwh: 0,
  totalSolarUsedKwh: 0,
  totalDemandKwh: 0,
  selfSufficiencyPct: 0,
};

/**
 * The reference dispatch every optimized plan is measured against: take the
 * solar that is there, buy the remainder from the grid, leave the battery
 * alone. It is what the campus would pay with no scheduling at all.
 */
export function buildBaselineRows(request: OptimizeEnergyRequest): ChartRow[] {
  return request.hours.map((entry) => {
    const solarUsed = Math.min(entry.demand_kwh, entry.solar_kwh);
    const grid = Math.max(0, entry.demand_kwh - solarUsed);

    return {
      hour: entry.hour,
      solar_available_kwh: entry.solar_kwh,
      demand_kwh: entry.demand_kwh,
      solar_used_kwh: solarUsed,
      grid_kwh: grid,
      battery_charge_kwh: 0,
      battery_discharge_kwh: 0,
      battery_energy_after_kwh: request.battery.initial_energy_kwh,
      battery_action: 'idle' as const,
      tariff_bdt_per_kwh: entry.tariff_bdt_per_kwh,
      cost_bdt: grid * entry.tariff_bdt_per_kwh,
    };
  });
}

/** Zips the solved plan back onto the scenario it was solved for. */
export function buildOptimizedRows(
  request: OptimizeEnergyRequest,
  response: OptimizeEnergyResponse,
): ChartRow[] {
  const scenarioByHour = new Map(request.hours.map((entry) => [entry.hour, entry]));

  return response.hourly_plan
    .slice()
    .sort((a, b) => a.hour - b.hour)
    .map((item) => {
      const scenario = scenarioByHour.get(item.hour);
      const tariff = scenario?.tariff_bdt_per_kwh ?? 0;

      return {
        hour: item.hour,
        solar_available_kwh: scenario?.solar_kwh ?? 0,
        demand_kwh: scenario?.demand_kwh ?? 0,
        solar_used_kwh: item.solar_used_kwh,
        grid_kwh: item.grid_kwh,
        battery_charge_kwh: item.battery_action === 'charge' ? item.battery_kwh : 0,
        battery_discharge_kwh: item.battery_action === 'discharge' ? -item.battery_kwh : 0,
        battery_energy_after_kwh: item.battery_energy_after_kwh,
        battery_action: item.battery_action,
        tariff_bdt_per_kwh: tariff,
        cost_bdt: item.grid_kwh * tariff,
      };
    });
}

export function computeTotals(rows: readonly ChartRow[]): PlanTotals {
  if (rows.length === 0) return EMPTY_TOTALS;

  const totals = rows.reduce(
    (acc, row) => ({
      totalGridKwh: acc.totalGridKwh + row.grid_kwh,
      totalCostBdt: acc.totalCostBdt + row.cost_bdt,
      peakGridKwh: Math.max(acc.peakGridKwh, row.grid_kwh),
      totalSolarUsedKwh: acc.totalSolarUsedKwh + row.solar_used_kwh,
      totalDemandKwh: acc.totalDemandKwh + row.demand_kwh,
    }),
    { totalGridKwh: 0, totalCostBdt: 0, peakGridKwh: 0, totalSolarUsedKwh: 0, totalDemandKwh: 0 },
  );

  return {
    ...totals,
    selfSufficiencyPct:
      totals.totalDemandKwh > 0
        ? ((totals.totalDemandKwh - totals.totalGridKwh) / totals.totalDemandKwh) * 100
        : 0,
  };
}

/**
 * Totals reported by the solver, which are authoritative for the optimized
 * plan. Solar/demand aggregates still come from the rows — the contract does
 * not carry them.
 */
export function totalsFromResponse(
  response: OptimizeEnergyResponse,
  rows: readonly ChartRow[],
): PlanTotals {
  const derived = computeTotals(rows);

  return {
    ...derived,
    totalGridKwh: response.total_grid_kwh,
    totalCostBdt: response.total_cost_bdt,
    peakGridKwh: response.peak_grid_kwh,
    selfSufficiencyPct:
      derived.totalDemandKwh > 0
        ? ((derived.totalDemandKwh - response.total_grid_kwh) / derived.totalDemandKwh) * 100
        : 0,
  };
}

function adjustmentHours(entry: DirectiveInterpretationEntry): number[] {
  const adjustment = entry.structured_adjustment;
  if (adjustment === null || !('hours' in adjustment)) return [];
  return adjustment.hours;
}

/**
 * Directives that actually constrained the solve, expanded into contiguous
 * hour windows so the chart can shade exactly the hours they touched.
 */
export function extractDirectiveWindows(
  response: OptimizeEnergyResponse | null | undefined,
): DirectiveWindow[] {
  if (!response) return [];

  const windows: DirectiveWindow[] = [];

  for (const entry of response.directive_interpretation) {
    if (!entry.applies || entry.directive_type === 'no_op') continue;

    const hours = [...new Set(adjustmentHours(entry))].sort((a, b) => a - b);
    if (hours.length === 0) continue;

    let runStart = hours[0]!;
    let previous = hours[0]!;

    const pushRun = (start: number, end: number) => {
      windows.push({
        key: `${entry.note_index}-${entry.directive_type}-${start}`,
        noteIndex: entry.note_index,
        directiveType: entry.directive_type,
        start,
        end,
        hours: hours.filter((hour) => hour >= start && hour <= end),
        explanation: entry.explanation,
      });
    };

    for (const hour of hours.slice(1)) {
      if (hour !== previous + 1) {
        pushRun(runStart, previous);
        runStart = hour;
      }
      previous = hour;
    }
    pushRun(runStart, previous);
  }

  return windows;
}

/** hour → the directive windows covering it, for the tooltip. */
export function buildDirectiveHourIndex(
  windows: readonly DirectiveWindow[],
): Map<number, DirectiveWindow[]> {
  const index = new Map<number, DirectiveWindow[]>();

  for (const window of windows) {
    for (let hour = window.start; hour <= window.end; hour += 1) {
      const existing = index.get(hour);
      if (existing) {
        existing.push(window);
      } else {
        index.set(hour, [window]);
      }
    }
  }

  return index;
}

/** Highest point any mark reaches, used to seat the shaded directive windows. */
export function chartUpperBound(rows: readonly ChartRow[]): number {
  const peak = rows.reduce(
    (max, row) =>
      Math.max(
        max,
        row.demand_kwh,
        row.grid_kwh,
        row.solar_used_kwh,
        row.battery_charge_kwh,
        row.solar_available_kwh,
      ),
    0,
  );

  // Round up to a clean tick so the axis does not end on an arbitrary number.
  const step = peak > 400 ? 100 : peak > 150 ? 50 : 20;
  return Math.max(step, Math.ceil((peak * 1.08) / step) * step);
}

/** Deepest discharge, used to seat the negative half of the battery axis. */
export function chartLowerBound(rows: readonly ChartRow[]): number {
  const deepest = rows.reduce((min, row) => Math.min(min, row.battery_discharge_kwh), 0);
  if (deepest === 0) return 0;

  // Only a tick of headroom: every kWh given to the negative half is taken off
  // the positive half, where the demand and grid curves live.
  const step = deepest < -100 ? 50 : 20;
  return Math.floor((deepest * 1.04) / step) * step;
}
