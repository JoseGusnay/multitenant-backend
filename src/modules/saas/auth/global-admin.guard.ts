import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TokenPayloadUser } from './interfaces/token-payload-user.interface';

@Injectable()
export class GlobalAdminGuard extends AuthGuard('jwt') {
  /**
   * Passport maneja la autenticación JWT.
   */
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  /**
   * Validamos el resultado de la autenticación para aplicar reglas de negocio SaaS Master.
   * Restringimos TUser para asegurar que contenga el contrato mínimo (SOLID: ISP).
   */
  handleRequest<TUser extends TokenPayloadUser = TokenPayloadUser>(
    err: Error | null,
    user: TUser | false,
    info: unknown,
    context: ExecutionContext,
    status?: unknown,
  ): TUser {
    // 1. Verificación de Autenticación
    if (err || !user) {
      throw (
        err ||
        new UnauthorizedException('Acceso denegado: Sesión de SaaS inválida.')
      );
    }

    // 2. Autorización Master (SOLID: SRP)
    if (!user.isGlobalAdmin) {
      throw new ForbiddenException(
        'Acceso restringido: Se requieren privilegios de Administrador Global del SaaS.',
      );
    }

    return user;
  }
}
