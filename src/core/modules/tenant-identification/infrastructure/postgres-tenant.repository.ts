import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ITenantRepository } from '../../../interfaces/tenant-repository.interface';
import { TenantCatalogEntity } from './tenant-catalog.entity';
import { Tenant } from '../../../../modules/tenants/domain/tenant.entity';
import { PageOptionsDto } from '../../../pagination/dto/page-options.dto';
import { FilterCondition } from '../../../filters/interfaces/filter-condition.interface';
import { PageDto } from '../../../pagination/dto/page.dto';
import { PageMetaDto } from '../../../pagination/dto/page-meta.dto';
import { TypeOrmFilterBuilder } from '../../../filters/builder/typeorm-filter.builder';

import { SubscriptionPlan } from '../../../../modules/tenants/domain/subscription-plan.entity';

@Injectable()
export class PostgresTenantRepository implements ITenantRepository {
  constructor(
    @InjectRepository(TenantCatalogEntity)
    private readonly repository: Repository<TenantCatalogEntity>,
  ) {}

  private mapToDomain(entity: TenantCatalogEntity): Tenant {
    const tenant = new Tenant(
      entity.id,
      entity.name,
      entity.subdomain,
      entity.dbConnectionString,
      entity.status,
      entity.createdAt,
      entity.timezone,
      entity.locale,
      entity.maxUsersCount,
      entity.maxInvoicesCount,
      entity.maxBranchesCount,
      entity.currentPlanId,
      undefined, // La propiedad plan se asignará abajo
      entity.requireMfa,
      entity.allowedIps,
      entity.countryCode,
      entity.phone,
      entity.adminEmail,
    );

    if (entity.plan) {
      tenant.setPlan(
        new SubscriptionPlan(
          entity.plan.id,
          entity.plan.name,
          entity.plan.maxUsers,
          entity.plan.maxInvoices,
          entity.plan.maxBranches,
          entity.plan.description,
          Number(entity.plan.price),
        ),
      );
    }

    return tenant;
  }

  private mapToEntity(tenant: Tenant): TenantCatalogEntity {
    const entity = new TenantCatalogEntity();
    entity.id = tenant.id;
    entity.name = tenant.name;
    entity.subdomain = tenant.subdomain;
    entity.countryCode = tenant.countryCode;
    entity.phone = tenant.phone;
    entity.adminEmail = tenant.adminEmail;
    // Accedemos al campo privado via un getter "fuerte"
    entity.dbConnectionString = tenant.getDbConnectionString();
    entity.status = tenant.status;
    entity.createdAt = tenant.createdAt;
    entity.timezone = tenant.timezone;
    entity.locale = tenant.locale;
    entity.maxUsersCount = tenant.maxUsersCount;
    entity.maxInvoicesCount = tenant.maxInvoicesCount;
    entity.maxBranchesCount = tenant.maxBranchesCount;
    entity.currentPlanId = tenant.currentPlanId;
    entity.requireMfa = tenant.requireMfa;
    entity.allowedIps = tenant.allowedIps;
    return entity;
  }

  async getTenantConfig(subdomain: string): Promise<Tenant | null> {
    const entity = await this.repository.findOne({
      where: { subdomain },
      relations: ['plan'],
    });
    if (!entity) return null;
    return this.mapToDomain(entity);
  }

  async createTenant(tenant: Tenant): Promise<void> {
    const entity = this.mapToEntity(tenant);
    await this.repository.save(entity);
  }

  async deleteTenant(subdomain: string): Promise<void> {
    await this.repository.softDelete({ subdomain });
  }

  private readonly logger = new Logger(PostgresTenantRepository.name);

  async getAllTenants(
    pageOptionsDto: PageOptionsDto,
    filters: FilterCondition[],
  ): Promise<PageDto<Tenant>> {
    this.logger.log(
      `Fetching tenants with options: ${JSON.stringify(pageOptionsDto)} and filters: ${JSON.stringify(filters)}`,
    );
    const queryBuilder = this.repository
      .createQueryBuilder('tenant')
      .leftJoinAndSelect('tenant.plan', 'plan');

    const filterBuilder = new TypeOrmFilterBuilder(queryBuilder, 'tenant');
    filterBuilder.applyFilters(filters);

    queryBuilder
      .orderBy('tenant.createdAt', pageOptionsDto.order)
      .skip(pageOptionsDto.skip)
      .take(pageOptionsDto.take);

    const [entities, itemCount] = await queryBuilder.getManyAndCount();

    this.logger.log(
      `Found ${itemCount} total tenants. Result page entities: ${entities.length}`,
    );

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });
    const domainEntities = entities.map((e) => this.mapToDomain(e));

    return {
      data: domainEntities,
      meta: pageMetaDto,
    } as unknown as PageDto<Tenant>;
  }

  async updateTenant(tenant: Tenant): Promise<void> {
    const entity = this.mapToEntity(tenant);
    await this.repository.save(entity);
  }

  async getStatsCounts(): Promise<any> {
    // 1. Conteos por status
    const statusCounts = await this.repository
      .createQueryBuilder('tenant')
      .select('tenant.status', 'status')
      .addSelect('COUNT(tenant.id)', 'count')
      .groupBy('tenant.status')
      .getRawMany();

    // 2. Crecimiento últimos 30 días
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const growth = await this.repository
      .createQueryBuilder('tenant')
      .select('DATE(tenant.createdAt)', 'date')
      .addSelect('COUNT(tenant.id)', 'count')
      .where('tenant.createdAt >= :date', { date: thirtyDaysAgo })
      .groupBy('DATE(tenant.createdAt)')
      .orderBy('DATE(tenant.createdAt)', 'ASC')
      .getRawMany();

    return {
      statusCounts,
      growth,
    };
  }
}
