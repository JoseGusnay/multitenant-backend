import { Request } from 'express';
import { ITenantResolver } from '../../../../core/interfaces/tenant-resolver.interface';
import { MissingTenantIdentifierException } from '../../../../modules/tenants/domain/exceptions/missing-tenant-identifier.exception';

export class SubdomainTenantResolver implements ITenantResolver {
  /**
   * Resuelve el tenant leyendo el primer segmento del host.
   * Ej: Si la URL es "clienteacme.miapp.com", retornará "clienteacme".
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  public async resolve(request: Request): Promise<string> {
    const host = request.headers.host;
    const lang = request.headers['accept-language']?.includes('en')
      ? 'en'
      : 'es';

    if (!host) {
      throw new MissingTenantIdentifierException(
        'Subdomain (Host header missing)',
        lang,
      );
    }

    // Dividimos el host completo (ej: acme.dominio.com:3000)
    const segments = host.split('.');

    // Si estamos en localhost directo o IP genérica sin subdominio
    if (segments.length < 2) {
      throw new MissingTenantIdentifierException('Subdomain', lang);
    }

    // El primer segmento siempre será el subdominio
    const subdomain = segments[0];

    // Protección extra (por si la petición viene hacia "www" u otros subdominios de sistema)
    if (subdomain === 'www' || subdomain === 'api') {
      throw new MissingTenantIdentifierException(
        `Subdomain (Reserved: ${subdomain})`,
        lang,
      );
    }

    return subdomain;
  }
}
