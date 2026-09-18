/**
 * Single responsibility: Provides validated, typed access to all application environment variables.
 * Central authority: nothing else in the application reads process.env directly.
 */

import { Injectable } from '@nestjs/common';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LLM_PROVIDER: z.string().default('groq'),
  LLM_API_KEY: z.string().default(''),
  LLM_MODEL: z.string().default('llama-3.3-70b-versatile'),
});

export type EnvConfig = z.infer<typeof envSchema>;

@Injectable()
export class ConfigService {
  private readonly config: EnvConfig;

  constructor() {
    const parseResult = envSchema.safeParse(process.env);
    if (!parseResult.success) {
      throw new Error(`Invalid environment configuration: ${JSON.stringify(parseResult.error.format())}`);
    }
    this.config = parseResult.data;
  }

  /**
   * Returns the server listening port.
   */
  get port(): number {
    return this.config.PORT;
  }

  /**
   * Returns the server host binding.
   */
  get host(): string {
    return this.config.HOST;
  }

  /**
   * Returns the current execution environment.
   */
  get nodeEnv(): string {
    return this.config.NODE_ENV;
  }

  /**
   * Returns the configured LLM provider name (e.g. 'groq').
   */
  get llmProvider(): string {
    return this.config.LLM_PROVIDER;
  }

  /**
   * Returns the API key for the LLM provider.
   */
  get llmApiKey(): string {
    return this.config.LLM_API_KEY;
  }

  /**
   * Returns the LLM model identifier.
   */
  get llmModel(): string {
    return this.config.LLM_MODEL;
  }
}
