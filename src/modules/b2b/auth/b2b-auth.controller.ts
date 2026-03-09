import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsString, IsNotEmpty, IsUUID } from 'class-validator';
import { TenantAccessGuard } from '../../../core/guards/tenant-access.guard';
import { B2bAuthService } from './b2b-auth.service';
import { RecoverPasswordDto } from './dto/recover-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { OptionalJwtAuthGuard } from '../../../core/guards/optional-jwt-auth.guard';
import type { TenantAwareRequest } from '../../../core/interfaces/tenant-aware-request.interface';
import type { LoginDto } from '../../saas/auth/interfaces/login-credentials.interface';
import type { TokenPayloadUser } from '../../saas/auth/interfaces/token-payload-user.interface';
import type { TenantUser } from '../rbac/entities/tenant-user.entity';
import type { Response } from 'express';

class SelectBranchDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  branchId!: string;
}

@Controller('business/auth')
export class B2bAuthController {
  constructor(private readonly authService: B2bAuthService) { }

  /**
   * Paso 1: Valida credenciales y devuelve lista de sucursales disponibles.
   * El token emitido aún no incluye branchId.
   */
  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Record<string, unknown>,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{
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
    const result = await this.authService.login(loginDto, tenantId);

    // Adjuntamos el JWT estrictamente como Cookie en vez de devolverlo en JSON
    res.cookie('b2b_access_token', result.access_token, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'strict',
      maxAge: 4 * 60 * 60 * 1000, // 4 hours
    });

    return {
      branches: result.branches,
      user: result.user,
    };
  }

  /**
   * Paso 2: El usuario elige su sucursal de trabajo.
   * Emite el token definitivo con branchId sellado.
   */
  @UseGuards(AuthGuard('jwt'), TenantAccessGuard)
  @Post('select-branch')
  async selectBranch(
    @Body() body: SelectBranchDto,
    @Req() req: Record<string, unknown>,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{
    success: boolean;
    user: Omit<TenantUser, 'passwordHash'>;
    exp: number;
  }> {
    const tenantReq = req as unknown as TenantAwareRequest;
    const tenantId = tenantReq.tenant?.id;
    if (!tenantId) {
      throw new BadRequestException(
        'Tenant NO detectado. Envíe el Header x-tenant-id',
      );
    }
    const currentUser = tenantReq.user as TokenPayloadUser;
    const result = await this.authService.selectBranch(
      currentUser.sub,
      tenantId,
      body.branchId,
      currentUser.permissions ?? [],
    );

    res.cookie('b2b_access_token', result.access_token, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'strict',
      maxAge: 4 * 60 * 60 * 1000,
    });

    const userProfile = await this.authService.getMe(currentUser.sub);

    return {
      success: true,
      user: userProfile,
      exp: Math.floor(Date.now() / 1000) + 4 * 60 * 60,
    };
  }

  /**
   * Refresca el token recargando permisos desde la DB, preservando la sucursal activa.
   */
  @UseGuards(AuthGuard('jwt'), TenantAccessGuard)
  @Post('refresh')
  async refresh(
    @Req() req: Record<string, unknown>,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{
    success: boolean;
    user: Omit<TenantUser, 'passwordHash'>;
    exp: number;
  }> {
    const tenantReq = req as unknown as TenantAwareRequest;
    const currentUser = tenantReq.user as TokenPayloadUser;
    const result = await this.authService.refresh({
      sub: currentUser.sub,
      tenantId: currentUser.tenantId ?? '',
      branchId: currentUser.branchId,
    });

    res.cookie('b2b_access_token', result.access_token, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'strict',
      maxAge: 4 * 60 * 60 * 1000,
    });

    const userProfile = await this.authService.getMe(currentUser.sub);

    // Provide the new exp internally to the frontend if needed for the timer
    return {
      success: true,
      user: userProfile,
      exp: Math.floor(Date.now() / 1000) + 4 * 60 * 60,
    };
  }

  /**
   * Endpoint de Logout cerrado, solo remueve la cookie
   */
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response): { success: boolean } {
    res.clearCookie('b2b_access_token', {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'strict',
    });
    return { success: true };
  }

  /**
   * Devuelve el contexto inicial de la sesión: Información del Tenant + Usuario (si está autenticado).
   * Este endpoint es fundamental para la optimización del arranque de la SPA.
   */
  @UseGuards(OptionalJwtAuthGuard)
  @Get('session-context')
  async getSessionContext(@Req() req: Record<string, unknown>): Promise<{
    isAuthenticated: boolean;
    tenant: {
      id: string;
      name: string;
      subdomain: string;
      locale: string;
      status: string;
      exists: boolean;
      isOperational: boolean;
    };
    user: Omit<TenantUser, 'passwordHash'> | null;
  }> {
    const tenantReq = req as unknown as TenantAwareRequest;
    const tenant = tenantReq.tenant;

    if (!tenant) {
      throw new BadRequestException('Contexto de inquilino no encontrado.');
    }

    // Intentamos obtener el usuario del token (si el interceptor/guard de JWT lo procesó)
    // Nota: El middleware de JWT usualmente corre antes si está configurado globalmente,
    // pero aquí el guard 'jwt' es el que inyecta 'user'. Podemos intentar el guard 'jwt' o manual.
    const currentUser = tenantReq.user as TokenPayloadUser | undefined;
    let userProfile: Omit<TenantUser, 'passwordHash'> | null = null;

    if (currentUser?.sub) {
      try {
        userProfile = await this.authService.getMe(currentUser.sub);
      } catch {
        // Si falla el perfil (token expirado o inválido), simplemente no hay usuario
        userProfile = null;
      }
    }

    return {
      isAuthenticated: !!userProfile,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        subdomain: tenant.subdomain,
        locale: tenant.locale,
        status: tenant.status,
        exists: true,
        isOperational: tenant.isOperational(),
      },
      user: userProfile,
    };
  }

  /**
   * Devuelve el perfil completo del usuario autenticado.
   */
  @UseGuards(AuthGuard('jwt'), TenantAccessGuard)
  @Get('me')
  async getMe(
    @Req() req: Record<string, unknown>,
  ): Promise<Omit<TenantUser, 'passwordHash'>> {
    const tenantReq = req as unknown as TenantAwareRequest;
    const currentUser = tenantReq.user as TokenPayloadUser;
    return this.authService.getMe(currentUser.sub);
  }

  /**
   * Genera un OTP y lo manda por WhatsApp para recuperación de cuenta
   */
  @Post('recover-password')
  async recoverPassword(
    @Body() dto: RecoverPasswordDto,
  ): Promise<{ success: boolean; message: string }> {
    return this.authService.recoverPassword(dto.email);
  }

  /**
   * Valida OTP y cambia contraseña
   */
  @Post('reset-password')
  async resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<{ success: boolean; message: string }> {
    return this.authService.resetPassword(dto.email, dto.otp, dto.newPassword);
  }
}
