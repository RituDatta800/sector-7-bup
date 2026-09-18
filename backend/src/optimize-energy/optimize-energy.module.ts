/**
 * Single responsibility: Configures the optimize-energy module by assembling interpretation,
 * guardrail, and optimizer modules with the controller and orchestrator.
 */

import { Module } from '@nestjs/common';
import { InterpretationModule } from '../interpretation';
import { GuardrailsModule } from '../guardrails';
import { OptimizerModule } from '../optimizer';
import { OptimizeEnergyController } from './optimize-energy.controller';
import { OptimizeEnergyOrchestrator } from './optimize-energy.orchestrator';

@Module({
  imports: [InterpretationModule, GuardrailsModule, OptimizerModule],
  controllers: [OptimizeEnergyController],
  providers: [OptimizeEnergyOrchestrator],
  exports: [OptimizeEnergyOrchestrator],
})
export class OptimizeEnergyModule {}
