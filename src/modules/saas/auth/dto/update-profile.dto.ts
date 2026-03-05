import { IsOptional, IsString, Matches } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  @Matches(/^\+\d{1,4}$/, {
    message: 'El código de país debe tener formato +XX o +XXX (ej. +593)',
  })
  countryCode?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;
}
