export interface TokenPayloadUser {
  sub: string; // User ID
  username: string;
  tenantId?: string; // CRÍTICO: A qué Inquilino pertenece
  isGlobalAdmin?: boolean; // Verdadero si es master del SaaS
  permissions?: string[]; // (NUEVO) Matriz de permisos RBAC inyectada por el B2bAuthService
}
