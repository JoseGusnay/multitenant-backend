import { IsString } from 'class-validator';
import { Expose } from 'class-transformer';

export class UpdateTenantPlanDto {
  @IsString()
  @Expose()
  planId: string;
}
