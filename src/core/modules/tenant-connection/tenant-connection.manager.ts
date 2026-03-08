import { Injectable, OnApplicationShutdown, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Tenant } from '../../../modules/tenants/domain/tenant.entity';
import { CachedConnection } from './interfaces/cached-connection.interface';

@Injectable()
export class TenantConnectionManager implements OnApplicationShutdown {
  private readonly logger = new Logger(TenantConnectionManager.name);

  // Caché en memoria de conexiones activas apoyado de Metadata temporal
  private readonly connectionMap: Map<string, CachedConnection> = new Map();

  // Limpiar conexiones inactivas durante más de 1 hora
  private readonly IDLE_TIMEOUT_MS = 60 * 60 * 1000;

  /**
   * Obtiene o crea una conexión a la BD física del Tenant especificado.
   * Diseñado para producción continua: reutiliza conexiones si ya existen y refresca su acceso.
   */
  public async getTenantConnection(tenant: Tenant): Promise<DataSource> {
    const tenantId = tenant.id;

    if (this.connectionMap.has(tenantId)) {
      const cached = this.connectionMap.get(tenantId);
      if (cached && cached.dataSource.isInitialized) {
        cached.lastAccess = Date.now(); // Freshen cache
        this.logger.debug(
          `Reutilizando la conexión cacheada para el Tenant: ${tenant.name}`,
        );
        return cached.dataSource;
      }
    }

    this.logger.log(
      `Creando nueva conexión DataSource para el Tenant: ${tenant.name}`,
    );

    const newDataSource = new DataSource({
      type: 'postgres',
      url: tenant.getConnectionString(),
      logging: false, // Apagado para evitar saturar stdout
      entities: [__dirname + '/../../../modules/b2b/**/*.entity{.ts,.js}'],
      migrations: [
        __dirname + '/../../../database/migrations/tenant/*{.ts,.js}',
      ],
      migrationsRun: true, // AUTO-EJECUTA LAS MIGRACIONES PENDIENTES DEL TENANT AL CONECTAR
      synchronize: false, // NUNCA usar en prod
      poolSize: 10,
      extra: {
        application_name: `tenant_${tenant.subdomain}_app`,
        timezone: tenant.timezone, // Fuerza la zona horaria a nivel de sesión de Postgres
      },
    });

    await newDataSource.initialize();
    this.connectionMap.set(tenantId, {
      dataSource: newDataSource,
      lastAccess: Date.now(),
    });

    return newDataSource;
  }

  /**
   * Política de Evicción de Conexiones Inactivas (Garbage Collector).
   * Ejecuta esta purga automáticamente cada 30 minutos sin bloquear el I/O Loop.
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async evictIdleConnections(): Promise<void> {
    const now = Date.now();
    let evictedCount = 0;

    for (const [tenantId, cached] of this.connectionMap.entries()) {
      if (now - cached.lastAccess > this.IDLE_TIMEOUT_MS) {
        this.logger.log(
          `Conexión del Tenant ${tenantId} inactiva. Ejecutando Eviction Policy...`,
        );
        try {
          if (cached.dataSource.isInitialized) {
            await cached.dataSource.destroy();
          }
          this.connectionMap.delete(tenantId);
          evictedCount++;
        } catch (error) {
          this.logger.error(
            `Error al desalojar conexión del Tenant ${tenantId}`,
            error,
          );
        }
      }
    }

    if (evictedCount > 0) {
      this.logger.log(
        `Eviction Completado: Se liberaron ${evictedCount} piscina(s) de memoria.`,
      );
    }
  }

  /**
   * Limpieza elegante (Graceful Shutdown).
   */
  async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.log(
      `Señal ${signal} recibida, destruyendo ${this.connectionMap.size} conexiones de Tenants...`,
    );

    for (const [tenantId, cached] of this.connectionMap.entries()) {
      if (cached.dataSource.isInitialized) {
        try {
          await cached.dataSource.destroy();
          this.logger.log(
            `Conexión destruida exitosamente para el Tenant ID: ${tenantId}`,
          );
        } catch (error) {
          this.logger.error(
            `Error al destruir conexión del Tenant ID: ${tenantId}`,
            error,
          );
        }
      }
    }

    this.connectionMap.clear();
  }
}
