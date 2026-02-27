import { Body, Controller, Post, Patch, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { LoginDto } from './interfaces/login-credentials.interface';
import { GlobalAdminGuard } from './global-admin.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  login(@Body() loginDto: LoginDto): Promise<{ access_token: string }> {
    // Este endpoint es global, el usuario dice a qué tenant quiere entrar.
    return this.authService.login(loginDto);
  }

  @Post('login/global')
  loginGlobal(@Body() loginDto: LoginDto): Promise<{ access_token: string }> {
    // Endpoint para el Dueño del SaaS (Aprovisionar tenants)
    return this.authService.loginGlobalAdmin(loginDto);
  }

  @Post('recover-password')
  recoverPassword(@Body() body: { email: string }) {
    return this.authService.recoverPassword(body.email);
  }

  @Post('reset-password')
  resetPassword(
    @Body() body: { email: string; otp: string; newPassword: string },
  ) {
    return this.authService.resetPassword(
      body.email,
      body.otp,
      body.newPassword,
    );
  }

  @UseGuards(GlobalAdminGuard)
  @Patch('profile')
  updateProfile(
    @Req() req: any,
    @Body() body: { countryCode: string; phone: string },
  ) {
    return this.authService.updateProfile(
      req.user.sub,
      body.countryCode,
      body.phone,
    );
  }
}
