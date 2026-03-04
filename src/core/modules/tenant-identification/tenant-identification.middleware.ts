import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import type { ITenantResolver } from '../../interfaces/tenant-resolver.interface';
import type { ITenantRepository } from '../../interfaces/tenant-repository.interface';
import { InvalidTenantStatusException } from '../../../modules/tenants/domain/exceptions/invalid-tenant-status.exception';
import { TenantNotFoundException } from '../../../modules/tenants/domain/exceptions/tenant-not-found.exception';
import { Tenant } from '../../../modules/tenants/domain/tenant.entity';
import { TenantAwareRequest } from '../../interfaces/tenant-aware-request.interface';

@Injectable()
export class TenantIdentificationMiddleware implements NestMiddleware {
  constructor(
    @Inject('ITenantResolver') private readonly resolver: ITenantResolver,
    @Inject('ITenantRepository') private readonly repository: ITenantRepository,
  ) { }

  async use(
    req: TenantAwareRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    // 0. BYPASS MANUAL (A prueba de fallos con Global Prefix de NestJS)
    const bypassRoutes = ['/api/auth/', '/api/saas/', '/api/backoffice/'];
    if (bypassRoutes.some((route) => req.path.startsWith(route))) {
      return next();
    }

    try {
      // 1. Resolvemos el ID o Subdominio de la petición
      const identifier = await this.resolver.resolve(req);

      // 2. Buscamos el Tenant en Master/Cache (Ahora retorna la Entidad Pura)
      const tenant = await this.repository.getTenantConfig(identifier);

      if (!tenant) {
        const lang = req.headers['accept-language']?.includes('en')
          ? 'en'
          : 'es';
        throw new TenantNotFoundException(identifier, lang);
      }

      // El dominio decide si es operativo o no
      if (!tenant.isOperational()) {
        const lang = req.headers['accept-language']?.includes('en')
          ? 'en'
          : 'es';
        throw new InvalidTenantStatusException(
          tenant.subdomain,
          tenant.status,
          lang,
        );
      }

      // 3. Inyectamos la entidad fuerte en la Request de Express
      req.tenant = tenant;

      next();
    } catch (error) {
      // Delegamos el error al manejador global de NestJS
      next(error);
    }
  }
}
