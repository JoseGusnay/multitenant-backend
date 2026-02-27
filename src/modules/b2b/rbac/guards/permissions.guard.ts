import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { TokenPayloadUser } from '../../../saas/auth/interfaces/token-payload-user.interface';
import { TenantAwareRequest } from '../../../../core/interfaces/tenant-aware-request.interface';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermission = this.reflector.getAllAndOverride<string>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Si la ruta no especifica qué permiso necesita, da paso libre (Acepta a cualquiera con JWT válido)
    if (!requiredPermission) {
      return true;
    }

    const request = context.switchToHttp().getRequest<TenantAwareRequest>();
    // 'user' es montado automáticamente por JwtStrategy (luego de decodificar el JWT)
    const user = request.user as TokenPayloadUser;

    if (!user) {
      throw new ForbiddenException(
        'Debes iniciar sesión para ejecutar esta acción',
      );
    }

    if (user.isGlobalAdmin) {
      throw new ForbiddenException(
        'Los global admins no pueden alterar recursos internos B2B',
      );
    }

    // --- MAGIA PURA: OPTIMIZACIÓN EXTREMA DE LECTURA ---
    // Al haber aplanado la matriz de permisos del Usuario directamente en el Payload del Token,
    // ahorramos realizar 3 JOIN SQL en CADA petición HTTP contra la base de datos PostgreSQL.
    // O([JWT Decode] + [Array Search]) <<< O([TCP/IP] + [Auth Postgres] + [SQL JOINS])

    const userPermissions = user.permissions || [];

    // Busqueda súper rápida en memoria
    const hasPermission =
      userPermissions.includes('SUPER_ADMIN') ||
      userPermissions.includes(requiredPermission);

    if (!hasPermission) {
      throw new ForbiddenException(
        `Acceso denegado. Se requiere el privilegio B2B: '${requiredPermission}'`,
      );
    }

    return true;
  }
}
