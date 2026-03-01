import { SelectQueryBuilder, Brackets, ObjectLiteral } from 'typeorm';
import {
  AgGridFilterCondition,
  AgGridFilterModel,
} from '../dtos/advanced-query.dto';

export class QueryBuilderUtils {
  static applyAgGridFilters(
    qb: SelectQueryBuilder<ObjectLiteral>,
    alias: string,
    filterModel?: AgGridFilterModel,
  ): void {
    if (!filterModel) return;

    Object.entries(filterModel).forEach(([field, condition], index) => {
      const dbField = `${alias}.${field}`;

      if (condition.operator && condition.conditions) {
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
        const paramName = `filter_${field}_${index}`;
        const sql = this.getSqlCondition(dbField, condition, paramName);
        if (sql) {
          qb.andWhere(sql, { [paramName]: this.getParamValue(condition) });
        }
      }
    });
  }

  static applyPagination(
    qb: SelectQueryBuilder<ObjectLiteral>,
    page: number = 1,
    limit: number = 10,
  ): void {
    const skip = (page - 1) * limit;
    qb.skip(skip).take(limit);
  }

  static applySorting(
    qb: SelectQueryBuilder<ObjectLiteral>,
    alias: string,
    sortField?: string,
    sortOrder: 'ASC' | 'DESC' = 'ASC',
  ): void {
    if (sortField) {
      qb.orderBy(`${alias}.${sortField}`, sortOrder);
    } else {
      qb.orderBy(`${alias}.createdAt`, 'DESC');
    }
  }

  private static getSqlCondition(
    dbField: string,
    condition: AgGridFilterCondition,
    paramName: string,
  ): string | null {
    const type = condition.filterType ?? 'text';
    if (type === 'text') {
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
    // TODO: Implement other types like number, date, etc.
    return null;
  }

  private static getParamValue(condition: AgGridFilterCondition): unknown {
    const type = condition.filterType ?? 'text';
    if (type === 'text') {
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
}
