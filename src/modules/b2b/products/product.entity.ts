import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { BaseTenantEntity } from '../common/base-tenant.entity';
import { CategoryEntity } from '../categories/category.entity';

@Entity('products')
export class ProductEntity extends BaseTenantEntity {
  @Column({ type: 'varchar', length: 50, unique: true })
  sku: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price: number;

  @Column({ type: 'int', default: 0 })
  stock: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  // Relación con Categoría
  @ManyToOne(() => CategoryEntity)
  @JoinColumn({ name: 'category_id' })
  category: CategoryEntity;
}
