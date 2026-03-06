import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { LoginDto } from '../../saas/auth/interfaces/login-credentials.interface';
import { TenantUser } from '../rbac/entities/tenant-user.entity';
import { Branch } from '../branches/branch.entity';

const INVALID_CREDENTIALS_MSG =
  'Credenciales inválidas en este entorno de trabajo.';

@Injectable()
export class B2bAuthService {
  constructor(
    private readonly jwtService: JwtService,
    // Inyectamos la conexión DINÁMICA real del inquilino (Scope.REQUEST)
    @Inject('TENANT_CONNECTION')
    private readonly tenantDataSource: DataSource,
  ) {}

  /**
   * Paso 1 del login: Valida credenciales y devuelve la lista de sucursales disponibles.
   * El token emitido es un "pre-token" sin branchId — no sirve para acceder a recursos de negocio.
   */
  async login(
    loginDto: LoginDto,
    tenantId: string,
  ): Promise<{
    access_token: string;
    branches: { id: string; name: string; isMain: boolean }[];
    user: Omit<TenantUser, 'passwordHash'>;
  }> {
    const tenantUserRepo = this.tenantDataSource.getRepository(TenantUser);

    const user = await tenantUserRepo.findOne({
      where: { email: loginDto.email },
      relations: ['roles', 'roles.permissions', 'branches'],
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MSG);
    }

    const passHash = user.passwordHash;
    if (typeof passHash !== 'string') {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MSG);
    }

    const passMatch = await bcrypt.compare(loginDto.password, passHash);
    if (!passMatch) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MSG);
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

    // Pre-token: no incluye branchId. El usuario debe seleccionar sucursal a continuación.
    const payload = {
      sub: user.id,
      email: user.email,
      tenantId,
      isGlobalAdmin: false,
      permissions,
    };

    const branches = (user.branches ?? []).map((b) => ({
      id: b.id,
      name: b.name,
      isMain: b.isMain,
    }));

    const userWithoutPassword = { ...user } as unknown as Record<
      string,
      unknown
    >;
    delete userWithoutPassword.passwordHash;

    return {
      access_token: await this.jwtService.signAsync(payload),
      branches,
      user: userWithoutPassword as unknown as Omit<TenantUser, 'passwordHash'>,
    };
  }

  /**
   * Paso 2 del login: El usuario elige su sucursal de trabajo.
   * Emite el token definitivo que incluye el branchId.
   */
  async selectBranch(
    userId: string,
    tenantId: string,
    branchId: string,
    currentPermissions: string[],
  ): Promise<{ access_token: string }> {
    const branchRepo = this.tenantDataSource.getRepository(Branch);

    // Verificar que la sucursal exista y esté activa
    const branch = await branchRepo.findOne({
      where: { id: branchId, isActive: true },
    });
    if (!branch) {
      throw new NotFoundException(
        'La sucursal seleccionada no existe o está inactiva.',
      );
    }

    // Verificar que el usuario tiene acceso a esa sucursal
    const tenantUserRepo = this.tenantDataSource.getRepository(TenantUser);
    const user = await tenantUserRepo.findOne({
      where: { id: userId },
      relations: ['branches'],
    });

    const hasAccess = user?.branches?.some((b) => b.id === branchId) ?? false;
    if (!hasAccess) {
      throw new UnauthorizedException(
        'No tienes acceso a la sucursal seleccionada.',
      );
    }

    // Token definitivo con branchId sellado
    const payload = {
      sub: userId,
      tenantId,
      branchId,
      isGlobalAdmin: false,
      permissions: currentPermissions,
    };

    return { access_token: await this.jwtService.signAsync(payload) };
  }

  /**
   * Refresca el token de un usuario B2B recargando permisos desde la DB.
   * Si el branchId ya estaba en el token anterior, lo preserva.
   */
  async refresh(currentUser: {
    sub: string;
    tenantId: string;
    branchId?: string;
  }): Promise<{ access_token: string }> {
    const tenantUserRepo = this.tenantDataSource.getRepository(TenantUser);

    const user = await tenantUserRepo.findOne({
      where: { id: currentUser.sub },
      relations: ['roles', 'roles.permissions'],
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Sesión inválida o usuario inactivo.');
    }

    const permissions = Array.from(
      new Set(
        user.roles.flatMap((r) => r.permissions?.map((p) => p.name) || []),
      ),
    );

    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: currentUser.tenantId,
      branchId: currentUser.branchId, // Preservamos la sucursal activa
      isGlobalAdmin: false,
      permissions,
    };

    return { access_token: await this.jwtService.signAsync(payload) };
  }

  /**
   * Devuelve el perfil completo del usuario autenticado.
   * Se usa en el frontend para mostrar datos del usuario en la UI.
   */
  async getMe(userId: string): Promise<Omit<TenantUser, 'passwordHash'>> {
    const tenantUserRepo = this.tenantDataSource.getRepository(TenantUser);

    const user = await tenantUserRepo.findOne({
      where: { id: userId },
      relations: ['roles', 'branches'],
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado.');
    }

    // Excluir passwordHash de la respuesta
    const { passwordHash: _pw, ...userWithoutPassword } =
      user as unknown as Record<string, unknown> & { passwordHash: string };
    void _pw;
    return userWithoutPassword as unknown as Omit<TenantUser, 'passwordHash'>;
  }
}
