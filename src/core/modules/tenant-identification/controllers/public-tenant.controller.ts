import {
  Controller,
  Get,
  Param,
  Inject,
  NotFoundException,
  Query,
} from '@nestjs/common';
import type { ITenantRepository } from '../../../interfaces/tenant-repository.interface';

@Controller('public/tenant')
export class PublicTenantController {
  constructor(
    @Inject('ITenantRepository')
    private readonly tenantRepository: ITenantRepository,
  ) { }

  /**
   * Endpoint específico para el 'ask' de Caddy (On-Demand TLS).
   * Caddy envía ?domain=subdominio.dominio.com
   */
  @Get('validate-domain')
  async validateDomain(@Query('domain') domain: string): Promise<void> {
    if (!domain) throw new NotFoundException();

    const normalizedDomain = domain.toLowerCase();

    // Whitelist de dominios del sistema (Apex y API)
    // Esto permite que el dueño del SaaS y la API maestra tengan SSL siempre.
    const systemDomains = ['osodreamer.lat', 'api.osodreamer.lat'];
    if (systemDomains.some((sys) => normalizedDomain.endsWith(sys))) {
      return; // 200 OK - Autorizado para el sistema
    }

    // Lógica para inquilinos dinámicos (procesamiento de subdominios)
    const parts = normalizedDomain.split('.');
    const subdomain =
      parts.length >= 3 ? parts[0] : normalizedDomain.replace('.localhost', '');

    const tenant = await this.tenantRepository.getTenantConfig(subdomain);

    if (!tenant || !tenant.isOperational()) {
      throw new NotFoundException();
    }
    // Si llegamos aquí, Caddy recibe un 200 OK y emite el certificado
  }

  @Get('check/:subdomain')
  async checkTenant(@Param('subdomain') subdomain: string): Promise<{
    exists: boolean;
    isOperational?: boolean;
    status?: string;
    name?: string;
    locale?: string;
  }> {
    // 1. Buscamos el subdominio exacto en la base de datos maestra
    const tenant = await this.tenantRepository.getTenantConfig(subdomain);

    // 2. Si no existe en absoluto, devolvemos 404 para que Angular dibuje el 'WorkspaceNotFound'
    if (!tenant) {
      throw new NotFoundException({
        exists: false,
        message: 'El espacio de trabajo no existe.',
      });
    }

    // 3. Verificamos explícitamente si el negocio está operativo según sus pagos/estado
    const isOperational = tenant.isOperational();

    // 4. Devolvemos metadata inofensiva pero útil para personalizar el inicio de sesión
    return {
      exists: true,
      isOperational,
      status: tenant.status,
      // Se podría añadir logoUrl, primaryColor, etc. en el futuro
      name: tenant.name,
      locale: tenant.locale,
    };
  }
}
