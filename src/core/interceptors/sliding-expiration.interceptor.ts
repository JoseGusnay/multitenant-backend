import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  Scope,
} from '@nestjs/common';
import { ModuleRef, ContextIdFactory } from '@nestjs/core';
import { Observable, switchMap } from 'rxjs';
import { AuthService } from '../../modules/saas/auth/auth.service';
import { B2bAuthService } from '../../modules/b2b/auth/b2b-auth.service';
import { Response } from 'express';

@Injectable({ scope: Scope.REQUEST })
export class SlidingExpirationInterceptor implements NestInterceptor {
  private readonly logger = new Logger(SlidingExpirationInterceptor.name);

  constructor(private readonly moduleRef: ModuleRef) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse<Response>();
    const user = request.user;

    // SI ES SSE (Server-Sent Events), NO intentar refrescar token via Headers.
    // SSE mantiene la conexión abierta y los headers se envían al inicio;
    // no se pueden modificar después del primer evento.
    if (request.headers['accept'] === 'text/event-stream') {
      return next.handle();
    }

    // Si no hay usuario autenticado (petición pública), seguimos normal y rápido
    if (!user || !user.sub) {
      return next.handle();
    }

    return next.handle().pipe(
      switchMap(async (data) => {
        try {
          let refreshPromise: Promise<{ access_token: string }> | null = null;
          const contextId = ContextIdFactory.getByRequest(request);

          if (user.isGlobalAdmin) {
            const saasAuthService = await this.moduleRef.resolve(
              AuthService,
              contextId,
              { strict: false },
            );
            refreshPromise = saasAuthService.refresh(user);
          } else if (user.tenantId) {
            const b2bAuthService = await this.moduleRef.resolve(
              B2bAuthService,
              contextId,
              { strict: false },
            );
            refreshPromise = b2bAuthService.refresh(user);
          }

          if (refreshPromise) {
            const { access_token } = await refreshPromise;

            // CRITICAL: Verificar si los headers ya fueron enviados (como en SSE)
            // antes de intentar modificarlos.
            if (!response.headersSent) {
              response.setHeader('X-Refresh-Token', access_token);
              response.setHeader(
                'Access-Control-Expose-Headers',
                'X-Refresh-Token',
              );
            }
          }
        } catch (error) {
          this.logger.error(
            'Error durante el refresco automático de token',
            error,
          );
        }
        return data as unknown;
      }),
    );
  }
}
