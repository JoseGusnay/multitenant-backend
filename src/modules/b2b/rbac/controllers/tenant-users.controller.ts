import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { TenantUsersService } from '../services/tenant-users.service';
import { CreateTenantUserDto } from '../dto/create-tenant-user.dto';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { AppPermissions } from '../constants/app-permissions.constant';
import { TenantAccessGuard } from '../../../../core/guards/tenant-access.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { AdvancedQueryDto } from '../../common/dtos/advanced-query.dto';
import type { TenantAwareRequest } from '../../../../core/interfaces/tenant-aware-request.interface';

@Controller('business/users')
@UseGuards(TenantAccessGuard, PermissionsGuard)
export class TenantUsersController {
  constructor(private readonly usersService: TenantUsersService) {}

  @Post()
  @RequirePermission(AppPermissions.TENANT_USER_CREATE)
  async createUser(
    @Req() req: TenantAwareRequest,
    @Body() dto: CreateTenantUserDto,
  ): Promise<import('../entities/tenant-user.entity').TenantUser> {
    return this.usersService.createUser(req.tenant!, dto);
  }

  @Get()
  @RequirePermission(AppPermissions.TENANT_USER_VIEW)
  async getUsers(
    @Req() req: TenantAwareRequest,
    @Query() query: AdvancedQueryDto,
  ): Promise<{
    data: import('../entities/tenant-user.entity').TenantUser[];
    total: number;
  }> {
    return this.usersService.getAllUsers(req.tenant!, query);
  }
}
