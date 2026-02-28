export const SaasPermissionNames = [
  'SAAS_TENANTS_VIEW',
  'SAAS_TENANTS_CREATE',
  'SAAS_TENANTS_UPDATE',
  'SAAS_TENANTS_DELETE',

  'SAAS_USERS_VIEW',
  'SAAS_USERS_CREATE',
  'SAAS_USERS_UPDATE',
  'SAAS_USERS_DELETE',

  'SAAS_ROLES_VIEW',
  'SAAS_ROLES_CREATE',
  'SAAS_ROLES_DELETE',
] as const;

export type SaasPermissionName = (typeof SaasPermissionNames)[number];
