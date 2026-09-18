/**
 * Single responsibility: Handles incoming POST /optimize-energy HTTP requests.
 * Validates request payload against optimizeEnergyRequestSchema and delegates to orchestrator.
 * Contains no business logic.
 */

import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { OptimizeEnergyOrchestrator } from './optimize-energy.orchestrator';
import { OptimizeEnergyResponseDto, optimizeEnergyRequestSchema } from './dto';

@Controller('optimize-energy')
export class OptimizeEnergyController {
  constructor(private readonly orchestrator: OptimizeEnergyOrchestrator) {}

  /**
   * Endpoint: POST /optimize-energy
   * Receives scenario and operator notes, delegates to orchestrator, and returns the optimized schedule.
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async optimizeEnergy(
    @Body() body: unknown,
  ): Promise<OptimizeEnergyResponseDto> {
    const validatedRequest = optimizeEnergyRequestSchema.parse(body);
    return this.orchestrator.execute(validatedRequest);
  }
}
