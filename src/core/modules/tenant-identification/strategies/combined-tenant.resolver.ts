import { Request } from 'express';
import { ITenantResolver } from '../../../../core/interfaces/tenant-resolver.interface';
import { SubdomainTenantResolver } from './subdomain-tenant.resolver';
import { HeaderTenantResolver } from './header-tenant.resolver';

/**
 * Estrategia de Resolución Híbrida.
 * Intenta primero por Subdominio (Web) y si falla, intenta por Header (Mobile/Pre-vuelos/Postman).
 */
export class CombinedTenantResolver implements ITenantResolver {
  constructor(
    private readonly subdomainResolver: SubdomainTenantResolver,
    private readonly headerResolver: HeaderTenantResolver,
  ) {}

  public async resolve(request: Request): Promise<string> {
    try {
      // 1. Intentar resolver por Subdominio de URL
      return await this.subdomainResolver.resolve(request);
    } catch (subdomainError) {
      // 2. Si falla (ej: estamos en localhost directo, IP o app mobile), intentar por Header
      try {
        return await this.headerResolver.resolve(request);
      } catch {
        // Si ambos fallan, relanzamos el error de falta de identificación original (el de subdominio)
        throw subdomainError;
      }
    }
  }
}
