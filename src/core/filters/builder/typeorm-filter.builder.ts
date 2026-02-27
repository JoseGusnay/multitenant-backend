import { SelectQueryBuilder, ObjectLiteral } from 'typeorm';
import { FilterCondition } from '../interfaces/filter-condition.interface';
import { FilterOperator } from '../enums/filter-operator.enum';
// import { FilterType } from '../enums/filter-type.enum'; // Usar si se hace switch avanzado por Type

export class TypeOrmFilterBuilder<T extends ObjectLiteral> {
  constructor(
    private readonly queryBuilder: SelectQueryBuilder<T>,
    private readonly alias: string,
  ) {}

  applyFilters(conditions: FilterCondition[]): SelectQueryBuilder<T> {
    if (!conditions || conditions.length === 0) {
      return this.queryBuilder;
    }

    conditions.forEach((condition, index) => {
      // Usar prefijo único para bind parameters, ej: :param_0_price
      const paramName = `param_${index}_${condition.field.replace(/\./g, '_')}`;
      const column = `${this.alias}.${condition.field}`;

      switch (condition.operator) {
        case FilterOperator.EQ:
          if (typeof condition.value === 'string') {
            this.queryBuilder.andWhere(`${column} ILIKE :${paramName}`, {
              [paramName]: condition.value,
            });
          } else {
            this.queryBuilder.andWhere(`${column} = :${paramName}`, {
              [paramName]: condition.value,
            });
          }
          break;
        case FilterOperator.NEQ:
          this.queryBuilder.andWhere(`${column} != :${paramName}`, {
            [paramName]: condition.value,
          });
          break;
        case FilterOperator.GT:
          this.queryBuilder.andWhere(`${column} > :${paramName}`, {
            [paramName]: condition.value,
          });
          break;
        case FilterOperator.GTE:
          this.queryBuilder.andWhere(`${column} >= :${paramName}`, {
            [paramName]: condition.value,
          });
          break;
        case FilterOperator.LT:
          this.queryBuilder.andWhere(`${column} < :${paramName}`, {
            [paramName]: condition.value,
          });
          break;
        case FilterOperator.LTE:
          this.queryBuilder.andWhere(`${column} <= :${paramName}`, {
            [paramName]: condition.value,
          });
          break;
        case FilterOperator.CONTAINS:
          this.queryBuilder.andWhere(`${column} ILIKE :${paramName}`, {
            [paramName]: `%${condition.value}%`,
          });
          break;
        case FilterOperator.NOT_CONTAINS:
          this.queryBuilder.andWhere(`${column} NOT ILIKE :${paramName}`, {
            [paramName]: `%${condition.value}%`,
          });
          break;
        case FilterOperator.STARTS_WITH:
          this.queryBuilder.andWhere(`${column} ILIKE :${paramName}`, {
            [paramName]: `${condition.value}%`,
          });
          break;
        case FilterOperator.ENDS_WITH:
          this.queryBuilder.andWhere(`${column} ILIKE :${paramName}`, {
            [paramName]: `%${condition.value}`,
          });
          break;
        case FilterOperator.IN:
          if (Array.isArray(condition.value)) {
            this.queryBuilder.andWhere(`${column} IN (:...${paramName})`, {
              [paramName]: condition.value,
            });
          }
          break;
        case FilterOperator.NOT_IN:
          if (Array.isArray(condition.value)) {
            this.queryBuilder.andWhere(`${column} NOT IN (:...${paramName})`, {
              [paramName]: condition.value,
            });
          }
          break;
        case FilterOperator.IS_NULL:
          this.queryBuilder.andWhere(`${column} IS NULL`);
          break;
        case FilterOperator.IS_NOT_NULL:
          this.queryBuilder.andWhere(`${column} IS NOT NULL`);
          break;
        case FilterOperator.BETWEEN:
          if (Array.isArray(condition.value) && condition.value.length === 2) {
            this.queryBuilder.andWhere(
              `${column} BETWEEN :${paramName}_start AND :${paramName}_end`,
              {
                [`${paramName}_start`]: condition.value[0],
                [`${paramName}_end`]: condition.value[1],
              },
            );
          }
          break;
      }
    });

    return this.queryBuilder;
  }
}
