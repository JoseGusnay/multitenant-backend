import { Body, Controller, Post, Patch, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { GlobalAdminGuard } from './global-admin.guard';
import {
  LoginDto,
  RecoverPasswordDto,
  ResetPasswordDto,
  UpdateProfileDto,
} from './dto';

interface AuthenticatedRequest extends Request {
  user: { sub: string };
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto): Promise<{ access_token: string }> {
    return this.authService.login(dto);
  }

  @Post('login/global')
  loginGlobal(
    @Body() dto: LoginDto,
  ): ReturnType<AuthService['loginGlobalAdmin']> {
    return this.authService.loginGlobalAdmin(dto);
  }

  @Post('recover-password')
  recoverPassword(
    @Body() dto: RecoverPasswordDto,
  ): Promise<{ success: boolean; message: string }> {
    return this.authService.recoverPassword(dto.email);
  }

  @Post('reset-password')
  resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<{ success: boolean; message: string }> {
    return this.authService.resetPassword(dto.email, dto.otp, dto.newPassword);
  }

  @UseGuards(GlobalAdminGuard)
  @Patch('profile')
  updateProfile(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateProfileDto,
  ): ReturnType<AuthService['updateProfile']> {
    return this.authService.updateProfile(
      req.user.sub,
      dto.countryCode ?? '',
      dto.phone ?? '',
      dto.firstName,
      dto.lastName,
    );
  }
}
