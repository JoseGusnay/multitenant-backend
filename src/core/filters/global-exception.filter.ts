import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { InvalidTenantStatusException } from '../../modules/tenants/domain/exceptions/invalid-tenant-status.exception';
import { TenantNotFoundException } from '../../modules/tenants/domain/exceptions/tenant-not-found.exception';
import { MissingTenantIdentifierException } from '../../modules/tenants/domain/exceptions/missing-tenant-identifier.exception';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Internal server error';

    // 1. Mapeo Mágico Hexagonal: De Error de Dominio puro a HTTP
    if (exception instanceof InvalidTenantStatusException) {
      status = HttpStatus.FORBIDDEN;
      message = exception.message;
    } else if (exception instanceof TenantNotFoundException) {
      status = HttpStatus.NOT_FOUND;
      message = exception.message;
    } else if (exception instanceof MissingTenantIdentifierException) {
      status = HttpStatus.BAD_REQUEST;
      message = exception.message;
    }
    // 2. Errores genéricos HTTP de NestJS (class-validator, Passport, etc)
    else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resContext = exception.getResponse() as Record<string, unknown>;
      // Si class-validator generó un arreglo de mensajes, lo conservamos
      message = (resContext.message as string | string[]) || exception.message;
    }
    // 3. Fallos no controlados
    else {
      message = exception.message || 'Internal server error';
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      error: message,
    });
  }
}
