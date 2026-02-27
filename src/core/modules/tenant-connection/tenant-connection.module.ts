import { Module, Global } from '@nestjs/common';
import { TenantConnectionManager } from './tenant-connection.manager';
import {
  TenantConnectionProvider,
  TENANT_CONNECTION,
} from './tenant-connection.provider';
import { TenantMigrationService } from './tenant-migration.service';

@Global() // Se marca como global para que cualquier módulo pueda inyectar la BD de forma transparente usando @Inject(TENANT_CONNECTION)
@Module({
  providers: [
    TenantConnectionManager,
    TenantConnectionProvider,
    TenantMigrationService,
  ],
  exports: [
    TenantConnectionManager,
    TENANT_CONNECTION, // Exportamos el Token para que los repositorios lo inyecten
    TenantMigrationService,
  ],
})
export class TenantConnectionModule {}
