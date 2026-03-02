import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';

import { HeaderTenantResolver } from './strategies/header-tenant.resolver';
import { SubdomainTenantResolver } from './strategies/subdomain-tenant.resolver';
import { CombinedTenantResolver } from './strategies/combined-tenant.resolver';
import { TenantIdentificationMiddleware } from './tenant-identification.middleware';
import { ITenantResolver } from '../../interfaces/tenant-resolver.interface';

import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantCatalogEntity } from './infrastructure/tenant-catalog.entity';
import { SubscriptionPlanCatalogEntity } from './infrastructure/subscription-plan-catalog.entity';
import { PostgresTenantRepository } from './infrastructure/postgres-tenant.repository';

// 1. Selector de Estrategia de Resolución (Patrón Strategy via Nest Factory)
const TenantResolverProvider = {
  provide: 'ITenantResolver',
  useFactory: (): ITenantResolver => {
    // Soporte Híbrido: Intenta Subdominio -> Cae en Header 'x-tenant-id'
    return new CombinedTenantResolver(
      new SubdomainTenantResolver(),
      new HeaderTenantResolver('x-tenant-id'),
    );
  },
};

const TenantRepositoryProvider = {
  provide: 'ITenantRepository',
  useClass: PostgresTenantRepository, // ⚡ Repositorio Real conectado a Postgres
};

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TenantCatalogEntity,
      SubscriptionPlanCatalogEntity,
    ]),
  ],
  providers: [
    TenantResolverProvider,
    TenantRepositoryProvider,
    TenantIdentificationMiddleware,
  ],
  exports: ['ITenantResolver', 'ITenantRepository'],
})
export class TenantIdentificationModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // 2. Aplicar el Middleware Guardián a las rutas, pero excluir los endpoints del Master Global.
    consumer
      .apply(TenantIdentificationMiddleware)
      .exclude('backoffice/(.*)', 'auth/(.*)', 'saas/(.*)')
      .forRoutes('*');
  }
}
