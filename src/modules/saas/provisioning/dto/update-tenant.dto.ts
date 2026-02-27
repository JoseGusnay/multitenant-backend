import { IsString, Length, IsOptional, IsEnum } from 'class-validator';
import { Expose } from 'class-transformer';
import { TenantStatus } from '../../../tenants/domain/tenant.entity';

export class UpdateTenantDto {
  @IsString()
  @Length(4, 100)
  @IsOptional()
  @Expose()
  name?: string;

  @IsEnum(TenantStatus)
  @IsOptional()
  @Expose()
  status?: TenantStatus;

  @IsString()
  @IsOptional()
  @Expose()
  timezone?: string;

  @IsString()
  @IsOptional()
  @Expose()
  countryCode?: string;

  @IsString()
  @IsOptional()
  @Expose()
  phone?: string;
}
