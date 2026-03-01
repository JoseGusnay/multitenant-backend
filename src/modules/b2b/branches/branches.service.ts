import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DataSource, Brackets } from 'typeorm';
import { Branch } from './branch.entity';
import type {
  AdvancedQueryDto,
  AgGridFilterCondition,
} from '../common/dtos/advanced-query.dto';

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

    // 1. Filtros por columna (Ag-Grid style)
    if (filterModel) {
      Object.entries(filterModel).forEach(([field, condition], index) => {
        const dbField = `branch.${field}`;

        if (condition.operator && condition.conditions) {
          // Soporte para filtros combinados (AND/OR) para una misma columna
          qb.andWhere(
            new Brackets((innerQb) => {
              condition.conditions?.forEach((subCond, subIndex) => {
                const paramName = `filter_${field}_${index}_${subIndex}`;
                const sql = this.getSqlCondition(dbField, subCond, paramName);
                if (sql) {
                  const params = { [paramName]: this.getParamValue(subCond) };
                  if (condition.operator === 'OR') {
                    innerQb.orWhere(sql, params);
                  } else {
                    innerQb.andWhere(sql, params);
                  }
                }
              });
            }),
          );
        } else {
          // Filtro simple
          const paramName = `filter_${field}_${index}`;
          const sql = this.getSqlCondition(dbField, condition, paramName);
          if (sql) {
            qb.andWhere(sql, { [paramName]: this.getParamValue(condition) });
          }
        }
      });
    }

    // 2. Búsqueda Global (OR en múltiples campos)
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
    if (sortField) {
      qb.orderBy(`branch.${sortField}`, sortOrder || 'ASC');
    } else {
      qb.orderBy('branch.createdAt', 'DESC');
    }

    // 4. Paginación
    const skip = (page - 1) * limit;
    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  private getSqlCondition(
    dbField: string,
    condition: AgGridFilterCondition,
    paramName: string,
  ): string | null {
    if (condition.filterType === 'text') {
      switch (condition.type) {
        case 'contains':
        case 'startsWith':
        case 'endsWith':
          return `${dbField} ILIKE :${paramName}`;
        case 'equals':
          return `${dbField} = :${paramName}`;
        case 'notEqual':
          return `${dbField} != :${paramName}`;
        default:
          return null;
      }
    }
    return null;
  }

  private getParamValue(condition: AgGridFilterCondition): unknown {
    if (condition.filterType === 'text') {
      switch (condition.type) {
        case 'contains':
          return `%${condition.filter as string}%`;
        case 'startsWith':
          return `${condition.filter as string}%`;
        case 'endsWith':
          return `%${condition.filter as string}`;
        default:
          return condition.filter;
      }
    }
    return condition.filter;
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
