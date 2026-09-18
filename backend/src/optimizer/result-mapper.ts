/**
 * Single responsibility: Converts LP solver output into the exact hourly_plan shape and
 * top-level summary fields matching the API contract.
 */

import { LpSolution } from './solver';
import { HourEntry, BatterySpec, DirectiveInterpretationEntry } from '../shared/types';
import { HourlyPlanItem } from '../optimize-energy/dto';

export interface OptimizationResult {
  hourly_plan: HourlyPlanItem[];
  total_grid_kwh: number;
  total_cost_bdt: number;
  peak_grid_kwh: number;
  plan_summary: string;
}

/**
 * Converts LP solver decision variable values into the contract-compliant response shape.
 */
export function mapSolverResultToSchedule(
  solution: LpSolution,
  hours: HourEntry[],
  battery: BatterySpec,
  directives: DirectiveInterpretationEntry[],
): OptimizationResult {
  const hourlyPlan: HourlyPlanItem[] = [];
  let totalGridKwh = 0;
  let totalCostBdt = 0;
  let peakGridKwh = 0;

  for (let h = 0; h < 24; h++) {
    const gridKwh = Math.max(0, solution[`grid_${h}`] as number || 0);
    const solarUsedKwh = Math.max(0, solution[`solar_${h}`] as number || 0);
    const chargeKwh = Math.max(0, solution[`charge_${h}`] as number || 0);
    const dischargeKwh = Math.max(0, solution[`discharge_${h}`] as number || 0);
    const socAfter = Math.max(0, solution[`soc_${h}`] as number || 0);

    // Determine battery action
    let batteryAction: 'charge' | 'discharge' | 'idle';
    let batteryKwh: number;

    // Use a small epsilon to avoid floating-point noise
    const eps = 1e-6;
    if (chargeKwh > eps) {
      batteryAction = 'charge';
      batteryKwh = Math.round(chargeKwh * 1000) / 1000;
    } else if (dischargeKwh > eps) {
      batteryAction = 'discharge';
      batteryKwh = Math.round(dischargeKwh * 1000) / 1000;
    } else {
      batteryAction = 'idle';
      batteryKwh = 0;
    }

    const roundedGrid = Math.round(gridKwh * 1000) / 1000;
    const hourTariff = hours[h]?.tariff_bdt_per_kwh ?? 0;
    totalGridKwh += roundedGrid;
    totalCostBdt += roundedGrid * hourTariff;
    peakGridKwh = Math.max(peakGridKwh, roundedGrid);

    hourlyPlan.push({
      hour: h,
      grid_kwh: roundedGrid,
      solar_used_kwh: Math.round(solarUsedKwh * 1000) / 1000,
      battery_action: batteryAction,
      battery_kwh: batteryKwh,
      battery_energy_after_kwh: Math.round(socAfter * 1000) / 1000,
    });
  }

  // Build plan summary
  const activeDirectives = directives.filter(d => d.applies);
  let summary = `Optimized 24-hour energy schedule minimizing grid cost.`;
  summary += ` Total grid: ${Math.round(totalGridKwh * 100) / 100} kWh, total cost: ${Math.round(totalCostBdt * 100) / 100} BDT, peak grid: ${Math.round(peakGridKwh * 100) / 100} kWh.`;
  if (activeDirectives.length > 0) {
    summary += ` Applied ${activeDirectives.length} directive(s): ${activeDirectives.map(d => d.directive_type).join(', ')}.`;
  }
  summary += ` Battery returns to ${battery.initial_energy_kwh} kWh at end of day.`;

  return {
    hourly_plan: hourlyPlan,
    total_grid_kwh: Math.round(totalGridKwh * 1000) / 1000,
    total_cost_bdt: Math.round(totalCostBdt * 1000) / 1000,
    peak_grid_kwh: Math.round(peakGridKwh * 1000) / 1000,
    plan_summary: summary,
  };
}
