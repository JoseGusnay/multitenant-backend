import { SetMetadata } from '@nestjs/common';
import { SaasPermissionName } from '../rbac/constants/saas-permissions.constant';

export const SAAS_PERMISSION_KEY = 'saas_permission';

/**
 * Decorador para requerir un permiso específico del SaaS Backoffice.
 * Úsalo junto con SaasPermissionGuard.
 *
 * @example
 * @SaasPermission('SAAS_TENANTS_DELETE')
 * @Delete(':subdomain')
 * async remove(...) {}
 */
export const SaasPermission = (
  permission: SaasPermissionName,
): MethodDecorator => SetMetadata(SAAS_PERMISSION_KEY, permission);
