import {
  Controller,
  Post,
  Body,
  Get,
  Delete,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { RolesService } from '../services/roles.service';
import { CreateRoleDto } from '../dto/create-role.dto';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { AppPermissions } from '../constants/app-permissions.constant';
import { TenantAccessGuard } from '../../../../core/guards/tenant-access.guard';
import { Query } from '@nestjs/common';
import { PageOptionsDto } from '../../../../core/pagination/dto/page-options.dto';
import { AdvancedFilterPipe } from '../../../../core/filters/pipes/advanced-filter.pipe';
import { FilterCondition } from '../../../../core/filters/interfaces/filter-condition.interface';
import { PermissionsGuard } from '../guards/permissions.guard';
import type { TenantAwareRequest } from '../../../../core/interfaces/tenant-aware-request.interface';

@Controller('business/roles')
@UseGuards(TenantAccessGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @RequirePermission(AppPermissions.ROLE_CREATE) // <-- ¡Magia Django Aplicada!
  async createRole(@Req() req: TenantAwareRequest, @Body() dto: CreateRoleDto) {
    return this.rolesService.createRole(req.tenant!, dto);
  }

  @Get()
  @RequirePermission(AppPermissions.ROLE_VIEW)
  async getRoles(
    @Req() req: TenantAwareRequest,
    @Query() pageOptions: PageOptionsDto,
    @Query(AdvancedFilterPipe) filters: FilterCondition[],
  ) {
    return this.rolesService.getAllRoles(req.tenant!, pageOptions, filters);
  }

  @Get('/permissions')
  @RequirePermission(AppPermissions.ROLE_VIEW)
  async getPermissions(@Req() req: TenantAwareRequest) {
    return this.rolesService.getAllPermissions(req.tenant!);
  }

  @Delete(':id')
  @RequirePermission(AppPermissions.ROLE_DELETE)
  async deleteRole(@Req() req: TenantAwareRequest, @Param('id') id: string) {
    await this.rolesService.deleteRole(req.tenant!, id);
    return { message: 'El rol ha sido desactivado lógicamente (Soft Delete)' };
  }
}
