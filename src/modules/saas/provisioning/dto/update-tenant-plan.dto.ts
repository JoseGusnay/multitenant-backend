import { IsString, IsNumber, Min } from 'class-validator';
import { Expose } from 'class-transformer';

export class UpdateTenantPlanDto {
  @IsString()
  @Expose()
  planId: string;

  @IsNumber()
  @Min(1)
  @Expose()
  maxUsers: number;

  @IsNumber()
  @Min(1)
  @Expose()
  maxInvoices: number;

  @IsNumber()
  @Min(1)
  @Expose()
  maxBranches: number;
}
