/**
 * Single responsibility: Validates that minimum battery reserve is non-negative and does not exceed battery capacity.
 */

export interface ReserveRuleResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates battery reserve constraint against battery capacity.
 */
export function validateReserveRule(reserveKwh: unknown, capacityKwh?: number): ReserveRuleResult {
  if (typeof reserveKwh !== 'number' || !Number.isFinite(reserveKwh)) {
    return { isValid: false, error: `minimum_energy_kwh must be a finite number, got ${reserveKwh}` };
  }
  if (reserveKwh < 0) {
    return { isValid: false, error: `minimum_energy_kwh must be non-negative, got ${reserveKwh}` };
  }
  if (capacityKwh !== undefined && reserveKwh > capacityKwh) {
    return { isValid: false, error: `minimum_energy_kwh (${reserveKwh}) exceeds battery capacity (${capacityKwh})` };
  }
  return { isValid: true };
}
