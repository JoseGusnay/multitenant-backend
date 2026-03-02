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
import { PasswordUtils } from '../../b2b/common/utils/password.util';
import { WhatsappService } from '../../notifications/whatsapp/whatsapp.service';

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
    private readonly whatsappService: WhatsappService,
  ) {
    this.masterDbUrl = this.configService.get<string>('DB_MIGRATION_TEMP_URL')!;
  }

  /**
   * Pipeline orquestador para aprovisionar un nuevo Tenant.
   */
  async provisionNewTenant(dto: ProvisioningDto): Promise<Tenant> {
    this.logger.log(
      `>> Iniciando pipeline de aprovisionamiento en BACKGROUND para subdominio: ${dto.subdomain}`,
    );

    const existing = await this.tenantRepository.getTenantConfig(dto.subdomain);
    if (existing) {
      throw new ConflictException(
        `El subdominio ${dto.subdomain} ya se encuentra registrado.`,
      );
    }

    const tenantId = uuidv4();
    const physicalDbName = `tenant_${dto.subdomain.replace(/-/g, '_')}`;
    const plan = await this.plansService.findOne(dto.planId || 'BASIC');

    const tenantDbUrl =
      this.masterDbUrl.substring(0, this.masterDbUrl.lastIndexOf('/')) +
      `/${physicalDbName}`;

    const newTenant = new Tenant(
      tenantId,
      dto.name,
      dto.subdomain,
      tenantDbUrl,
      TenantStatus.PROVISIONING,
      new Date(),
      dto.timezone || 'America/Guayaquil',
      'es-ES',
      plan.maxUsers,
      plan.maxInvoices,
      plan.maxBranches,
      plan.id,
      undefined,
      false,
      [],
      dto.countryCode,
      dto.phone,
      dto.adminEmail,
    );
    newTenant.setPlan(plan as unknown as SubscriptionPlan);

    await this.tenantRepository.createTenant(newTenant);
    this.logger.log(
      `Tenant ${newTenant.subdomain} encolado rápido en el Catálogo Master.`,
    );

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
      await new Promise((resolve) => setTimeout(resolve, 1500));
      emit('starting', 'Registrando datos centrales... listo');

      await this.databaseCreator.createDatabase(
        physicalDbName,
        this.masterDbUrl,
        tenant.timezone,
      );
      emit('db_created', 'Forjando base de datos única (PostgreSQL)... listo');

      await this.migrationService.runMigrationsForTenant(tenant);
      emit('migrating', 'Afinando modelos de negocio aislados... listo');

      // 5. Semillar Permisos, Rol ADMIN y Dueño Inicial
      if (dto.adminEmail) {
        emit(
          'seeding',
          'Creando matriz de permisos y configurando súper administrador...',
        );
        const adminPassword =
          dto.adminPassword || PasswordUtils.generateRandomPassword();
        const connection =
          await this.connectionManager.getTenantConnection(tenant);

        const permissionRepo = connection.getRepository(Permission);
        const roleRepo = connection.getRepository(Role);
        const userRepo = connection.getRepository(TenantUser);

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

        let adminRole = await roleRepo.findOne({
          where: { name: 'SUPER_ADMIN' },
        });
        if (!adminRole) {
          adminRole = roleRepo.create({
            name: 'SUPER_ADMIN',
            permissions: savedPermissions,
          });
          await roleRepo.save(adminRole);
        }

        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        const adminUser = userRepo.create({
          email: dto.adminEmail,
          passwordHash: hashedPassword,
          roles: [adminRole],
          isActive: true,
          isProtected: true,
        });
        await userRepo.save(adminUser);

        const branchRepo = connection.getRepository(Branch);
        const mainBranch = branchRepo.create({
          name: `${tenant.name} - Principal`,
          isActive: true,
          isMain: true,
        });
        await branchRepo.save(mainBranch);

        adminUser.branches = [mainBranch];
        await userRepo.save(adminUser);

        emit('seeding_done', 'Dueño sembrado con éxito en el Inquilino.');

        if (tenant.phone) {
          await this.whatsappService.sendTenantCredentials(tenant.phone, {
            tenantName: tenant.name,
            subdomain: tenant.subdomain,
            adminEmail: dto.adminEmail,
            adminPassword,
            timezone: tenant.timezone,
          });
        }
      }

      tenant.changeStatus(TenantStatus.ACTIVE);
      await this.tenantRepository.updateTenant(tenant);

      emit('completed', '¡Todo listo! Entrar al sistema');
      this.logger.log(`Worker finalizado exitosamente. Tenant Active!`);
    } catch (migError) {
      this.logger.error(
        `La creación o migraciones fallaron. Iniciando Rollback...`,
        migError,
      );
      emit('failed', 'Error crítico detectado. Realizando Rollback...');

      try {
        await this.databaseCreator.dropDatabase(
          physicalDbName,
          this.masterDbUrl,
        );
        await this.tenantRepository.deleteTenant(tenant.subdomain);
      } catch (rollbackError) {
        this.logger.error(`FALLO CRÍTICO EN ROLLBACK.`, rollbackError);
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
    await this.tenantRepository.deleteTenant(subdomain);
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

    raw.statusCounts.forEach((sc): void => {
      const count = parseInt(sc.count, 10);
      stats.total += count;
      const status = sc.status as TenantStatus;
      if (status === TenantStatus.ACTIVE) stats.active = count;
      else if (status === TenantStatus.PROVISIONING) stats.provisioning = count;
      else if (
        status === TenantStatus.SUSPENDED_PAYMENT ||
        status === TenantStatus.SUSPENDED_VIOLATION
      ) {
        stats.suspended += count;
      } else if (status === TenantStatus.DELETED) stats.deleted = count;
    });

    stats.growthLast30Days = raw.growth.map(
      (g): { date: string; count: number } => ({
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
    return tenant;
  }

  /**
   * Regenera la contraseña del administrador oficial y envía las credenciales por WhatsApp.
   */
  async sendCredentials(subdomain: string): Promise<{ success: boolean }> {
    const tenant = await this.getTenant(subdomain);

    if (!tenant.adminEmail || !tenant.phone) {
      throw new ConflictException(
        'El tenant no tiene correo o teléfono registrado.',
      );
    }

    const newPassword = PasswordUtils.generateRandomPassword();
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const connection = await this.connectionManager.getTenantConnection(tenant);
    const userRepo = connection.getRepository(TenantUser);

    const user = await userRepo.findOne({
      where: { email: tenant.adminEmail },
    });

    if (!user) {
      throw new NotFoundException(
        `No se encontró el usuario ${tenant.adminEmail} dentro del inquilino.`,
      );
    }

    user.passwordHash = hashedPassword;
    await userRepo.save(user);

    await this.whatsappService.sendTenantCredentials(tenant.phone, {
      tenantName: tenant.name,
      subdomain: tenant.subdomain,
      adminEmail: tenant.adminEmail,
      adminPassword: newPassword,
      timezone: tenant.timezone,
    });

    return { success: true };
  }
}
