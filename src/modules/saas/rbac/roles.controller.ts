import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { SaasRole } from './entities/saas-role.entity';
import { SaasPermission } from './entities/saas-permission.entity';
import { SaasPermissionGuard } from '../auth/saas-permission.guard';
import { SaasPermission as SaasPermissionDecorator } from '../auth/saas-permission.decorator';
import { PageOptionsDto } from '../../../core/pagination/dto/page-options.dto';
import { PageDto } from '../../../core/pagination/dto/page.dto';
import { AdvancedFilterPipe } from '../../../core/filters/pipes/advanced-filter.pipe';
import { FilterCondition } from '../../../core/filters/interfaces/filter-condition.interface';

@UseGuards(SaasPermissionGuard)
@Controller('saas/roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @SaasPermissionDecorator('SAAS_ROLES_CREATE')
  @Post()
  create(@Body() createRoleDto: CreateRoleDto): Promise<SaasRole> {
    return this.rolesService.create(createRoleDto);
  }

  @SaasPermissionDecorator('SAAS_ROLES_VIEW')
  @Get()
  findAll(
    @Query() pageOptions: PageOptionsDto,
    @Query(AdvancedFilterPipe) filters: FilterCondition[],
  ): Promise<PageDto<SaasRole>> {
    return this.rolesService.findAll(pageOptions, filters);
  }

  @SaasPermissionDecorator('SAAS_ROLES_VIEW')
  @Get('permissions')
  findAllPermissions(): Promise<SaasPermission[]> {
    return this.rolesService.findAllPermissions();
  }

  @SaasPermissionDecorator('SAAS_ROLES_VIEW')
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<SaasRole> {
    return this.rolesService.findOne(id);
  }

  @SaasPermissionDecorator('SAAS_ROLES_VIEW')
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateRoleDto: UpdateRoleDto,
  ): Promise<SaasRole> {
    return this.rolesService.update(id, updateRoleDto);
  }

  @SaasPermissionDecorator('SAAS_ROLES_DELETE')
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<SaasRole> {
    return this.rolesService.remove(id);
  }
}
