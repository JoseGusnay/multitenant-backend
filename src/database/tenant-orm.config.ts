import { DataSource } from 'typeorm';
import { resolve } from 'path';
import { config } from 'dotenv';
import { ProductEntity } from '../modules/b2b/products/product.entity';
import { CategoryEntity } from '../modules/b2b/categories/category.entity';

import { Role } from '../modules/b2b/rbac/entities/role.entity';
import { Permission } from '../modules/b2b/rbac/entities/permission.entity';
import { TenantUser } from '../modules/b2b/rbac/entities/tenant-user.entity';

// Cargamos variables de entorno por si se necesitan (es buena práctica)
config();

/**
 * DataSource Exclusivo para CLI (Generación de Migraciones de Inquilinos)
 *
 * ATENCIÓN: Esta configuración NO se usa en tiempo de ejecución.
 * Su único fin es que el CLI de TypeORM pueda leer nuestras Entidades
 * (`ProductEntity`, `CategoryEntity`) y comparar contra una base de datos local
 * de desarrollo temporal, para auto-generar los scripts SQL de Migración.
 */
export default new DataSource({
  type: 'postgres',
  // BD Temporal de desarrollo para generar las migraciones contra ella
  url:
    process.env.DB_MIGRATION_TEMP_URL ||
    'postgres://postgres:postgres@127.0.0.1:54321/postgres',

  // Incluimos SOLAMENTE las entidades que vivirán dentro de cada Tenant.
  // NO INCLUIR AQUÍ LAS ENTIDADES MASTER (Admin, Tenants Globales).
  entities: [ProductEntity, CategoryEntity, Role, Permission, TenantUser],

  // Carpeta donde se guardarán los scripts generados ("Migración Zero")
  migrations: [resolve(__dirname, 'migrations/tenant/*{.ts,.js}')],

  synchronize: false, // Las migraciones reemplazan a synchronize=true
  logging: true,
});
