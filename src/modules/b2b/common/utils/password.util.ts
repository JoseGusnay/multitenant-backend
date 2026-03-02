export class PasswordUtils {
  /**
   * Genera una contraseña aleatoria, segura y legible.
   * Formato: admin-xxxx-xxxx (donde x son caracteres alfanuméricos)
   */
  static generateRandomPassword(length: number = 8): string {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let result = 'admin-';
    for (let i = 0; i < length; i++) {
      if (i > 0 && i % 4 === 0) {
        result += '-';
      }
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
