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
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    
    // Generate Correlation ID if not present
    const correlationId = request.headers['x-correlation-id'] || uuidv4();
    response.setHeader('x-correlation-id', correlationId);

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    // Log the error with structured context
    this.logger.error(
      `[${correlationId}] ${request.method} ${request.url} - Status: ${status}`,
      exception instanceof Error ? exception.stack : JSON.stringify(exception),
    );

    // Sanitize response for 500 errors (don't leak stack traces to user)
    const responseBody = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      correlationId: correlationId,
      message: status === HttpStatus.INTERNAL_SERVER_ERROR ? 'Internal server error' : message,
    };

    response.status(status).json(responseBody);
  }
}
