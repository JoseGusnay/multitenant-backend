import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
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
  ) {}

  async onApplicationBootstrap() {
    this.logger.log('Iniciando verificación de RBAC Master (SaaS Dueño)...');
    await this.seedPermissions();
    await this.seedSuperAdmin();
  }

  private async seedPermissions() {
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

  private async seedSuperAdmin() {
    const adminEmail = 'creador@misaas.com';
    const existingAdmin = await this.userRepo.findOne({
      where: { email: adminEmail },
    });

    if (!existingAdmin) {
      this.logger.log(
        `No se encontró al Global Admin. Creando a ${adminEmail}...`,
      );

      let superRole = await this.roleRepo.findOne({
        where: { name: 'GLOBAL_ADMIN' },
      });
      if (!superRole) {
        // El rol de dios tiene absolútamente todos los permisos de SaaS
        const allPermissions = await this.permRepo.find();
        superRole = this.roleRepo.create({
          name: 'GLOBAL_ADMIN',
          description: 'Dueño absoluto del multi-tenant',
          permissions: allPermissions,
        });
        await this.roleRepo.save(superRole);
      }

      const hashedPassword = await bcrypt.hash('SuperSecretOwnerPassword!', 10);
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
