import { Injectable, Logger } from '@nestjs/common';
import { Tenant } from '../../../modules/tenants/domain/tenant.entity';
import { TenantConnectionManager } from './tenant-connection.manager';

@Injectable()
export class TenantMigrationService {
  private readonly logger = new Logger(TenantMigrationService.name);

  constructor(private readonly connectionManager: TenantConnectionManager) {}

  /**
   * Corre las migraciones físicas de negocio ("Zero-Touch") para un Tenant específico.
   * Se usará por el Worker del Backoffice cuando un cliente se suscribe.
   */
  public async runMigrationsForTenant(tenant: Tenant): Promise<void> {
    this.logger.log(
      `Iniciando aprovisionamiento Zero-Touch para el Tenant: ${tenant.name} (${tenant.id})`,
    );

    // Obtenemos su conexión aislada dedicada (esto instancia DataSource en memoria)
    const dataSource = await this.connectionManager.getTenantConnection(tenant);

    try {
      if (!dataSource.isInitialized) {
        await dataSource.initialize();
      }

      const pendingMigrations = await dataSource.showMigrations();
      if (pendingMigrations) {
        this.logger.log(
          `Existen migraciones pendientes, procediendo a inyectar estructura Schema...`,
        );

        // Inyectamos las tablas base y actualizamos tabla subyacente de control de 'migrations'
        await dataSource.runMigrations({
          transaction: 'all', // Garantizamos que si falla algo de los scripts (ej: productos/categorías), no dejamos un Tenant a medias
        });

        this.logger.log(
          `Aprovisionamiento completado con éxito para ${tenant.subdomain}`,
        );
      } else {
        this.logger.log(
          `El esquema del Tenant ${tenant.subdomain} ya se encuentra actualizado.`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error crítico duranto la migración Zero-Touch del Tenant ${tenant.subdomain}`,
        error,
      );
      throw error;
    }
  }
}
