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
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';
import { BranchesService } from './branches.service';
import { Branch } from './branch.entity';

@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('business/branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @RequirePermission('branch.view')
  @Get()
  findAll(): Promise<Branch[]> {
    return this.branchesService.findAll();
  }

  @RequirePermission('branch.view')
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Branch> {
    return this.branchesService.findOne(id);
  }

  @RequirePermission('branch.create')
  @Post()
  create(@Body() body: Partial<Branch>): Promise<Branch> {
    return this.branchesService.create(body);
  }

  @RequirePermission('branch.update')
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Partial<Branch>,
  ): Promise<Branch> {
    return this.branchesService.update(id, body);
  }

  @RequirePermission('branch.delete')
  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.branchesService.remove(id);
  }
}
