import {
  Controller,
  Post,
  Body,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { B2bAuthService } from './b2b-auth.service';
import { TenantAwareRequest } from '../../../core/interfaces/tenant-aware-request.interface';
import type { LoginDto } from '../../saas/auth/interfaces/login-credentials.interface';

@Controller('business/auth')
export class B2bAuthController {
  constructor(private readonly authService: B2bAuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto, @Req() req: any) {
    // Casteamos manualmente adentro para sortear el issue de DecoratorMetadata con Typescript estricto
    const tenantReq = req as TenantAwareRequest;
    const tenantId = tenantReq.tenant?.id;

    if (!tenantId) {
      throw new BadRequestException(
        'Tenant NO detectado. Envíe el Header x-tenant-id',
      );
    }

    return this.authService.login(loginDto, tenantId);
  }
}
