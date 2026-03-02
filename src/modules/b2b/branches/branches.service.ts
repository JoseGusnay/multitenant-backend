import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DataSource, Brackets } from 'typeorm';
import { Branch } from './branch.entity';
import type { AdvancedQueryDto } from '../common/dtos/advanced-query.dto';
import { QueryBuilderUtils } from '../common/utils/query-builder.util';

@Injectable()
export class BranchesService {
  constructor(
    @Inject('TENANT_CONNECTION')
    private readonly tenantDataSource: DataSource,
  ) {}

  async findAll(
    queryDto: AdvancedQueryDto,
  ): Promise<{ data: Branch[]; total: number }> {
    const { page, limit, sortField, sortOrder, search, filterModel } = queryDto;
    const repo = this.tenantDataSource.getRepository(Branch);
    const qb = repo.createQueryBuilder('branch');

    // 1. Filtros Ag-Grid
    QueryBuilderUtils.applyAgGridFilters(qb, 'branch', filterModel);

    // 2. Búsqueda Global
    if (search) {
      qb.andWhere(
        new Brackets((innerQb) => {
          innerQb
            .where('branch.name ILIKE :search', { search: `%${search}%` })
            .orWhere('branch.address ILIKE :search', { search: `%${search}%` })
            .orWhere('branch.city ILIKE :search', { search: `%${search}%` })
            .orWhere('branch.phone ILIKE :search', { search: `%${search}%` });
        }),
      );
    }

    // 3. Ordenamiento
    QueryBuilderUtils.applySorting(qb, 'branch', sortField, sortOrder);

    // 4. Paginación
    QueryBuilderUtils.applyPagination(qb, page, limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async findOne(id: string): Promise<Branch> {
    const repo = this.tenantDataSource.getRepository(Branch);
    const branch = await repo.findOne({ where: { id } });
    if (!branch) {
      throw new NotFoundException(`Sucursal con ID ${id} no encontrada.`);
    }
    return branch;
  }

  async create(data: Partial<Branch>): Promise<Branch> {
    const repo = this.tenantDataSource.getRepository(Branch);
    const branch = repo.create(data);
    return repo.save(branch);
  }

  async update(id: string, data: Partial<Branch>): Promise<Branch> {
    const branch = await this.findOne(id);
    Object.assign(branch, data);
    const repo = this.tenantDataSource.getRepository(Branch);
    return repo.save(branch);
  }

  async remove(id: string): Promise<{ success: boolean; message: string }> {
    const branch = await this.findOne(id);
    const repo = this.tenantDataSource.getRepository(Branch);
    await repo.softRemove(branch);
    return { success: true, message: 'Sucursal eliminada correctamente.' };
  }
}
