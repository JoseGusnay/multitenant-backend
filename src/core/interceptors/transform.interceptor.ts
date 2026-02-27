import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request, Response as ExpressResponse } from 'express';
import { StandardResponse } from '../interfaces/standard-response.interface';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  StandardResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<StandardResponse<T>> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<ExpressResponse>();

    // SI ES SSE (Server-Sent Events) O YA SE ENVIARON HEADERS, NO transformar.
    if (
      request.headers['accept'] === 'text/event-stream' ||
      response.headersSent
    ) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => ({
        statusCode: response.statusCode,
        timestamp: new Date().toISOString(),
        path: request.url,
        data: data !== undefined ? data : null,
      })),
    );
  }
}
