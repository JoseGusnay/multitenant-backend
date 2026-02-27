import { IsString, IsNotEmpty, IsArray, IsUUID } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsArray()
  @IsUUID('4', { each: true })
  permissionIds: string[];
}
