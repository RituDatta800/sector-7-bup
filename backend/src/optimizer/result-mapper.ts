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

  const clamp = (val: number) => (Math.abs(val) < 1e-4 ? 0 : Number(val.toFixed(2)));

  for (let h = 0; h < 24; h++) {
    const gridKwh = Math.max(0, solution[`grid_${h}`] as number || 0);
    const solarUsedKwh = Math.max(0, solution[`solar_${h}`] as number || 0);
    const chargeKwh = Math.max(0, solution[`charge_${h}`] as number || 0);
    const dischargeKwh = Math.max(0, solution[`discharge_${h}`] as number || 0);
    const socAfter = Math.max(0, solution[`soc_${h}`] as number || 0);

    let batteryAction: 'charge' | 'discharge' | 'idle';
    let batteryKwh: number;
    const netCharge = chargeKwh - dischargeKwh;
    
    if (netCharge > 1e-4) {
      batteryAction = 'charge';
      batteryKwh = clamp(netCharge);
    } else if (netCharge < -1e-4) {
      batteryAction = 'discharge';
      batteryKwh = clamp(-netCharge);
    } else {
      batteryAction = 'idle';
      batteryKwh = 0;
    }

    const roundedGrid = clamp(gridKwh);
    const hourTariff = hours[h]?.tariff_bdt_per_kwh ?? 0;
    totalGridKwh += roundedGrid;
    totalCostBdt += roundedGrid * hourTariff;
    peakGridKwh = Math.max(peakGridKwh, roundedGrid);

    const actualCharge = batteryAction === 'charge' ? batteryKwh : 0;
    const actualDischarge = batteryAction === 'discharge' ? batteryKwh : 0;
    const actualSolar = clamp(solarUsedKwh);
    const demand = hours[h].demand_kwh;
    
    // Energy Balance Self-Check
    const supply = roundedGrid + actualSolar + actualDischarge;
    const consumed = demand + actualCharge;
    if (Math.abs(supply - consumed) > 0.01) {
      throw new Error(`Energy balance violated at hour ${h}: supply(${supply}) != consumed(${consumed})`);
    }

    // Battery SoC Self-Check
    const expectedSoc = (h === 0 ? battery.initial_energy_kwh : hourlyPlan[h - 1].battery_energy_after_kwh) + actualCharge - actualDischarge;
    if (Math.abs(expectedSoc - clamp(socAfter)) > 0.01) {
      throw new Error(`Battery transition violated at hour ${h}: expected(${expectedSoc}) != actual(${clamp(socAfter)})`);
    }

    hourlyPlan.push({
      hour: h,
      grid_kwh: roundedGrid,
      solar_used_kwh: clamp(solarUsedKwh),
      battery_action: batteryAction,
      battery_kwh: batteryKwh,
      battery_energy_after_kwh: clamp(socAfter),
    });
  }

  // Build plan summary
  const activeDirectives = directives.filter(d => d.applies);
  let summary = `Optimized 24-hour energy schedule minimizing grid cost.`;
  summary += ` Total grid: ${clamp(totalGridKwh)} kWh, total cost: ${clamp(totalCostBdt)} BDT, peak grid: ${clamp(peakGridKwh)} kWh.`;
  if (activeDirectives.length > 0) {
    summary += ` Applied ${activeDirectives.length} directive(s): ${activeDirectives.map(d => d.directive_type).join(', ')}.`;
  }
  summary += ` Battery returns to ${battery.initial_energy_kwh} kWh at end of day.`;

  return {
    hourly_plan: hourlyPlan,
    total_grid_kwh: clamp(totalGridKwh),
    total_cost_bdt: clamp(totalCostBdt),
    peak_grid_kwh: clamp(peakGridKwh),
    plan_summary: summary,
  };
}
