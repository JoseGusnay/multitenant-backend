import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { TenantAwareRequest } from '../interfaces/tenant-aware-request.interface';
import { TokenPayloadUser } from '../../modules/saas/auth/interfaces/token-payload-user.interface';

@Injectable()
export class TenantAccessGuard implements CanActivate {
  private readonly logger = new Logger(TenantAccessGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<TenantAwareRequest & { user?: TokenPayloadUser }>();

    // 1. Verificamos que el JWT ya haya sido desencriptado por Passport
    const user = request.user;
    if (!user) {
      this.logger.warn(
        'Intento de acceso rechazado: No hay usuario en la request (JWT Guard debería haber fallado antes).',
      );
      return false; // Dejará pasar a 403 Forbidden, aunque AuthGuard tira 401
    }

    // 2. Verificamos que el Middleware Mágico de Tenant haya resuelto la base de datos
    const tenantTarget = request.tenant;
    if (!tenantTarget) {
      this.logger.warn(
        'Intento de acceso rechazado: La request no tiene un Tenant resuelto en este Target.',
      );
      throw new ForbiddenException('Contexto de Inquilino no resuelto');
    }

    // 3. LA REGLA DE ORO DE AISLAMIENTO:
    // El tenantId criptográficamente sellado dentro del Token JWT debe coincidir obligatoriamente
    // con el ID del Tenant al que la URL (subdominio) está apuntando físicamente.
    if (user.tenantId !== tenantTarget.id) {
      this.logger.error(
        `[CRÍTICO] Aislamiento Violado: User ${user.sub} (TokenTenant: ${user.tenantId}) intentó acceder a la DB de ${tenantTarget.name} (DbTenant: ${tenantTarget.id})`,
      );
      throw new ForbiddenException(
        'Tus credenciales no tienen autorización para operar en este entorno de trabajo.',
      );
    }

    // El Tenant y el Token hacen Match. Puede pasar.
    return true;
  }
}
