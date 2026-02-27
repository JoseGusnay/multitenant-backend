import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { LoginDto } from '../../saas/auth/interfaces/login-credentials.interface'; // Reutilizaremos este DTO
import { TenantUser } from '../rbac/entities/tenant-user.entity';

@Injectable()
export class B2bAuthService {
  constructor(
    private readonly jwtService: JwtService,
    // Inyectamos la conexión DINÁMICA real del inquilino (Scope.REQUEST)
    @Inject('TENANT_CONNECTION')
    private readonly tenantDataSource: DataSource,
  ) {}

  async login(
    loginDto: LoginDto,
    tenantId: string,
  ): Promise<{ access_token: string }> {
    // Obtenemos el repositorio del tenant usando la conexión inyectada dinámica
    const tenantUserRepo = this.tenantDataSource.getRepository(TenantUser);

    const user = await tenantUserRepo.findOne({
      where: { email: loginDto.email },
      relations: ['roles', 'roles.permissions'],
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException(
        'Credenciales inválidas en este entorno de trabajo.',
      );
    }

    const passHash = user.passwordHash;
    if (typeof passHash !== 'string') {
      throw new UnauthorizedException(
        'Credenciales inválidas en este entorno de trabajo.',
      );
    }

    const passMatch = await bcrypt.compare(loginDto.password, passHash);

    if (!passMatch) {
      throw new UnauthorizedException(
        'Credenciales inválidas en este entorno de trabajo.',
      );
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Su usuario B2B ha sido suspendido.');
    }

    // Aplanar los permisos granulados de la BD del Tenant
    const permissions = Array.from(
      new Set(
        user.roles.flatMap((r) => r.permissions?.map((p) => p.name) || []),
      ),
    );

    // Agruparlos en el Token de Inquilino
    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: tenantId, // Sellamos criptográficamente al usuario a su DB
      isGlobalAdmin: false, // Falso por defecto en B2B
      permissions: permissions, // ¡Los permisos estáticos para lectura veloz!
    };

    return { access_token: await this.jwtService.signAsync(payload) };
  }

  /**
   * Refresca el token de un usuario B2B preservando su contexto de inquilino.
   */
  async refresh(user: any): Promise<{ access_token: string }> {
    const payload = {
      sub: user.sub,
      email: user.username,
      tenantId: user.tenantId,
      isGlobalAdmin: false,
      permissions: user.permissions,
    };
    return { access_token: await this.jwtService.signAsync(payload) };
  }
}
