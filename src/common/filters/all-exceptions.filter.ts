import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    if (host.getType() !== 'http') {
      throw exception;
    }

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const httpException = exception instanceof HttpException ? exception : null;

    const correlationId = request.headers['x-correlation-id'] || uuidv4();
    response.setHeader('x-correlation-id', correlationId);

    const status = httpException
      ? httpException.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = httpException
      ? httpException.getResponse()
      : 'Internal server error';

    const requestBody = this.sanitizeForLog((request as any).body);
    const requestQuery = this.sanitizeForLog((request as any).query);
    const requestParams = this.sanitizeForLog((request as any).params);
    const userId =
      (typeof (request as any).user?.sub === 'string' && (request as any).user.sub) ||
      (typeof (request as any).user?.id === 'string' && (request as any).user.id) ||
      undefined;

    this.logger.error(
      `[${correlationId}] ${request.method} ${request.url} - Status: ${status} user=${userId ?? '-'} body=${this.formatForLog(requestBody)} query=${this.formatForLog(requestQuery)} params=${this.formatForLog(requestParams)}`,
      exception instanceof Error ? exception.stack : JSON.stringify(exception),
    );

    const responseBody = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      correlationId: correlationId,
      message:
        status === HttpStatus.INTERNAL_SERVER_ERROR
          ? 'Internal server error'
          : message,
    };

    response.status(status).json(responseBody);
  }

  private sanitizeForLog(value: unknown): unknown {
    const redactKeys = new Set([
      'password',
      'pass',
      'token',
      'accessToken',
      'refreshToken',
      'authorization',
      'jwt',
      'apiKey',
      'secret',
      'clientSecret',
    ]);

    const seen = new WeakSet<object>();

    const walk = (v: unknown): unknown => {
      if (v === null || v === undefined) return v;
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
        return v;
      }
      if (v instanceof Date) return v.toISOString();
      if (Array.isArray(v)) return v.map(walk);
      if (typeof v === 'object') {
        const obj = v as Record<string, unknown>;
        if (seen.has(obj)) return '[Circular]';
        seen.add(obj);

        const out: Record<string, unknown> = {};
        for (const [k, val] of Object.entries(obj)) {
          if (redactKeys.has(k) || redactKeys.has(k.toLowerCase())) {
            out[k] = '[REDACTED]';
          } else {
            out[k] = walk(val);
          }
        }
        return out;
      }
      return String(v);
    };

    return walk(value);
  }

  private formatForLog(value: unknown): string {
    try {
      const str =
        typeof value === 'string' ? value : JSON.stringify(value ?? null);
      if (str.length > 4000) return `${str.slice(0, 4000)}...(truncated)`;
      return str;
    } catch {
      return '[Unserializable]';
    }
  }
}
