import {
  BadRequestException,
  Injectable,
  NestMiddleware,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

const REQUEST_ID_HEADER = 'x-request-id';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const incoming = req.header(REQUEST_ID_HEADER)?.trim();
    let requestId: string;
    if (incoming) {
      if (!/^[A-Za-z0-9_-]{8,64}$/.test(incoming)) {
        throw new BadRequestException('Invalid X-Request-Id');
      }
      requestId = incoming;
    } else {
      requestId = randomUUID();
    }
    (req as Request & { requestId?: string }).requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    next();
  }
}

export function getRequestId(req: Request): string | undefined {
  return (req as Request & { requestId?: string }).requestId;
}
