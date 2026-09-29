import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { loadEnv } from './infra/env';
import { correlationMiddleware } from './infra/request-context';
import { ProblemFilter } from './infra/errors';
import { AuditService } from './audit/audit.service';
import { logger } from './infra/logger';

async function bootstrap() {
  const env = loadEnv(); // fail fast before anything else starts
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });
  app.use(helmet({
    contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
    hsts: { maxAge: 31536000, includeSubDomains: true },
  }));
  app.use(correlationMiddleware);
  app.useGlobalFilters(new ProblemFilter(app.get(AuditService)));
  app.enableShutdownHooks();
  await app.listen(env.API_PORT);
  logger.info({ port: env.API_PORT, env: env.PLATFORM_ENV, mockIdp: env.MOCK_IDP_ENABLED }, 'api started');
}

bootstrap().catch((e) => {
  logger.fatal({ err: e.message }, 'api failed to start');
  process.exit(1);
});
