/**
 * Single responsibility: Configures and exports the centralized ConfigService as a global module.
 */

import { Global, Module } from '@nestjs/common';
import { ConfigService } from './config.service';

@Global()
@Module({
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}
