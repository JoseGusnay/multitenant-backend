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
import { SaasPermission } from './saas-permission.entity';
import { SaasUser } from './saas-user.entity';

@Entity('saas_roles')
export class SaasRole {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  description?: string;

  @ManyToMany(() => SaasPermission, (permission) => permission.roles, {
    cascade: true,
  })
  @JoinTable({
    name: 'saas_role_permissions',
    joinColumn: { name: 'role_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
  })
  permissions: SaasPermission[];

  @ManyToMany(() => SaasUser, (user) => user.roles)
  users: SaasUser[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}
