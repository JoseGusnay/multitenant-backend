import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { CategoryEntity } from './category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';

import { TypeOrmFilterBuilder } from '../../../core/filters/builder/typeorm-filter.builder';
import { FilterCondition } from '../../../core/filters/interfaces/filter-condition.interface';
import { PageOptionsDto } from '../../../core/pagination/dto/page-options.dto';
import { PageDto } from '../../../core/pagination/dto/page.dto';
import { PageMetaDto } from '../../../core/pagination/dto/page-meta.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @Inject('CATEGORY_REPOSITORY')
    private readonly categoryRepository: Repository<CategoryEntity>,
  ) {}

  async findAll(
    pageOptionsDto: PageOptionsDto,
    filters: FilterCondition[],
  ): Promise<PageDto<CategoryEntity>> {
    const queryBuilder = this.categoryRepository.createQueryBuilder('category');

    // Injectamos los filtros avanzados detectados por el Pipe
    const filterBuilder = new TypeOrmFilterBuilder(queryBuilder, 'category');
    filterBuilder.applyFilters(filters);

    // Aplicamos ordenación y cursoraje de paginación (take, skip)
    queryBuilder
      .orderBy('category.createdAt', pageOptionsDto.order)
      .skip(pageOptionsDto.skip)
      .take(pageOptionsDto.take);

    // Contamos elementos que coinciden y extraemos la data final raw de postgres
    const itemCount = await queryBuilder.getCount();
    const { entities } = await queryBuilder.getRawAndEntities();

    // Generamos Meta y formamos el wrapper Paginado estandar
    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });
    return new PageDto(entities, pageMetaDto);
  }

  async findOne(id: string): Promise<CategoryEntity> {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Categoria #${id} no encontrada`);
    }
    return category;
  }

  async create(createDto: CreateCategoryDto): Promise<CategoryEntity> {
    const newCategory = this.categoryRepository.create({ ...createDto });
    return this.categoryRepository.save(newCategory);
  }
}
