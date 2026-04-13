import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const startTime = Date.now();

    const correlationId = request.headers['x-correlation-id'] || uuidv4();
    request.headers['x-correlation-id'] = correlationId;

    const requestBody = this.sanitizeForLog(request.body);
    const requestQuery = this.sanitizeForLog(request.query);
    const requestParams = this.sanitizeForLog(request.params);
    const userId =
      (typeof request.user?.sub === 'string' && request.user.sub) ||
      (typeof request.user?.id === 'string' && request.user.id) ||
      undefined;

    this.logger.log(
      `[${correlationId}] --> ${method} ${url} user=${userId ?? '-'} body=${this.formatForLog(requestBody)} query=${this.formatForLog(requestQuery)} params=${this.formatForLog(requestParams)}`,
    );

    return next.handle().pipe(
      tap({
        next: (data) => {
          const response = context.switchToHttp().getResponse();
          const statusCode = response.statusCode;
          const duration = Date.now() - startTime;
          const responseBody = this.sanitizeForLog(data);

          this.logger.log(
            `[${correlationId}] <-- ${method} ${url} ${statusCode} - ${duration}ms response=${this.formatForLog(responseBody)}`,
          );
        },
        error: (err) => {
          const duration = Date.now() - startTime;
          const message =
            err instanceof Error ? err.message : this.formatForLog(err);
          this.logger.error(
            `[${correlationId}] xx> ${method} ${url} - ${duration}ms error=${message}`,
            err instanceof Error ? err.stack : undefined,
          );
        },
      }),
    );
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
      if (
        typeof v === 'string' ||
        typeof v === 'number' ||
        typeof v === 'boolean'
      ) {
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
