/**
 * Single responsibility: Custom domain error representing controlled guardrail or schema validation failures.
 */

export class ValidationFailureError extends Error {
  public readonly ruleName?: string;
  public readonly details?: unknown;

  constructor(message: string, ruleName?: string, details?: unknown) {
    super(message);
    this.name = 'ValidationFailureError';
    this.ruleName = ruleName;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
