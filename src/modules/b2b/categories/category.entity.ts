import { Column, Entity, OneToMany } from 'typeorm';
import { BaseTenantEntity } from '../common/base-tenant.entity';

// Relación con Producto
import { ProductEntity } from '../products/product.entity';

@Entity('categories')
export class CategoryEntity extends BaseTenantEntity {
  @Column({ type: 'varchar', length: 150, unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @OneToMany(() => ProductEntity, (product) => product.category)
  products: ProductEntity[];
}
