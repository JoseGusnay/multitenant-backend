import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { SaasUser } from './entities/saas-user.entity';
import { SaasRole } from './entities/saas-role.entity';
import { SaasPermission } from './entities/saas-permission.entity';
import { SaasRbacService } from './saas-rbac.service';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([SaasUser, SaasRole, SaasPermission]),
  ],
  providers: [SaasRbacService, RolesService, UsersService],
  exports: [SaasRbacService, RolesService, UsersService],
  controllers: [RolesController, UsersController],
})
export class SaasRbacModule {}
