/**
 * Single responsibility: Defines TypeScript types for the directive_interpretation response entries
 * and the six official directive types. Derived from directive-type.constants.ts.
 */

import { DirectiveType } from '../constants';

export { DirectiveType };

/** Structured adjustment shapes for each directive type */

export interface SolarReductionAdjustment {
  hours: number[];
  factor: number;
}

export interface MinimumBatteryReserveAdjustment {
  hours: number[];
  minimum_energy_kwh: number;
}

export interface NoChargeWindowAdjustment {
  hours: number[];
}

export interface NoDischargeWindowAdjustment {
  hours: number[];
}

export interface MaxGridWindowAdjustment {
  hours: number[];
  max_grid_kwh: number;
}

export type StructuredAdjustment =
  | SolarReductionAdjustment
  | MinimumBatteryReserveAdjustment
  | NoChargeWindowAdjustment
  | NoDischargeWindowAdjustment
  | MaxGridWindowAdjustment
  | null;

/**
 * Each directive_interpretation entry in the API response — exact shape per contract.
 */
export interface DirectiveInterpretationEntry {
  note_index: number;
  applies: boolean;
  directive_type: DirectiveType;
  structured_adjustment: StructuredAdjustment;
  explanation: string;
}
