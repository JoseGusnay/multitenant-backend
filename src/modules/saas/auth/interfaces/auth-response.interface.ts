/**
 * Shapes of the data returned by the AuthService methods.
 * Keeping them here avoids inline object literals in Promise<{...}> generics.
 */

/** Minimal token response (login / refresh) */
export interface TokenResponse {
  access_token: string;
}

/** Public user info included in the login response */
export interface AuthUserInfo {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  roles: string[];
  permissions: string[];
  countryCode: string | null;
  phone: string | null;
}

/** Full response returned by loginGlobalAdmin */
export interface LoginGlobalAdminResponse {
  access_token: string;
  user: AuthUserInfo;
}

/** Generic success/message response (recoverPassword, resetPassword) */
export interface MessageResponse {
  success: boolean;
  message: string;
}

/** Response returned by updateProfile */
export interface UpdateProfileResponse {
  success: boolean;
  user: AuthUserInfo;
}
