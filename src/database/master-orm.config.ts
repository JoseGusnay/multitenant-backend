import { DataSource } from 'typeorm';
import { resolve } from 'path';
import { config } from 'dotenv';

import { SubscriptionPlanCatalogEntity } from '../core/modules/tenant-identification/infrastructure/subscription-plan-catalog.entity';
import { TenantCatalogEntity } from '../core/modules/tenant-identification/infrastructure/tenant-catalog.entity';
import { SaasUser } from '../modules/saas/rbac/entities/saas-user.entity';
import { SaasRole } from '../modules/saas/rbac/entities/saas-role.entity';
import { SaasPermission } from '../modules/saas/rbac/entities/saas-permission.entity';

// Cargamos variables de entorno por si se necesitan
config();

/**
 * DataSource Exclusivo para CLI (Generación de Migraciones Maestras - Master DB)
 *
 * Se usa para generar las migraciones en el esquema `public`, donde viven los
 * Tenants, Roles, Usuarios Administrativos (SaaS) y Planes de Suscripción.
 */
export default new DataSource({
    type: 'postgres',
    url:
        process.env.DB_MIGRATION_TEMP_URL ||
        'postgres://postgres:postgres@127.0.0.1:54321/postgres',

    // Incluimos SOLAMENTE las entidades globales o "Master"
    entities: [
        SubscriptionPlanCatalogEntity,
        TenantCatalogEntity,
        SaasUser,
        SaasRole,
        SaasPermission,
    ],

    // Carpeta donde se guardarán los scripts generados para la base maestra
    migrations: [resolve(__dirname, 'migrations/master/*{.ts,.js}')],

    synchronize: false,
    logging: true,
});
