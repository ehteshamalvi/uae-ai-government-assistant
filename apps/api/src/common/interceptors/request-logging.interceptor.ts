import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable, tap } from 'rxjs';
import { getRequestId } from '../middleware/request-id.middleware';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }
    const req = context.switchToHttp().getRequest<Request>();
    const requestId = getRequestId(req);
    const started = Date.now();
    const method = req.method;
    const path = req.originalUrl ?? req.url;

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.log(
            JSON.stringify({
              requestId: requestId ?? null,
              module: 'http',
              action: `${method} ${path}`,
              durationMs: Date.now() - started,
              timestamp: new Date().toISOString(),
            }),
          );
        },
        error: () => {
          this.logger.warn(
            JSON.stringify({
              requestId: requestId ?? null,
              module: 'http',
              action: `${method} ${path}`,
              durationMs: Date.now() - started,
              outcome: 'error',
              timestamp: new Date().toISOString(),
            }),
          );
        },
      }),
    );
  }
}
