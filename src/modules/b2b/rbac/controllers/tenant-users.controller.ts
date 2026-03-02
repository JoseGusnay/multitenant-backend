import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Req,
  Query,
  Param,
  Patch,
  Delete,
} from '@nestjs/common';
import { TenantUsersService } from '../services/tenant-users.service';
import { CreateTenantUserDto } from '../dto/create-tenant-user.dto';
import { UpdateTenantUserDto } from '../dto/update-tenant-user.dto';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { AppPermissions } from '../constants/app-permissions.constant';
import { TenantAccessGuard } from '../../../../core/guards/tenant-access.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { AdvancedQueryDto } from '../../common/dtos/advanced-query.dto';
import type { TenantAwareRequest } from '../../../../core/interfaces/tenant-aware-request.interface';
import { TenantUser } from '../entities/tenant-user.entity';

@Controller('business/users')
@UseGuards(TenantAccessGuard, PermissionsGuard)
export class TenantUsersController {
  constructor(private readonly usersService: TenantUsersService) { }

  @Post()
  @RequirePermission(AppPermissions.TENANT_USER_CREATE)
  async createUser(
    @Req() req: TenantAwareRequest,
    @Body() dto: CreateTenantUserDto,
  ): Promise<TenantUser> {
    return this.usersService.createUser(req.tenant!, dto);
  }

  @Get()
  @RequirePermission(AppPermissions.TENANT_USER_VIEW)
  async getUsers(
    @Req() req: TenantAwareRequest,
    @Query() query: AdvancedQueryDto,
  ): Promise<{ data: TenantUser[]; total: number }> {
    return this.usersService.getAllUsers(req.tenant!, query);
  }

  @Get(':id')
  @RequirePermission(AppPermissions.TENANT_USER_VIEW)
  async getUser(
    @Req() req: TenantAwareRequest,
    @Param('id') id: string,
  ): Promise<TenantUser> {
    return this.usersService.getUserById(req.tenant!, id);
  }

  @Patch(':id')
  @RequirePermission(AppPermissions.TENANT_USER_UPDATE)
  async updateUser(
    @Req() req: TenantAwareRequest,
    @Param('id') id: string,
    @Body() dto: UpdateTenantUserDto,
  ): Promise<TenantUser> {
    return this.usersService.updateUser(req.tenant!, id, dto);
  }

  @Delete(':id')
  @RequirePermission(AppPermissions.TENANT_USER_DELETE)
  async deleteUser(
    @Req() req: TenantAwareRequest,
    @Param('id') id: string,
  ): Promise<{ success: boolean; message: string }> {
    const currentUserId = (req as TenantAwareRequest & { user: { sub: string } }).user?.sub;
    return this.usersService.deleteUser(req.tenant!, id, currentUserId);
  }
}
