import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm';
import { SaasRole } from './saas-role.entity';

@Entity('saas_permissions')
export class SaasPermission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string; // ej. SAAS_PROVISIONING_EXECUTE, SAAS_TENANTS_VIEW

  @Column({ nullable: true })
  description?: string;

  // TypeORM generará la tabla pivote role_permissions
  @ManyToMany(() => SaasRole, (role) => role.permissions)
  roles: SaasRole[];
}
