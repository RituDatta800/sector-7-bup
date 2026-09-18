/**
 * Single responsibility: Validates that an array of hours contains unique integers between 0 and 23 in ascending order.
 */

export interface HoursRuleResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates hours array against 0-23 unique ascending integer constraints.
 */
export function validateHoursRule(hours: unknown): HoursRuleResult {
  if (!Array.isArray(hours)) {
    return { isValid: false, error: 'hours must be an array' };
  }

  if (hours.length === 0) {
    return { isValid: false, error: 'hours array must not be empty' };
  }

  for (let i = 0; i < hours.length; i++) {
    const h = hours[i];
    if (typeof h !== 'number' || !Number.isInteger(h) || h < 0 || h > 23) {
      return { isValid: false, error: `hours[${i}] = ${h} is not a valid integer 0-23` };
    }
  }

  // Check uniqueness and ascending order
  for (let i = 1; i < hours.length; i++) {
    if (hours[i] <= hours[i - 1]) {
      return { isValid: false, error: `hours must be unique and in ascending order, but hours[${i}] = ${hours[i]} <= hours[${i - 1}] = ${hours[i - 1]}` };
    }
  }

  return { isValid: true };
}
