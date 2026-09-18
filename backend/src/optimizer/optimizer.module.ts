/**
 * Single responsibility: Configures and exports the OptimizerService and LpSolverAdapter.
 */

import { Module } from '@nestjs/common';
import { OptimizerService } from './optimizer.service';
import { LpSolverAdapter } from './solver';

@Module({
  providers: [OptimizerService, LpSolverAdapter],
  exports: [OptimizerService, LpSolverAdapter],
})
export class OptimizerModule {}
