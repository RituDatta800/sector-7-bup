/**
 * Single responsibility: Encodes battery physical constraints (capacity, state-of-charge bounds, rate limits,
 * SoC tracking, and end-of-day neutrality).
 */

import { BatterySpec } from '../../shared/types';
import { LpModel } from '../solver';

/**
 * Adds battery constraints to the LP model:
 * - Charge/discharge rate limits per hour
 * - SoC tracking: soc[h] = soc[h-1] + charge[h] - discharge[h]
 * - SoC bounds: minimum_energy_kwh <= soc[h] <= capacity_kwh
 * - End-of-day neutrality: soc[23] = initial_energy_kwh
 */
export function addBatteryBoundConstraints(
  model: LpModel,
  battery: BatterySpec,
  minimumEnergyByHour: Map<number, number>,
): void {
  for (let h = 0; h < 24; h++) {
    const chargeVar = `charge_${h}`;
    const dischargeVar = `discharge_${h}`;
    const socVar = `soc_${h}`;

    if (!model.variables[chargeVar]) model.variables[chargeVar] = {};
    if (!model.variables[dischargeVar]) model.variables[dischargeVar] = {};
    if (!model.variables[socVar]) model.variables[socVar] = {};

    // Charge rate limit: charge[h] <= max_charge_kwh_per_hour
    const chargeRateConstraint = `charge_rate_${h}`;
    model.constraints[chargeRateConstraint] = { max: battery.max_charge_kwh_per_hour };
    model.variables[chargeVar][chargeRateConstraint] = 1;

    // Discharge rate limit: discharge[h] <= max_discharge_kwh_per_hour
    const dischargeRateConstraint = `discharge_rate_${h}`;
    model.constraints[dischargeRateConstraint] = { max: battery.max_discharge_kwh_per_hour };
    model.variables[dischargeVar][dischargeRateConstraint] = 1;

    // SoC tracking: soc[h] - charge[h] + discharge[h] = soc[h-1] (or initial_energy_kwh for h=0)
    const socTrackConstraint = `soc_track_${h}`;
    const prevSoc = h === 0 ? battery.initial_energy_kwh : undefined;

    if (h === 0) {
      // soc[0] - charge[0] + discharge[0] = initial_energy_kwh
      model.constraints[socTrackConstraint] = { equal: battery.initial_energy_kwh };
      model.variables[socVar][socTrackConstraint] = 1;
      model.variables[chargeVar][socTrackConstraint] = -1;
      model.variables[dischargeVar][socTrackConstraint] = 1;
    } else {
      // soc[h] - soc[h-1] - charge[h] + discharge[h] = 0
      const prevSocVar = `soc_${h - 1}`;
      if (!model.variables[prevSocVar]) model.variables[prevSocVar] = {};

      model.constraints[socTrackConstraint] = { equal: 0 };
      model.variables[socVar][socTrackConstraint] = 1;
      model.variables[prevSocVar][socTrackConstraint] = -1;
      model.variables[chargeVar][socTrackConstraint] = -1;
      model.variables[dischargeVar][socTrackConstraint] = 1;
    }

    // SoC bounds: min_energy <= soc[h] <= capacity_kwh
    const effectiveMin = Math.max(
      battery.minimum_energy_kwh,
      minimumEnergyByHour.get(h) ?? 0,
    );

    const socMinConstraint = `soc_min_${h}`;
    model.constraints[socMinConstraint] = { min: effectiveMin };
    model.variables[socVar][socMinConstraint] = 1;

    const socMaxConstraint = `soc_max_${h}`;
    model.constraints[socMaxConstraint] = { max: battery.capacity_kwh };
    model.variables[socVar][socMaxConstraint] = 1;
  }

  // End-of-day neutrality: soc[23] = initial_energy_kwh
  const eodConstraint = 'soc_eod';
  model.constraints[eodConstraint] = { equal: battery.initial_energy_kwh };
  const soc23Var = 'soc_23';
  if (!model.variables[soc23Var]) model.variables[soc23Var] = {};
  model.variables[soc23Var][eodConstraint] = 1;
}
