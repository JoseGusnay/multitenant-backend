import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

const TIMESTAMP_TYPE = 'timestamp with time zone';

/**
 * Entidad Abstracta Base (TypeORM)
 * Provee la estructura fundamental para todas las tablas de negocio del Tenant.
 * - UUID central
 * - Tiempos de Auditoría Automáticos
 * - Soft Delete soportado nativamente
 */
export abstract class BaseTenantEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ type: TIMESTAMP_TYPE })
  createdAt: Date;

  @UpdateDateColumn({ type: TIMESTAMP_TYPE })
  updatedAt: Date;

  @DeleteDateColumn({ type: TIMESTAMP_TYPE, nullable: true })
  deletedAt: Date | null;
}
