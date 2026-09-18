/**
 * Single responsibility: Validates that a solar reduction factor is a number between 0.0 and 1.0 inclusive.
 */

export interface SolarFactorRuleResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates solar reduction factor constraint.
 */
export function validateSolarFactorRule(factor: unknown): SolarFactorRuleResult {
  if (typeof factor !== 'number' || !Number.isFinite(factor)) {
    return { isValid: false, error: `factor must be a finite number, got ${factor}` };
  }
  if (factor < 0 || factor > 1) {
    return { isValid: false, error: `factor must be between 0 and 1 inclusive, got ${factor}` };
  }
  return { isValid: true };
}
