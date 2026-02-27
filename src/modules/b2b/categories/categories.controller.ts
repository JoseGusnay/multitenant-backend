import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CategoriesService } from './categories.service';
import { CategoryEntity } from './category.entity';
import { TenantAccessGuard } from '../../../core/guards/tenant-access.guard';
import { CreateCategoryDto } from './dto/create-category.dto';

import { PageOptionsDto } from '../../../core/pagination/dto/page-options.dto';
import { AdvancedFilterPipe } from '../../../core/filters/pipes/advanced-filter.pipe';
import { FilterCondition } from '../../../core/filters/interfaces/filter-condition.interface';
import { PageDto } from '../../../core/pagination/dto/page.dto';

@UseGuards(AuthGuard('jwt'), TenantAccessGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll(
    @Query() pageOptions: PageOptionsDto,
    @Query(AdvancedFilterPipe) filters: FilterCondition[],
  ): Promise<PageDto<CategoryEntity>> {
    return this.categoriesService.findAll(pageOptions, filters);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<CategoryEntity> {
    return this.categoriesService.findOne(id);
  }

  @Post()
  create(@Body() createDto: CreateCategoryDto): Promise<CategoryEntity> {
    return this.categoriesService.create(createDto);
  }
}
