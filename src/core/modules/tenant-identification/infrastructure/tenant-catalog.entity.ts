import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TenantStatus } from '../../../../modules/tenants/domain/tenant.entity';
import { SubscriptionPlanCatalogEntity } from './subscription-plan-catalog.entity';

@Entity('tenants')
export class TenantCatalogEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ name: 'country_code', nullable: true })
  countryCode?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ unique: true })
  subdomain: string;

  @Column({ name: 'db_connection_string' })
  dbConnectionString: string;

  @Column({ type: 'varchar', default: TenantStatus.PROVISIONING })
  status: TenantStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ default: 'UTC' })
  timezone: string;

  @Column({ default: 'es-ES' })
  locale: string;

  @Column({ name: 'max_users_count', default: 10 })
  maxUsersCount: number;

  @Column({ name: 'max_invoices_count', default: 100 })
  maxInvoicesCount: number;

  @Column({ name: 'max_branches_count', default: 1 })
  maxBranchesCount: number;

  @Column({ name: 'current_plan_id', default: 'BASIC' })
  currentPlanId: string;

  @ManyToOne(() => SubscriptionPlanCatalogEntity)
  @JoinColumn({ name: 'current_plan_id' })
  plan?: SubscriptionPlanCatalogEntity;

  @Column({ name: 'require_mfa', default: false })
  requireMfa: boolean;

  @Column({ name: 'admin_email', nullable: true })
  adminEmail?: string;

  @Column({ type: 'jsonb', default: [] })
  allowedIps: string[];

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date;
}
