import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  statusCode: number;
  success: boolean;
  message: string;
  data: T;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => {
        const ctx = context.switchToHttp();
        const response = ctx.getResponse();
        const statusCode = response.statusCode;

        // If data is already in the format, return it as is (avoid double wrapping)
        if (data && data.success !== undefined && data.statusCode !== undefined) {
            return data;
        }

        // Handle specific cases where data might have a message property
        let message = 'Request successful';
        let responseData = data;

        if (data && typeof data === 'object') {
          if (data.message) {
            message = data.message;
            // Optionally remove message from data if it's redundant, but keeping it is safer for now
             if (Object.keys(data).length === 1) {
                 responseData = null; // Only message was returned
             }
          }
        }

        return {
          statusCode,
          success: true,
          message,
          data: responseData,
        };
      }),
    );
  }
}
