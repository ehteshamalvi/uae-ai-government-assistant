import { NestFactory, Reflector } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { DemoAuthGuard } from './common/guards/demo-auth.guard';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';
import { PrismaService } from './modules/prisma/prisma.service';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const prisma = app.get(PrismaService);
  const reflector = app.get(Reflector);
  const logger = new Logger('Bootstrap');

  const isProd = Boolean(config.get<boolean>('isProd'));
  const webOrigin = (config.get<string>('webOrigin') ?? '').trim();

  if (isProd && !webOrigin) {
    throw new Error(
      'WEB_ORIGIN is required when NODE_ENV=production (wildcard CORS is disabled)',
    );
  }

  app.setGlobalPrefix('api');

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  const requestIdMiddleware = new RequestIdMiddleware();
  app.use((req: Request, res: Response, next: NextFunction) => {
    requestIdMiddleware.use(req, res, next);
  });

  const allowedOrigins = (webOrigin || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin not allowed by CORS: ${origin}`), false);
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'Accept'],
    exposedHeaders: ['X-Request-Id'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalGuards(new DemoAuthGuard(prisma, reflector));

  const port = config.get<number>('port') ?? 3001;
  await app.listen(port);
  logger.log(
    `GovFlow API listening on http://localhost:${port}/api (demoMode=${String(config.get('demoMode'))}, ai=${String(config.get('aiProvider'))})`,
  );
}

void bootstrap();
