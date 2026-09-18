/**
 * Single responsibility: Translates each validated directive type into corresponding LP solver constraints.
 * Handles solar_reduction, minimum_battery_reserve, no_charge_window, no_discharge_window, max_grid_window.
 */

import { DirectiveInterpretationEntry } from '../../shared/types';
import { DIRECTIVE_TYPE } from '../../shared/constants';
import { HourEntry } from '../../shared/types';
import { LpModel } from '../solver';

export interface DirectiveConstraintInputs {
  solarCurtailment: Map<number, number>;     // hour -> usable factor (0-1)
  minimumBatteryReserve: Map<number, number>; // hour -> minimum_energy_kwh
  noChargeHours: Set<number>;
  noDischargeHours: Set<number>;
  maxGridByHour: Map<number, number>;         // hour -> max_grid_kwh
}

/**
 * Extracts constraint inputs from validated directives for use by the optimizer.
 */
export function extractDirectiveConstraints(
  directives: DirectiveInterpretationEntry[],
): DirectiveConstraintInputs {
  const inputs: DirectiveConstraintInputs = {
    solarCurtailment: new Map(),
    minimumBatteryReserve: new Map(),
    noChargeHours: new Set(),
    noDischargeHours: new Set(),
    maxGridByHour: new Map(),
  };

  for (const d of directives) {
    if (!d.applies || d.directive_type === DIRECTIVE_TYPE.NO_OP || !d.structured_adjustment) {
      continue;
    }

    const adj = d.structured_adjustment as unknown as Record<string, unknown>;

    switch (d.directive_type) {
      case DIRECTIVE_TYPE.SOLAR_REDUCTION: {
        const hours = adj.hours as number[];
        const factor = adj.factor as number;
        for (const h of hours) {
          // If multiple solar_reduction directives apply, take the minimum factor (most restrictive)
          const existing = inputs.solarCurtailment.get(h);
          inputs.solarCurtailment.set(h, existing !== undefined ? Math.min(existing, factor) : factor);
        }
        break;
      }
      case DIRECTIVE_TYPE.MINIMUM_BATTERY_RESERVE: {
        const hours = adj.hours as number[];
        const minKwh = adj.minimum_energy_kwh as number;
        for (const h of hours) {
          const existing = inputs.minimumBatteryReserve.get(h);
          inputs.minimumBatteryReserve.set(h, existing !== undefined ? Math.max(existing, minKwh) : minKwh);
        }
        break;
      }
      case DIRECTIVE_TYPE.NO_CHARGE_WINDOW: {
        const hours = adj.hours as number[];
        for (const h of hours) inputs.noChargeHours.add(h);
        break;
      }
      case DIRECTIVE_TYPE.NO_DISCHARGE_WINDOW: {
        const hours = adj.hours as number[];
        for (const h of hours) inputs.noDischargeHours.add(h);
        break;
      }
      case DIRECTIVE_TYPE.MAX_GRID_WINDOW: {
        const hours = adj.hours as number[];
        const maxKwh = adj.max_grid_kwh as number;
        for (const h of hours) {
          const existing = inputs.maxGridByHour.get(h);
          inputs.maxGridByHour.set(h, existing !== undefined ? Math.min(existing, maxKwh) : maxKwh);
        }
        break;
      }
    }
  }

  return inputs;
}

/**
 * Applies directive-derived constraints to the LP model.
 */
export function addDirectiveConstraints(
  model: LpModel,
  hours: HourEntry[],
  constraints: DirectiveConstraintInputs,
): void {
  for (const entry of hours) {
    const h = entry.hour;
    const solarVar = `solar_${h}`;
    const chargeVar = `charge_${h}`;
    const dischargeVar = `discharge_${h}`;
    const gridVar = `grid_${h}`;

    if (!model.variables[solarVar]) model.variables[solarVar] = {};
    if (!model.variables[chargeVar]) model.variables[chargeVar] = {};
    if (!model.variables[dischargeVar]) model.variables[dischargeVar] = {};
    if (!model.variables[gridVar]) model.variables[gridVar] = {};

    // Solar upper bound: solar_used <= effective_solar (base * factor if curtailed)
    const factor = constraints.solarCurtailment.get(h) ?? 1.0;
    const effectiveSolar = entry.solar_kwh * factor;
    const solarCapConstraint = `solar_cap_${h}`;
    model.constraints[solarCapConstraint] = { max: effectiveSolar };
    model.variables[solarVar][solarCapConstraint] = 1;

    // No-charge window: charge[h] = 0
    if (constraints.noChargeHours.has(h)) {
      const noChargeConstraint = `no_charge_${h}`;
      model.constraints[noChargeConstraint] = { max: 0 };
      model.variables[chargeVar][noChargeConstraint] = 1;
    }

    // No-discharge window: discharge[h] = 0
    if (constraints.noDischargeHours.has(h)) {
      const noDischargeConstraint = `no_discharge_${h}`;
      model.constraints[noDischargeConstraint] = { max: 0 };
      model.variables[dischargeVar][noDischargeConstraint] = 1;
    }

    // Max grid window: grid[h] <= max_grid_kwh
    const maxGrid = constraints.maxGridByHour.get(h);
    if (maxGrid !== undefined) {
      const maxGridConstraint = `max_grid_${h}`;
      model.constraints[maxGridConstraint] = { max: maxGrid };
      model.variables[gridVar][maxGridConstraint] = 1;
    }
  }
}
