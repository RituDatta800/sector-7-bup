/**
 * Single responsibility: Executes basic liveness/readiness health checks for the service.
 */

import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  /**
   * Returns exactly { status: 'ok' } per the API contract.
   */
  check(): { status: string } {
    return { status: 'ok' };
  }
}
