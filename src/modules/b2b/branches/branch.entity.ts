import { Entity, Column } from 'typeorm';
import { BaseTenantEntity } from '../common/base-tenant.entity';

/**
 * Sucursal (Branch) del Tenant.
 * Cada inquilino puede tener múltiples sucursales.
 * La relación con TenantUser se define desde TenantUser (lado propietario)
 * para evitar dependencias circulares de importación.
 */
@Entity('branches')
export class Branch extends BaseTenantEntity {
  @Column()
  name: string;

  @Column({ type: 'varchar', nullable: true })
  address: string | null;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', nullable: true })
  city: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  /** Indica si esta es la sucursal principal del tenant */
  @Column({ name: 'is_main', default: false })
  isMain: boolean;
}
