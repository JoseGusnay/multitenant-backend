import { Request } from 'express';

export interface ITenantResolver {
  /**
   * Resuelve el identificador único del tenant a partir de la petición HTTP.
   * Si no se encuentra un tenant o no es válido, debe lanzar una excepción.
   *
   * @param request El objeto Request nativo de Express.
   * @returns El ID o Subdominio del Tenant resuelto.
   */
  resolve(request: Request): Promise<string>;
}
