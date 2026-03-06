import {
  Controller,
  Get,
  Param,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import type { ITenantRepository } from '../../../interfaces/tenant-repository.interface';

@Controller('public/tenant')
export class PublicTenantController {
  constructor(
    @Inject('ITenantRepository')
    private readonly tenantRepository: ITenantRepository,
  ) {}

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
