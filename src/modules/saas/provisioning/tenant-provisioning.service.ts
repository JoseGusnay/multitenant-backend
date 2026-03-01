import {
  Inject,
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import { SubscriptionPlan } from '../../tenants/domain/subscription-plan.entity';
import { SubscriptionPlansService } from '../plans/subscription-plans.service';
import { DatabaseCreatorService } from './database-creator.service';
import type { ITenantRepository } from '../../../core/interfaces/tenant-repository.interface';
import { Tenant, TenantStatus } from '../../tenants/domain/tenant.entity';
import { TenantMigrationService } from '../../../core/modules/tenant-connection/tenant-migration.service';
import { TenantConnectionManager } from '../../../core/modules/tenant-connection/tenant-connection.manager';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { Role } from '../../b2b/rbac/entities/role.entity';
import { TenantUser } from '../../b2b/rbac/entities/tenant-user.entity';
import { Permission } from '../../b2b/rbac/entities/permission.entity';
import { AllPermissionNames } from '../../b2b/rbac/constants/app-permissions.constant';
import { Branch } from '../../b2b/branches/branch.entity';
import { ProvisioningDto } from './interfaces/provisioning-data.interface';
import { PageOptionsDto } from '../../../core/pagination/dto/page-options.dto';
import { FilterCondition } from '../../../core/filters/interfaces/filter-condition.interface';
import { PageDto } from '../../../core/pagination/dto/page.dto';
import { UpdateTenantPlanDto } from './dto/update-tenant-plan.dto';
import { TenantStatsDto } from './dto/tenant-stats.dto';
@Injectable()
export class TenantProvisioningService {
  private readonly logger = new Logger(TenantProvisioningService.name);

  private readonly masterDbUrl: string;

  constructor(
    private readonly databaseCreator: DatabaseCreatorService,
    private readonly migrationService: TenantMigrationService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly connectionManager: TenantConnectionManager,
    @Inject('ITenantRepository')
    private readonly tenantRepository: ITenantRepository,
    private readonly plansService: SubscriptionPlansService,
  ) {
    this.masterDbUrl = this.configService.get<string>('DB_MIGRATION_TEMP_URL')!;
  }

  /**
   * Pipeline orquestador para aprovisionar un nuevo Tenant.
   * 1. Genera ID y nombre físico de la DB (tenant_{uuid})
   * 2. Ejecuta CREATE DATABASE en el cluster Master
   * 3. Registra el nuevo Tenant en catálogo master (MockRepository ahora)
   * 4. Dispara Migración Zero sobre esa nueva BD.
   */
  async provisionNewTenant(dto: ProvisioningDto): Promise<Tenant> {
    this.logger.log(
      `>> Iniciando pipeline de aprovisionamiento en BACKGROUND para subdominio: ${dto.subdomain}`,
    );

    // 1. Verificar colisiones (En DB Real aquí buscaríamos por subdomain)
    const existing = await this.tenantRepository.getTenantConfig(dto.subdomain);
    if (existing) {
      throw new ConflictException(
        `El subdominio ${dto.subdomain} ya se encuentra registrado.`,
      );
    }

    // 2. Preparar Entidad Dominio
    const tenantId = uuidv4();
    // Usamos el subdominio para que la Base de Datos sea humanamente identificable (ej: tenant_mi_empresa)
    // Reemplazamos guiones por guiones bajos para mantenerlo 100% compatible con SQL
    const physicalDbName = `tenant_${dto.subdomain.replace(/-/g, '_')}`;

    // Fetch plan limits
    const plan = await this.plansService.findOne(dto.planId || 'BASIC');

    // Inyectamos el host master pero con la bd especifica
    const tenantDbUrl =
      this.masterDbUrl.substring(0, this.masterDbUrl.lastIndexOf('/')) +
      `/${physicalDbName}`;

    // Registra en Master Catalog inmediatamente en estado PROVISIONING
    const newTenant = new Tenant(
      tenantId,
      dto.name,
      dto.subdomain,
      tenantDbUrl,
      TenantStatus.PROVISIONING,
      new Date(),
      dto.timezone || 'America/Guayaquil',
      'es-ES', // locale
      plan.maxUsers,
      plan.maxInvoices,
      plan.maxBranches,
      plan.id,
      undefined, // plan object
      false, // requireMfa
      [], // allowedIps
      dto.countryCode,
      dto.phone,
      dto.adminEmail,
    );
    newTenant.setPlan(plan as unknown as SubscriptionPlan); // Sync tipos DTO → dominio

    await this.tenantRepository.createTenant(newTenant);
    this.logger.log(
      `Tenant ${newTenant.subdomain} encolado rápido en el Catálogo Master. Soltando hilo HTTP...`,
    );

    // Disparamos la tarea pesada sin "await" para que el req HTTP termine y responda
    this.runAsyncProvisioning(newTenant, physicalDbName, dto).catch((e) => {
      this.logger.error('La promesa flotante falló crasamente', e);
    });

    return newTenant;
  }

  /**
   * Proceso desacoplado que hace el trabajo fuerte e informa por Eventos (SSE)
   */
  private async runAsyncProvisioning(
    tenant: Tenant,
    physicalDbName: string,
    dto: ProvisioningDto,
  ): Promise<void> {
    const emit = (status: string, message: string): void => {
      this.eventEmitter.emit(`tenant.provisioning.${tenant.id}`, {
        status,
        message,
      });
    };

    try {
      // Breve delay estético simulado para que el Frontend gane chance de subscribirse al SSE
      await new Promise((resolve) => setTimeout(resolve, 1500));
      emit('starting', 'Registrando datos centrales... listo');

      // 3. Crear DB Física (Falla si Postgres master está caído)
      await this.databaseCreator.createDatabase(
        physicalDbName,
        this.masterDbUrl,
        tenant.timezone,
      );
      emit('db_created', 'Forjando base de datos única (PostgreSQL)... listo');

      // 4. Inyectar Esquema Zero-Touch
      await this.migrationService.runMigrationsForTenant(tenant);
      emit('migrating', 'Afinando modelos de negocio aislados... listo');

      // 5. Semillar Permisos, Rol ADMIN y Dueño Inicial
      if (dto.adminEmail && dto.adminPassword) {
        emit(
          'seeding',
          'Creando matriz de permisos y configurando súper administrador...',
        );
        const connection =
          await this.connectionManager.getTenantConnection(tenant);

        const permissionRepo = connection.getRepository(Permission);
        const roleRepo = connection.getRepository(Role);
        const userRepo = connection.getRepository(TenantUser);

        // a) Sembrando Permisos de la App
        const savedPermissions: Permission[] = [];
        for (const permName of AllPermissionNames) {
          let permission = await permissionRepo.findOne({
            where: { name: permName },
          });
          if (!permission) {
            permission = permissionRepo.create({ name: permName });
            permission = await permissionRepo.save(permission);
          }
          savedPermissions.push(permission);
        }

        // b) Creando Súper Role y enlazándolo a todos los Permisos
        let adminRole = await roleRepo.findOne({
          where: { name: 'SUPER_ADMIN' },
        });
        if (!adminRole) {
          adminRole = roleRepo.create({
            name: 'SUPER_ADMIN',
            permissions: savedPermissions, // <- Magia de TypeORM: Inyecta en la Pivot role_permissions
          });
          await roleRepo.save(adminRole);
        }

        const hashedPassword = await bcrypt.hash(dto.adminPassword, 10);
        const adminUser = userRepo.create({
          email: dto.adminEmail,
          passwordHash: hashedPassword,
          roles: [adminRole],
          isActive: true,
        });
        await userRepo.save(adminUser);

        // d) Sembrando la Sucursal Principal
        const branchRepo = connection.getRepository(Branch);
        const mainBranch = branchRepo.create({
          name: `${tenant.name} - Principal`,
          isActive: true,
          isMain: true,
        });
        await branchRepo.save(mainBranch);

        // Asignamos el admin a la sucursal principal
        adminUser.branches = [mainBranch];
        await userRepo.save(adminUser);

        emit('seeding_done', 'Dueño sembrado con éxito en el Inquilino.');
      }

      // 6. Finalizar
      tenant.changeStatus(TenantStatus.ACTIVE);
      await this.tenantRepository.updateTenant(tenant);

      emit('completed', '¡Todo listo! Entrar al sistema');
      this.logger.log(`Worker finalizado exitosamente. Tenant Active!`);
    } catch (migError) {
      this.logger.error(
        `La creación o migraciones fallaron. Iniciando Rollback de compensación...`,
        migError,
      );
      emit(
        'failed',
        'Error crítico detectado. Destruyendo entidad corrupta y realizando Rollback...',
      );

      try {
        await this.databaseCreator.dropDatabase(
          physicalDbName,
          this.masterDbUrl,
        );
        await this.tenantRepository.deleteTenant(tenant.subdomain);
        this.logger.log(`Rollback exitoso. Tenant limpiado.`);
      } catch (rollbackError) {
        this.logger.error(
          `FALLO CRÍTICO EN ROLLBACK. Posible DB fantasma.`,
          rollbackError,
        );
      }
    }
  }

  async getAllTenants(
    pageOptionsDto: PageOptionsDto,
    filters: FilterCondition[],
  ): Promise<PageDto<Tenant>> {
    return this.tenantRepository.getAllTenants(pageOptionsDto, filters);
  }

  async getTenant(subdomain: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.getTenantConfig(subdomain);
    if (!tenant) {
      throw new NotFoundException(
        `Tenant con subdominio ${subdomain} no fue encontrado`,
      );
    }
    return tenant;
  }

  async updateTenant(
    subdomain: string,
    data: UpdateTenantDto,
  ): Promise<Tenant> {
    const tenant = await this.getTenant(subdomain);

    // Mutadores de dominio controlados y fuertemente tipados
    if (data.name) tenant.changeName(data.name);
    if (data.status) tenant.changeStatus(data.status);
    if (data.countryCode || data.phone) {
      tenant.updateContactDetails(data.countryCode, data.phone);
    }
    if (data.timezone) {
      tenant.changeTimezone(data.timezone);
      const dbName = tenant.getDbConnectionString().split('/').pop();
      if (dbName) {
        await this.databaseCreator.updateDatabaseTimezone(
          dbName,
          this.masterDbUrl,
          data.timezone,
        );
      }
    }

    await this.tenantRepository.updateTenant(tenant);
    return tenant;
  }

  async deleteTenant(subdomain: string): Promise<void> {
    // Al invocar deleteTenant, el PostgresRepository ahora usa softDelete
    await this.tenantRepository.deleteTenant(subdomain);
    this.logger.log(
      `Tenant ${subdomain} marcado como inactivo/eliminado (Soft Delete). Su BD física e información persisten seguras.`,
    );
  }

  async getStats(): Promise<TenantStatsDto> {
    const raw = (await this.tenantRepository.getStatsCounts()) as {
      statusCounts: { status: string; count: string }[];
      growth: { date: string; count: string }[];
    };

    const stats = new TenantStatsDto();
    stats.total = 0;
    stats.active = 0;
    stats.provisioning = 0;
    stats.suspended = 0;
    stats.deleted = 0;

    raw.statusCounts.forEach((sc: { status: string; count: string }) => {
      const count = parseInt(sc.count, 10);
      stats.total += count;
      const status = sc.status as TenantStatus;
      if (status === TenantStatus.ACTIVE) {
        stats.active = count;
      } else if (status === TenantStatus.PROVISIONING) {
        stats.provisioning = count;
      } else if (
        status === TenantStatus.SUSPENDED_PAYMENT ||
        status === TenantStatus.SUSPENDED_VIOLATION
      ) {
        stats.suspended += count;
      } else if (status === TenantStatus.DELETED) {
        stats.deleted = count;
      }
    });

    stats.growthLast30Days = raw.growth.map(
      (g: { date: string; count: string }) => ({
        date: g.date,
        count: parseInt(g.count, 10),
      }),
    );

    return stats;
  }

  async updateTenantPlan(
    subdomain: string,
    dto: UpdateTenantPlanDto,
  ): Promise<Tenant> {
    const tenant = await this.getTenant(subdomain);
    const plan = await this.plansService.findOne(dto.planId);

    tenant.setPlan(plan as unknown as SubscriptionPlan);

    await this.tenantRepository.updateTenant(tenant);
    this.logger.log(
      `Plan del tenant ${subdomain} actualizado a ${plan.name}. Límites sincronizados desde el catálogo central.`,
    );
    return tenant;
  }
}
