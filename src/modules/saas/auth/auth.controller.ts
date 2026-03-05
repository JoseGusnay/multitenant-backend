import { Body, Controller, Post, Patch, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { LoginDto } from './interfaces/login-credentials.interface';
import { GlobalAdminGuard } from './global-admin.guard';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: { sub: string };
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  login(@Body() loginDto: LoginDto): Promise<{ access_token: string }> {
    return this.authService.login(loginDto);
  }

  @Post('login/global')
  loginGlobal(
    @Body() loginDto: LoginDto,
  ): ReturnType<AuthService['loginGlobalAdmin']> {
    return this.authService.loginGlobalAdmin(loginDto);
  }

  @Post('recover-password')
  recoverPassword(
    @Body() body: { email: string },
  ): Promise<{ success: boolean; message: string }> {
    return this.authService.recoverPassword(body.email);
  }

  @Post('reset-password')
  resetPassword(
    @Body() body: { email: string; otp: string; newPassword: string },
  ): Promise<{ success: boolean; message: string }> {
    return this.authService.resetPassword(
      body.email,
      body.otp,
      body.newPassword,
    );
  }

  @UseGuards(GlobalAdminGuard)
  @Patch('profile')
  updateProfile(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      countryCode: string;
      phone: string;
      firstName?: string;
      lastName?: string;
    },
  ): ReturnType<AuthService['updateProfile']> {
    return this.authService.updateProfile(
      req.user.sub,
      body.countryCode,
      body.phone,
      body.firstName,
      body.lastName,
    );
  }
}
