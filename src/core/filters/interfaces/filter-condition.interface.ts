import { FilterOperator } from '../enums/filter-operator.enum';
import { FilterType } from '../enums/filter-type.enum';

/**
 * Representa un filtro configurado y parseado listo
 * para ser inyectado en TypeORM.
 */
export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value: string | number | boolean | Date | string[] | number[];
  type: FilterType;
}
