import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsEmail({}, { message: 'Correo electrónico inválido' })
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'El código OTP es requerido' })
  otp: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  newPassword: string;
}
