import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { SaasRole } from './saas-role.entity';

@Entity('saas_users')
export class SaasUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @ManyToMany(() => SaasRole, (role) => role.users, { cascade: true })
  @JoinTable({
    name: 'saas_user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles: SaasRole[];

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  countryCode: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ type: 'varchar', nullable: true })
  resetPasswordOtp: string | null;

  @Column({ type: 'timestamp', nullable: true })
  resetPasswordExpires: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}
