import { Provider, Scope } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TenantAwareRequest } from '../../interfaces/tenant-aware-request.interface';
import { TenantConnectionManager } from './tenant-connection.manager';
import { MissingTenantIdentifierException } from '../../../modules/tenants/domain/exceptions/missing-tenant-identifier.exception';

/**
 * Token de Inyección (Symbol) usado a lo largo de la app para pedir
 * el DataSource (conexión) correcta.
 */
export const TENANT_CONNECTION = 'TENANT_CONNECTION';

/**
 * Factory Provider de NestJS.
 * Es crítico que tenga `Scope.REQUEST` para que se instancie una vez
 * por cada petición web individual.
 * Aquí "pegamos" el middleware con el connection manager.
 */
export const TenantConnectionProvider: Provider = {
  provide: TENANT_CONNECTION,
  scope: Scope.REQUEST,
  inject: ['REQUEST', TenantConnectionManager],
  useFactory: async (
    request: TenantAwareRequest,
    connectionManager: TenantConnectionManager,
  ): Promise<DataSource> => {
    // 1. Verificamos que el Middleware de Identificación (`TenantIdentificationMiddleware`)
    //    haya inyectado exitosamente la entidad del tenant en el request de Express.
    if (!request.tenant) {
      // Como el middleware debería fallar antes que esto si no hay tenant,
      // esto actúa como el último seguro "Fail-Safe".
      const lang = request.headers['accept-language']?.includes('en')
        ? 'en'
        : 'es';
      throw new MissingTenantIdentifierException(
        'Request Context (Fail-safe Provider)',
        lang,
      );
    }

    // 2. Le pedimos al Manager (que es Singleton/Global) que saque o genere un DataSource
    const dataSource = await connectionManager.getTenantConnection(
      request.tenant,
    );
    return dataSource;
  },
};
