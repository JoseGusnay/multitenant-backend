/**
 * Catálogo Oficial de Permisos (Estilo Django Auth)
 * Cada acción atómica debe estar listada aquí para ser sembrada
 * por el Tenant Provisioner en la BD de cada cliente.
 */
export const AppPermissions = {
  // Productos
  PRODUCT_VIEW: 'product.view',
  PRODUCT_CREATE: 'product.create',
  PRODUCT_UPDATE: 'product.update',
  PRODUCT_DELETE: 'product.delete',

  // Categorías
  CATEGORY_VIEW: 'category.view',
  CATEGORY_CREATE: 'category.create',
  CATEGORY_UPDATE: 'category.update',
  CATEGORY_DELETE: 'category.delete',

  // Usuarios del Tenant
  TENANT_USER_VIEW: 'tenant_user.view',
  TENANT_USER_CREATE: 'tenant_user.create',
  TENANT_USER_UPDATE: 'tenant_user.update',
  TENANT_USER_DELETE: 'tenant_user.delete',

  // Roles personalizados
  ROLE_VIEW: 'role.view',
  ROLE_CREATE: 'role.create',
  ROLE_UPDATE: 'role.update',
  ROLE_DELETE: 'role.delete',
};

// Exportamos un array plano para el script Seeder automatizado
export const AllPermissionNames = Object.values(AppPermissions);
