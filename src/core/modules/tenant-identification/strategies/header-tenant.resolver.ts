import { Request } from 'express';
import { ITenantResolver } from '../../../../core/interfaces/tenant-resolver.interface';
import { MissingTenantIdentifierException } from '../../../../modules/tenants/domain/exceptions/missing-tenant-identifier.exception';

export class HeaderTenantResolver implements ITenantResolver {
  private readonly headerName: string;

  constructor(headerName = 'x-tenant-id') {
    this.headerName = headerName.toLowerCase();
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  public async resolve(request: Request): Promise<string> {
    const tenantId = request.headers[this.headerName];

    if (!tenantId) {
      const lang = request.headers['accept-language']?.includes('en')
        ? 'en'
        : 'es';
      throw new MissingTenantIdentifierException(
        `Header (${this.headerName})`,
        lang,
      );
    }

    if (Array.isArray(tenantId)) {
      return tenantId[0];
    }

    return tenantId;
  }
}
