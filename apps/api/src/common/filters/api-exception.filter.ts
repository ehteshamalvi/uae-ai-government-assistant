import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { getRequestId } from '../middleware/request-id.middleware';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ApiExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId =
      getRequestId(request) ?? response.getHeader('X-Request-Id');

    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'INTERNAL_ERROR';
    let message = 'Unexpected server error';
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (body && typeof body === 'object') {
        const obj = body as Record<string, unknown>;
        message = Array.isArray(obj.message)
          ? obj.message.map(String).join(', ')
          : typeof obj.message === 'string'
            ? obj.message
            : exception.message;
        // Only expose validation detail messages, not internal stacks
        if (status === 400 && Array.isArray(obj.message)) {
          details = obj.message;
        }
        if (status === 400) errorCode = 'VALIDATION_ERROR';
        else if (status === 401) errorCode = 'UNAUTHORIZED';
        else if (status === 403) errorCode = 'FORBIDDEN';
        else if (status === 404) errorCode = 'NOT_FOUND';
        else if (status === 429) errorCode = 'RATE_LIMITED';
        else errorCode = 'HTTP_ERROR';
      }
    } else if (exception instanceof Error) {
      this.logger.error(
        `Unhandled error requestId=${String(requestId)} message=${exception.message}`,
      );
      message = 'Unexpected server error';
      errorCode = 'INTERNAL_ERROR';
      details = undefined;
    }

    if (status >= 500) {
      this.logger.error(
        `status=${status} requestId=${String(requestId)} path=${request.url}`,
      );
    }

    response.status(status).json({
      statusCode: status,
      error: errorCode,
      errorCode,
      message,
      ...(details !== undefined ? { details } : {}),
      requestId: requestId ?? null,
    });
  }
}
