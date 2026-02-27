import {
  PipeTransform,
  Injectable,
  BadRequestException,
  ArgumentMetadata,
} from '@nestjs/common';
import { FilterCondition } from '../interfaces/filter-condition.interface';
import { FilterOperator } from '../enums/filter-operator.enum';
import { FilterType } from '../enums/filter-type.enum';

@Injectable()
export class AdvancedFilterPipe implements PipeTransform<
  Record<string, unknown>,
  FilterCondition[]
> {
  transform(
    value: Record<string, unknown>,
    metadata: ArgumentMetadata,
  ): FilterCondition[] {
    const filters: FilterCondition[] = [];

    // Validamos que exista un querystring genérico y que estemos operando sobre 'filter'
    if (!value || typeof value !== 'object') {
      return filters;
    }

    // 1. Intentar obtener filtros anidados (formato ?filter[field][op]=val)
    let rawFilter = value['filter'] as Record<string, unknown>;

    // 2. Si no están anidados (flat keys), intentar reconstruir el objeto
    if (!rawFilter || typeof rawFilter !== 'object') {
      rawFilter = {};
      for (const [key, val] of Object.entries(value)) {
        const match = key.match(/^filter\[(.+)\]\[(.+)\]$/);
        if (match) {
          const [, field, operator] = match;
          if (!rawFilter[field]) rawFilter[field] = {};
          (rawFilter[field] as any)[operator] = val;
        }
      }
    }

    if (Object.keys(rawFilter).length === 0) {
      return filters;
    }

    for (const [field, ops] of Object.entries(rawFilter)) {
      if (typeof ops !== 'object' || ops === null) continue;

      for (const [operatorKey, rawValue] of Object.entries(
        ops as Record<string, unknown>,
      )) {
        // Validación del Operador
        if (
          !Object.values(FilterOperator).includes(operatorKey as FilterOperator)
        ) {
          throw new BadRequestException(
            `El operador '${operatorKey}' no es un filtro de Búsqueda válido`,
          );
        }

        const operator = operatorKey as FilterOperator;

        // Inferencia del tipo (FilterType) y casteo duro de valores para evitar ANY
        const { typedValue, inferredType } = this.parseValueType(
          rawValue,
          operator,
        );

        filters.push({
          field,
          operator,
          type: inferredType,
          value: typedValue,
        });
      }
    }

    return filters;
  }

  private parseValueType(
    raw: unknown,
    operator: FilterOperator,
  ): {
    typedValue: string | number | boolean | Date | string[] | number[];
    inferredType: FilterType;
  } {
    const stringValue = String(raw);

    // Operadores In/NotIn manejan genéricamente arreglos mediante coma
    if (operator === FilterOperator.IN || operator === FilterOperator.NOT_IN) {
      const arr = stringValue.split(',').map((s) => s.trim());
      // Si todos son numéricos, cast a int
      if (arr.every((v) => !isNaN(Number(v)))) {
        return { typedValue: arr.map(Number), inferredType: FilterType.NUMBER };
      }
      return { typedValue: arr, inferredType: FilterType.STRING };
    }

    // Operador Between (separado por coma ej: 10,50 o 2024-01-01,2024-12-31)
    if (operator === FilterOperator.BETWEEN) {
      const arr = stringValue.split(',').map((s) => s.trim());
      if (arr.length !== 2)
        throw new BadRequestException(
          'El operador "between" requiere dos valores separados por coma',
        );

      // Si no es un número y tiene formato fecha (naive check de guiones)
      if (isNaN(Number(arr[0])) && arr[0].includes('-')) {
        return { typedValue: arr, inferredType: FilterType.DATE }; // Retornamos string list para Date
      }

      if (!isNaN(Number(arr[0])) && !isNaN(Number(arr[1]))) {
        return {
          typedValue: [Number(arr[0]), Number(arr[1])],
          inferredType: FilterType.NUMBER,
        };
      }
    }

    // Booleanos
    if (
      stringValue.toLowerCase() === 'true' ||
      stringValue.toLowerCase() === 'false'
    ) {
      return {
        typedValue: stringValue.toLowerCase() === 'true',
        inferredType: FilterType.BOOLEAN,
      };
    }

    // Numéricos
    if (!isNaN(Number(stringValue)) && stringValue.trim() !== '') {
      return {
        typedValue: Number(stringValue),
        inferredType: FilterType.NUMBER,
      };
    }

    // Fechas (Revisión básica ISO/YMD para categorizar)
    if (!isNaN(Date.parse(stringValue)) && stringValue.includes('-')) {
      return {
        typedValue: new Date(stringValue),
        inferredType: FilterType.DATE,
      };
    }

    // Default String text
    return { typedValue: stringValue, inferredType: FilterType.STRING };
  }
}
