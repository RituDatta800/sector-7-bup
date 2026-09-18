/**
 * Single responsibility: Orchestrates the optimization workflow by combining constraint builders,
 * invoking the LP solver adapter, and mapping the solution.
 */

import { Injectable } from '@nestjs/common';
import { HourEntry, BatterySpec, DirectiveInterpretationEntry } from '../shared/types';
import { LpSolverAdapter, LpModel } from './solver';
import { OptimizationResult, mapSolverResultToSchedule } from './result-mapper';
import { addEnergyBalanceConstraints } from './constraints/energy-balance';
import { addBatteryBoundConstraints } from './constraints/battery-bounds';
import { extractDirectiveConstraints, addDirectiveConstraints } from './constraints/directive-constraints';

export interface EnergyScenarioInput {
  scenario_id: string;
  hours: HourEntry[];
  battery: BatterySpec;
}

@Injectable()
export class OptimizerService {
  constructor(private readonly lpSolverAdapter: LpSolverAdapter) {}

  /**
   * Builds an optimal 24-hour energy dispatch schedule honoring physical and directive constraints.
   * Minimizes total grid cost = sum(grid_kwh[h] * tariff_bdt_per_kwh[h]).
   */
  buildSchedule(
    scenario: EnergyScenarioInput,
    validatedDirectives: DirectiveInterpretationEntry[],
  ): OptimizationResult {
    // Extract directive constraints into structured maps
    const directiveInputs = extractDirectiveConstraints(validatedDirectives);

    // Build the LP model
    const model: LpModel = {
      optimize: 'cost',
      opType: 'min',
      constraints: {},
      variables: {},
    };

    // Initialize all decision variables and set up the objective function (minimize grid cost)
    for (const entry of scenario.hours) {
      const h = entry.hour;
      const gridVar = `grid_${h}`;
      const solarVar = `solar_${h}`;
      const chargeVar = `charge_${h}`;
      const dischargeVar = `discharge_${h}`;
      const socVar = `soc_${h}`;

      // Initialize variable objects
      model.variables[gridVar] = { cost: entry.tariff_bdt_per_kwh };
      model.variables[solarVar] = {};
      model.variables[chargeVar] = {};
      model.variables[dischargeVar] = {};
      model.variables[socVar] = {};

      // Non-negativity: all variables >= 0
      const gridMinConstraint = `grid_min_${h}`;
      model.constraints[gridMinConstraint] = { min: 0 };
      model.variables[gridVar][gridMinConstraint] = 1;

      const solarMinConstraint = `solar_min_${h}`;
      model.constraints[solarMinConstraint] = { min: 0 };
      model.variables[solarVar][solarMinConstraint] = 1;

      const chargeMinConstraint = `charge_min_${h}`;
      model.constraints[chargeMinConstraint] = { min: 0 };
      model.variables[chargeVar][chargeMinConstraint] = 1;

      const dischargeMinConstraint = `discharge_min_${h}`;
      model.constraints[dischargeMinConstraint] = { min: 0 };
      model.variables[dischargeVar][dischargeMinConstraint] = 1;
    }

    // 1. Energy balance constraints
    addEnergyBalanceConstraints(model, scenario.hours);

    // 2. Battery bounds, SoC tracking, rate limits, end-of-day neutrality
    addBatteryBoundConstraints(model, scenario.battery, directiveInputs.minimumBatteryReserve);

    // 3. Directive-derived constraints (solar caps, no-charge windows, max grid, etc.)
    addDirectiveConstraints(model, scenario.hours, directiveInputs);

    // Solve the LP model
    const solution = this.lpSolverAdapter.solve(model);

    // Map solution to the response shape
    return mapSolverResultToSchedule(
      solution,
      scenario.hours,
      scenario.battery,
      validatedDirectives,
    );
  }
}
