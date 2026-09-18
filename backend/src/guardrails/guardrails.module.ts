/**
 * Single responsibility: Configures and exports the GuardrailsService and its validation rules.
 */

import { Module } from '@nestjs/common';
import { GuardrailsService } from './guardrails.service';

@Module({
  providers: [GuardrailsService],
  exports: [GuardrailsService],
})
export class GuardrailsModule {}
