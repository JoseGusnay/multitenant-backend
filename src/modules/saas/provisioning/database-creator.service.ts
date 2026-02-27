import { Injectable, Logger } from '@nestjs/common';
import { Client } from 'pg';

@Injectable()
export class DatabaseCreatorService {
  private readonly logger = new Logger(DatabaseCreatorService.name);

  /**
   * Crea una Base de Datos física en el servidor PostgreSQL Master.
   * Utiliza el paquete nativo 'pg' ya que TypeORM no soporta CREATE DATABASE transaccional.
   *
   * @param dbName Nombre sanitizado (letras, números, guiones bajos) de la BD a crear.
   * @param masterConnectionString URI de conexión al servidor de base de datos principal donde residirán los tenants.
   */
  async createDatabase(
    dbName: string,
    masterConnectionString: string,
    timezone: string = 'America/Guayaquil',
  ): Promise<void> {
    this.logger.log(
      `Conectando al cluster Master para aprovisionar BD: ${dbName} con Timezone: ${timezone}...`,
    );

    const client = new Client({
      connectionString: masterConnectionString,
    });

    try {
      await client.connect();

      // Comprobamos si la base de datos ya existe para evitar errores fatales
      const checkResult = await client.query(
        `SELECT 1 FROM pg_database WHERE datname = $1`,
        [dbName],
      );

      if (checkResult.rowCount !== null && checkResult.rowCount > 0) {
        this.logger.warn(
          `La base de datos ${dbName} ya existe en el servidor Master. Saltando creación física.`,
        );
        return;
      }

      this.logger.log(`Ejecutando DDL: CREATE DATABASE "${dbName}"`);
      await client.query(`CREATE DATABASE "${dbName}"`);

      this.logger.log(
        `Configurando Timezone: ALTER DATABASE "${dbName}" SET timezone TO '${timezone}'`,
      );
      // Nota: ALTER DATABASE no puede ser parametrizado fácilmente en el SET,
      // pero el timezone viene de una lista controlada o validada en capas superiores.
      await client.query(
        `ALTER DATABASE "${dbName}" SET timezone TO '${timezone}'`,
      );

      this.logger.log(
        `Base de datos ${dbName} creada y configurada con éxito.`,
      );
    } catch (error) {
      this.logger.error(
        `Fallo catastrófico al intentar crear la BD ${dbName}`,
        error,
      );
      throw error;
    } finally {
      await client.end();
    }
  }

  /**
   * Método de Compensación (Rollback): Elimina una BD física en caso de fallo.
   * Matará brutalmente conexiones existentes antes de borrar para evadir bloqueos.
   */
  async dropDatabase(
    dbName: string,
    masterConnectionString: string,
  ): Promise<void> {
    this.logger.warn(`Ejecutando Rollback: DROP DATABASE "${dbName}"...`);
    const client = new Client({ connectionString: masterConnectionString });

    try {
      await client.connect();
      // Elimina cualquier conexión zombi a esa BD antes de soltarla
      await client.query(`
        SELECT pg_terminate_backend(pg_stat_activity.pid) 
        FROM pg_stat_activity 
        WHERE pg_stat_activity.datname = '${dbName}' AND pid <> pg_backend_pid();
      `);
      await client.query(`DROP DATABASE IF EXISTS "${dbName}"`);
      this.logger.log(`Base de datos ${dbName} eliminada exitosamente.`);
    } catch (error) {
      this.logger.error(
        `Fallo crítico al eliminar la BD física ${dbName}`,
        error,
      );
    } finally {
      await client.end();
    }
  }

  /**
   * Actualiza el timezone de una base de datos existente.
   */
  async updateDatabaseTimezone(
    dbName: string,
    masterConnectionString: string,
    timezone: string,
  ): Promise<void> {
    const client = new Client({ connectionString: masterConnectionString });
    try {
      await client.connect();
      this.logger.log(
        `Aplicando ALTER DATABASE "${dbName}" SET timezone TO '${timezone}'`,
      );
      await client.query(
        `ALTER DATABASE "${dbName}" SET timezone TO '${timezone}'`,
      );
    } catch (error) {
      this.logger.error(
        `Error al actualizar timezone en BD física ${dbName}`,
        error,
      );
      throw error;
    } finally {
      await client.end();
    }
  }
}
