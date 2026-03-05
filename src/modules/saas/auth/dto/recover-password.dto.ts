import { IsEmail, IsNotEmpty } from 'class-validator';

export class RecoverPasswordDto {
  @IsEmail({}, { message: 'Correo electrónico inválido' })
  @IsNotEmpty()
  email: string;
}
