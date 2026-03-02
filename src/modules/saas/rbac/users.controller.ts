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
  Req,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { SaasUser } from './entities/saas-user.entity';
import { SaasPermissionGuard } from '../auth/saas-permission.guard';
import { SaasPermission } from '../auth/saas-permission.decorator';
import { PageOptionsDto } from '../../../core/pagination/dto/page-options.dto';
import { PageDto } from '../../../core/pagination/dto/page.dto';
import { AdvancedFilterPipe } from '../../../core/filters/pipes/advanced-filter.pipe';
import { FilterCondition } from '../../../core/filters/interfaces/filter-condition.interface';

@UseGuards(SaasPermissionGuard)
@Controller('saas/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @SaasPermission('SAAS_USERS_CREATE')
  @Post()
  create(
    @Body() createUserDto: CreateUserDto,
  ): Promise<Omit<SaasUser, 'passwordHash'>> {
    return this.usersService.create(createUserDto);
  }

  @SaasPermission('SAAS_USERS_VIEW')
  @Get()
  findAll(
    @Query() pageOptions: PageOptionsDto,
    @Query(AdvancedFilterPipe) filters: FilterCondition[],
  ): Promise<PageDto<Partial<SaasUser>>> {
    return this.usersService.findAll(pageOptions, filters);
  }

  @SaasPermission('SAAS_USERS_VIEW')
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Omit<SaasUser, 'passwordHash' | 'resetPasswordOtp'>> {
    return this.usersService.findOne(id);
  }

  @SaasPermission('SAAS_USERS_UPDATE')
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<Omit<SaasUser, 'passwordHash' | 'resetPasswordOtp'>> {
    return this.usersService.update(id, updateUserDto);
  }

  @SaasPermission('SAAS_USERS_DELETE')
  @Delete(':id')
  remove(
    @Req() req: { user: { sub: string } },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.usersService.remove(id, req.user.sub);
  }
}
