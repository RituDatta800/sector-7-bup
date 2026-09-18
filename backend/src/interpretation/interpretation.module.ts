/**
 * Single responsibility: Module configuring interpretation providers and LLM client dependencies.
 */

import { Module } from '@nestjs/common';
import { LlmClientModule } from './llm-client';
import { InterpretationService } from './interpretation.service';

@Module({
  imports: [LlmClientModule],
  providers: [InterpretationService],
  exports: [InterpretationService],
})
export class InterpretationModule {}
