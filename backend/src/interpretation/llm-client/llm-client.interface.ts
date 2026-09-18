/**
 * Single responsibility: Abstract interface defining the contract that any LLM provider must implement.
 * Enables provider swappability (e.g. Groq, OpenAI, Anthropic, Mock).
 */

export const LLM_CLIENT = Symbol('LLM_CLIENT');

export interface LlmCompletionOptions {
  model?: string;
  temperature?: number;
  responseFormat?: 'json_object' | 'text';
}

export interface LlmClient {
  /**
   * Completes a prompt against the configured LLM provider and returns the raw string response.
   */
  completePrompt(systemPrompt: string, userPrompt: string, options?: LlmCompletionOptions): Promise<string>;
}
