import {
  IsString,
  IsNotEmpty,
  Matches,
  Length,
  IsOptional,
  IsEmail,
} from 'class-validator';
import { Expose } from 'class-transformer';

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  @Length(4, 100)
  @Expose()
  name: string;

  @IsString()
  @IsNotEmpty()
  @Length(4, 50)
  // Expresión regular para obligar a subdominios válidos (solo minúsculas y números, sin espacios)
  @Matches(/^[a-z0-9]+$/, {
    message:
      'subdomain must only contain lowercase letters and numbers without spaces',
  })
  @Expose()
  subdomain: string;

  @IsEmail()
  @IsNotEmpty({ message: 'El correo del administrador inicial es requerido' })
  @Expose()
  adminEmail: string;

  @IsOptional()
  @IsString()
  @Length(8, 50, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @Expose()
  adminPassword?: string;

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

  @IsString()
  @IsOptional()
  @Expose()
  planId?: string;
}
