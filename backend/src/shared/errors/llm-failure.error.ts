/**
 * Single responsibility: Custom domain error representing controlled LLM provider/inference failures.
 */

export class LlmFailureError extends Error {
  public readonly provider: string;
  public readonly originalError?: unknown;

  constructor(message: string, provider = 'groq', originalError?: unknown) {
    super(message);
    this.name = 'LlmFailureError';
    this.provider = provider;
    this.originalError = originalError;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
