import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Role } from './role.entity';
import { Branch } from '../../branches/branch.entity';

@Entity('tenant_users')
export class TenantUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'first_name', type: 'varchar', nullable: true })
  firstName: string | null;

  @Column({ name: 'last_name', type: 'varchar', nullable: true })
  lastName: string | null;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'is_protected', default: false })
  isProtected: boolean;

  @Column({ name: 'country_code', type: 'varchar', nullable: true })
  countryCode: string | null;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @Column({ name: 'reset_password_otp', type: 'varchar', nullable: true })
  resetPasswordOtp: string | null;

  @Column({ name: 'reset_password_expires', type: 'timestamp', nullable: true })
  resetPasswordExpires: Date | null;

  get fullName(): string {
    return (
      [this.firstName, this.lastName].filter(Boolean).join(' ') || this.email
    );
  }

  @ManyToMany(() => Role)
  @JoinTable({
    name: 'tenant_user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles: Role[];

  /** Sucursales a las que este usuario tiene acceso */
  @ManyToMany(() => Branch)
  @JoinTable({
    name: 'tenant_user_branches',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'branch_id', referencedColumnName: 'id' },
  })
  branches: Branch[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
