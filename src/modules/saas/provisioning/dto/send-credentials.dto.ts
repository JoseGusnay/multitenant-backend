import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { Expose } from 'class-transformer';

export class SendCredentialsDto {
  @IsString()
  @IsNotEmpty({ message: 'El número de teléfono es requerido' })
  @Expose()
  phone: string;

  @IsString()
  @IsNotEmpty()
  @Expose()
  tenantName: string;

  @IsString()
  @IsNotEmpty()
  @Expose()
  subdomain: string;

  @IsString()
  @IsNotEmpty()
  @Expose()
  adminEmail: string;

  @IsString()
  @IsNotEmpty()
  @Expose()
  adminPassword: string;

  @IsString()
  @IsOptional()
  @Expose()
  timezone?: string;
}
