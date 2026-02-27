import { Request } from 'express';
import { Tenant } from '../../modules/tenants/domain/tenant.entity';

export interface TenantAwareRequest extends Request {
  tenant?: Tenant;
}
