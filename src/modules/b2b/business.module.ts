import { Module } from '@nestjs/common';
import { CategoriesModule } from './categories/categories.module';
import { RbacModule } from './rbac/rbac.module';
import { B2bAuthModule } from './auth/b2b-auth.module';

/**
 * BusinessModule orquesta todos los módulos del "Dominio de Negocio"
 * que viven DENTRO de un Tenant (Product, Category, Sales, Users, etc).
 */
@Module({
  imports: [CategoriesModule, RbacModule, B2bAuthModule],
  // Exportar aquí cualquier proveedor si fuera necesario
})
export class BusinessModule {}
