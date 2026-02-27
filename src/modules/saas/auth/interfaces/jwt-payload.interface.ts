export type JwtPayload = {
  sub: string;
  email: string;
  tenantId?: string;
  isGlobalAdmin?: boolean;
  permissions?: string[];
  saasPermissions?: string[];
};
