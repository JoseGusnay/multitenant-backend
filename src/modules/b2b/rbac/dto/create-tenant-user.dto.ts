import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsArray,
  IsUUID,
} from 'class-validator';

export class CreateTenantUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  passwordRaw: string;

  @IsArray()
  @IsUUID('4', { each: true })
  roleIds: string[];
}
