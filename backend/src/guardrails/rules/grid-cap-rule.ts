/**
 * Single responsibility: Validates that max grid kWh cap is a finite, non-negative number.
 */

export interface GridCapRuleResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates grid import cap value constraint.
 */
export function validateGridCapRule(maxGridKwh: unknown): GridCapRuleResult {
  if (typeof maxGridKwh !== 'number' || !Number.isFinite(maxGridKwh)) {
    return { isValid: false, error: `max_grid_kwh must be a finite number, got ${maxGridKwh}` };
  }
  if (maxGridKwh < 0) {
    return { isValid: false, error: `max_grid_kwh must be non-negative, got ${maxGridKwh}` };
  }
  return { isValid: true };
}
