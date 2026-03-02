import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { SaasUser } from './entities/saas-user.entity';
import { SaasRole } from './entities/saas-role.entity';
import { SaasPermission } from './entities/saas-permission.entity';
import { SaasPermissionNames } from './constants/saas-permissions.constant';

@Injectable()
export class SaasRbacService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SaasRbacService.name);

  constructor(
    @InjectRepository(SaasUser) private readonly userRepo: Repository<SaasUser>,
    @InjectRepository(SaasRole) private readonly roleRepo: Repository<SaasRole>,
    @InjectRepository(SaasPermission)
    private readonly permRepo: Repository<SaasPermission>,
    private readonly configService: ConfigService,
  ) { }

  async onApplicationBootstrap(): Promise<void> {
    this.logger.log('Iniciando verificación de RBAC Master (SaaS Dueño)...');
    await this.seedPermissions();
    await this.seedSuperAdmin();
  }

  private async seedPermissions(): Promise<void> {
    for (const permName of SaasPermissionNames) {
      const exists = await this.permRepo.findOne({ where: { name: permName } });
      if (!exists) {
        const newPerm = this.permRepo.create({
          name: permName,
          description: `Global SaaS Permission: ${permName}`,
        });
        await this.permRepo.save(newPerm);
      }
    }
  }

  private async seedSuperAdmin(): Promise<void> {
    const adminEmail =
      this.configService.get<string>('SAAS_ADMIN_EMAIL') ||
      'creador@misaas.com';
    const adminPassword =
      this.configService.get<string>('SAAS_ADMIN_PASSWORD') ||
      'SuperSecretOwnerPassword!';

    if (adminEmail === 'creador@misaas.com') {
      this.logger.warn(
        '⚠️ IMPORTANTE: Usando email y contraseña por defecto para el Súper Admin. Por favor configura SAAS_ADMIN_EMAIL y SAAS_ADMIN_PASSWORD en tu archivo .env por seguridad.',
      );
    }

    // — 1. Asegurar que GLOBAL_ADMIN siempre tenga TODOS los permisos
    const allPermissions = await this.permRepo.find();
    let superRole = await this.roleRepo.findOne({
      where: { name: 'GLOBAL_ADMIN' },
      relations: ['permissions'],
    });

    if (!superRole) {
      superRole = this.roleRepo.create({
        name: 'GLOBAL_ADMIN',
        description: 'Dueño absoluto del multi-tenant',
        permissions: allPermissions,
      });
      await this.roleRepo.save(superRole);
      this.logger.log('Rol GLOBAL_ADMIN creado con todos los permisos.');
    } else if (superRole.permissions.length !== allPermissions.length) {
      // Sincronizar: si se agregaron permisos nuevos, actualizar el rol
      superRole.permissions = allPermissions;
      await this.roleRepo.save(superRole);
      this.logger.log(
        `Rol GLOBAL_ADMIN sincronizado: ${allPermissions.length} permisos.`,
      );
    }

    // — 2. Crear el Super Admin si no existe
    const existingAdmin = await this.userRepo.findOne({
      where: { email: adminEmail },
    });

    if (!existingAdmin) {
      this.logger.log(
        `No se encontró al Global Admin. Creando a ${adminEmail}...`,
      );

      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      const newUser = this.userRepo.create({
        email: adminEmail,
        passwordHash: hashedPassword,
        roles: [superRole],
      });

      await this.userRepo.save(newUser);
      this.logger.log('Súper Administrador Master creado exitosamente.');
    } else {
      this.logger.log(
        `Global Admin (${adminEmail}) encontrado. Omitiendo semillado.`,
      );
    }
  }
}
