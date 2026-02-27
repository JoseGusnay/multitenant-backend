import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
import { TenantUsersService } from '../services/tenant-users.service';
import { CreateTenantUserDto } from '../dto/create-tenant-user.dto';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { AppPermissions } from '../constants/app-permissions.constant';
import { TenantAccessGuard } from '../../../../core/guards/tenant-access.guard';
import { Query } from '@nestjs/common';
import { PageOptionsDto } from '../../../../core/pagination/dto/page-options.dto';
import { AdvancedFilterPipe } from '../../../../core/filters/pipes/advanced-filter.pipe';
import { FilterCondition } from '../../../../core/filters/interfaces/filter-condition.interface';
import { PermissionsGuard } from '../guards/permissions.guard';
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
  ) {
    return this.usersService.createUser(req.tenant!, dto);
  }

  @Get()
  @RequirePermission(AppPermissions.TENANT_USER_VIEW)
  async getUsers(
    @Req() req: TenantAwareRequest,
    @Query() pageOptions: PageOptionsDto,
    @Query(AdvancedFilterPipe) filters: FilterCondition[],
  ) {
    return this.usersService.getAllUsers(req.tenant!, pageOptions, filters);
  }
}
