/**
 * Single responsibility: Encodes the grid/load/solar/battery energy balance equation as LP solver constraints.
 */

import { HourEntry } from '../../shared/types';
import { LpModel } from '../solver';

/**
 * Adds energy balance constraints for each hour to the LP model:
 * grid_kwh[h] + solar_used_kwh[h] + battery_discharge[h] = demand_kwh[h] + battery_charge[h]
 */
export function addEnergyBalanceConstraints(
  model: LpModel,
  hours: HourEntry[],
): void {
  for (const entry of hours) {
    const h = entry.hour;
    const constraintName = `balance_${h}`;
    model.constraints[constraintName] = { equal: entry.demand_kwh };

    // Each variable contributes to this constraint:
    // grid[h] + solar[h] + discharge[h] - charge[h] = demand[h]
    const gridVar = `grid_${h}`;
    const solarVar = `solar_${h}`;
    const chargeVar = `charge_${h}`;
    const dischargeVar = `discharge_${h}`;

    if (!model.variables[gridVar]) model.variables[gridVar] = {};
    if (!model.variables[solarVar]) model.variables[solarVar] = {};
    if (!model.variables[chargeVar]) model.variables[chargeVar] = {};
    if (!model.variables[dischargeVar]) model.variables[dischargeVar] = {};

    model.variables[gridVar][constraintName] = 1;
    model.variables[solarVar][constraintName] = 1;
    model.variables[dischargeVar][constraintName] = 1;
    model.variables[chargeVar][constraintName] = -1;
  }
}
