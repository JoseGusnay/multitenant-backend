import { Entity, Column, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('subscription_plans')
export class SubscriptionPlanCatalogEntity {
  @PrimaryColumn()
  id: string; // e.g., 'BASIC', 'PRO', 'ENTERPRISE'

  @Column()
  name: string;

  @Column({ name: 'max_users' })
  maxUsers: number;

  @Column({ name: 'max_invoices' })
  maxInvoices: number;

  @Column({ name: 'max_branches' })
  maxBranches: number;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
