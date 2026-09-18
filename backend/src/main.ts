/**
 * Single responsibility: Application entrypoint bootstrapping NestJS with the Fastify platform adapter,
 * configuring global filters, CORS, and listening on the configured host and port.
 */

import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { ConfigService } from './config';
import { GlobalExceptionFilter } from './filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true, bodyLimit: 65536 }),
  );

  // Enable CORS for frontend local test console
  app.enableCors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  // Global exception filter preventing raw stack traces from leaking to clients
  app.useGlobalFilters(new GlobalExceptionFilter());

  const configService = app.get(ConfigService);
  const port = configService.port;
  const host = configService.host;

  await app.listen(port, host);
  console.log(`GridWise LLM Backend listening on http://${host}:${port}`);
}

bootstrap().catch((err) => {
  console.error('Fatal error during application bootstrap:', err);
  process.exit(1);
});
