/**
 * Single responsibility: Handles incoming GET /health HTTP requests by delegating to HealthService.
 */

import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * Responds to GET /health requests with system health status.
   */
  @Get()
  getHealth(): { status: string } {
    return this.healthService.check();
  }
}
