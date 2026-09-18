/**
 * Single responsibility: Root application module importing all feature and infrastructural modules.
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from './config';
import { HealthModule } from './health';
import { OptimizeEnergyModule } from './optimize-energy';

@Module({
  imports: [ConfigModule, HealthModule, OptimizeEnergyModule],
})
export class AppModule {}
