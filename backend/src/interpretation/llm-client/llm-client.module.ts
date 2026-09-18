/**
 * Single responsibility: Configures and provides the LlmClient provider.
 */

import { Module } from '@nestjs/common';
import { LLM_CLIENT } from './llm-client.interface';
import { GroqLlmClient } from './groq-llm-client';

@Module({
  providers: [
    GroqLlmClient,
    {
      provide: LLM_CLIENT,
      useExisting: GroqLlmClient,
    },
  ],
  exports: [LLM_CLIENT, GroqLlmClient],
})
export class LlmClientModule {}
