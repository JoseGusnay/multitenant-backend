import { IsString, IsNotEmpty, Length, IsOptional } from 'class-validator';
import { Expose } from 'class-transformer';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  @Expose()
  name: string;

  @IsString()
  @IsOptional()
  @Length(0, 255)
  @Expose()
  description?: string;
}
