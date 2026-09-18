/**
 * Single responsibility: Defines the exact literal string values for the six official directive types.
 * No other directive types exist in the specification.
 */

export const DIRECTIVE_TYPES = [
  'solar_reduction',
  'minimum_battery_reserve',
  'no_charge_window',
  'no_discharge_window',
  'max_grid_window',
  'no_op',
] as const;

export const DIRECTIVE_TYPE = {
  SOLAR_REDUCTION: 'solar_reduction',
  MINIMUM_BATTERY_RESERVE: 'minimum_battery_reserve',
  NO_CHARGE_WINDOW: 'no_charge_window',
  NO_DISCHARGE_WINDOW: 'no_discharge_window',
  MAX_GRID_WINDOW: 'max_grid_window',
  NO_OP: 'no_op',
} as const;

export type DirectiveType = (typeof DIRECTIVE_TYPES)[number];
