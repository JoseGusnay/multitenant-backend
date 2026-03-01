import { IsOptional, IsInt, Min, IsString, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export interface AgGridFilterCondition {
  filterType: 'text' | 'number' | 'date' | 'set' | 'boolean';
  type:
    | 'contains'
    | 'notContains'
    | 'equals'
    | 'notEqual'
    | 'startsWith'
    | 'endsWith'
    | 'blank'
    | 'notBlank'
    | 'greaterThan'
    | 'lessThan'
    | 'inRange';
  filter?: unknown;
  filterTo?: unknown;
  values?: unknown[];
}

export interface AgGridFilterModel {
  [key: string]: AgGridFilterCondition;
}

export class AdvancedQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number = 10;

  @IsOptional()
  @IsString()
  sortField?: string;

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'ASC';

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsObject()
  filterModel?: AgGridFilterModel;
}
