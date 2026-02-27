import { Module } from '@nestjs/common';
import { RolesController } from './controllers/roles.controller';
import { TenantUsersController } from './controllers/tenant-users.controller';
import { RolesService } from './services/roles.service';
import { TenantUsersService } from './services/tenant-users.service';

@Module({
  controllers: [RolesController, TenantUsersController],
  providers: [RolesService, TenantUsersService],
})
export class RbacModule {}
