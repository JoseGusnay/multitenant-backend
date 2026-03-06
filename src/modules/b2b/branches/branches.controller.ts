import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TenantAccessGuard } from '../../../core/guards/tenant-access.guard';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';
import { AppPermissions } from '../rbac/constants/app-permissions.constant';
import { BranchesService } from './branches.service';
import { Branch } from './branch.entity';
import { AdvancedQueryDto } from '../common/dtos/advanced-query.dto';

@UseGuards(AuthGuard('jwt'), TenantAccessGuard, PermissionsGuard)
@Controller('business/branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @RequirePermission(AppPermissions.BRANCH_VIEW)
  @Get()
  async findAll(
    @Query() query: AdvancedQueryDto,
  ): Promise<{ data: Branch[]; total: number }> {
    return this.branchesService.findAll(query);
  }

  @RequirePermission(AppPermissions.BRANCH_VIEW)
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Branch> {
    return this.branchesService.findOne(id);
  }

  @RequirePermission(AppPermissions.BRANCH_CREATE)
  @Post()
  async create(@Body() body: Partial<Branch>): Promise<Branch> {
    return this.branchesService.create(body);
  }

  @RequirePermission(AppPermissions.BRANCH_UPDATE)
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Partial<Branch>,
  ): Promise<Branch> {
    return this.branchesService.update(id, body);
  }

  @RequirePermission(AppPermissions.BRANCH_DELETE)
  @Delete(':id')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.branchesService.remove(id);
  }
}
