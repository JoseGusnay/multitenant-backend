import { PartialType } from '@nestjs/mapped-types';
import { CreateTenantUserDto } from './create-tenant-user.dto';
import { IsBoolean, IsOptional, IsArray, IsUUID } from 'class-validator';

export class UpdateTenantUserDto extends PartialType(CreateTenantUserDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  branchIds?: string[];
}
