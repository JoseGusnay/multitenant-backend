import {
  Controller,
  Post,
  Body,
  Req,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { B2bAuthService } from './b2b-auth.service';
import type { TenantAwareRequest } from '../../../core/interfaces/tenant-aware-request.interface';
import type { LoginDto } from '../../saas/auth/interfaces/login-credentials.interface';
import type { TokenPayloadUser } from '../../saas/auth/interfaces/token-payload-user.interface';
import type { TenantUser } from '../rbac/entities/tenant-user.entity';

class SelectBranchDto {
  branchId!: string;
}

@Controller('business/auth')
export class B2bAuthController {
  constructor(private readonly authService: B2bAuthService) {}

  /**
   * Paso 1: Valida credenciales y devuelve lista de sucursales disponibles.
   * El token emitido aún no incluye branchId.
   */
  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Record<string, unknown>,
  ): Promise<{
    access_token: string;
    branches: { id: string; name: string; isMain: boolean }[];
    user: Omit<TenantUser, 'passwordHash'>;
  }> {
    const tenantReq = req as unknown as TenantAwareRequest;
    const tenantId = tenantReq.tenant?.id;
    if (!tenantId) {
      throw new BadRequestException(
        'Tenant NO detectado. Envíe el Header x-tenant-id',
      );
    }
    return this.authService.login(loginDto, tenantId);
  }

  /**
   * Paso 2: El usuario elige su sucursal de trabajo.
   * Emite el token definitivo con branchId sellado.
   */
  @UseGuards(AuthGuard('jwt'))
  @Post('select-branch')
  async selectBranch(
    @Body() body: SelectBranchDto,
    @Req() req: Record<string, unknown>,
  ): Promise<{ access_token: string }> {
    const tenantReq = req as unknown as TenantAwareRequest;
    const tenantId = tenantReq.tenant?.id;
    if (!tenantId) {
      throw new BadRequestException(
        'Tenant NO detectado. Envíe el Header x-tenant-id',
      );
    }
    const currentUser = tenantReq.user as TokenPayloadUser;
    return this.authService.selectBranch(
      currentUser.sub,
      tenantId,
      body.branchId,
      currentUser.permissions ?? [],
    );
  }

  /**
   * Refresca el token recargando permisos desde la DB, preservando la sucursal activa.
   */
  @UseGuards(AuthGuard('jwt'))
  @Post('refresh')
  async refresh(
    @Req() req: Record<string, unknown>,
  ): Promise<{ access_token: string }> {
    const tenantReq = req as unknown as TenantAwareRequest;
    const currentUser = tenantReq.user as TokenPayloadUser;
    return this.authService.refresh({
      sub: currentUser.sub,
      tenantId: currentUser.tenantId ?? '',
      branchId: currentUser.branchId,
    });
  }
}
