import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class RecoverPasswordDto {
    @IsEmail()
    @IsNotEmpty()
    email!: string;
}
