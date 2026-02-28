import {
  Injectable,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GlobalAdminGuard } from './global-admin.guard';
import { SAAS_PERMISSION_KEY } from './saas-permission.decorator';
import { TokenPayloadUser } from './interfaces/token-payload-user.interface';

/**
 * Guard granular de permisos para el backoffice del SaaS.
 *
 * - Hereda de GlobalAdminGuard: el usuario DEBE ser un Global Admin válido.
 * - Si el endpoint tiene @SaasPermission('X'), verifica que el usuario
 *   tenga el permiso 'X' en su JWT.
 * - Si el endpoint no tiene @SaasPermission, cualquier admin puede acceder
 *   (retrocompatible con el comportamiento anterior).
 */
@Injectable()
export class SaasPermissionGuard extends GlobalAdminGuard {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  handleRequest<TUser extends TokenPayloadUser = TokenPayloadUser>(
    err: Error | null,
    user: TUser | false,
    info: unknown,
    context: ExecutionContext,
    status?: unknown,
  ): TUser {
    // 1. Delega la verificación de JWT + isGlobalAdmin al padre
    const validatedUser = super.handleRequest(err, user, info, context, status);

    // 2. Lee el permiso requerido del decorador @SaasPermission()
    const requiredPermission = this.reflector.get<string>(
      SAAS_PERMISSION_KEY,
      context.getHandler(),
    );

    // 3. Si no hay decorador, acepta a cualquier admin (retrocompatible)
    if (!requiredPermission) {
      return validatedUser;
    }

    // 4. Verifica que el usuario tenga el permiso específico
    const userPermissions = validatedUser.permissions ?? [];
    if (!userPermissions.includes(requiredPermission)) {
      throw new ForbiddenException(
        `Acceso denegado: Se requiere el permiso '${requiredPermission}'.`,
      );
    }

    return validatedUser;
  }
}
