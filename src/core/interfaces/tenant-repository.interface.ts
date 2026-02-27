import { Tenant } from '../../modules/tenants/domain/tenant.entity';
import { PageOptionsDto } from '../pagination/dto/page-options.dto';
import { FilterCondition } from '../filters/interfaces/filter-condition.interface';
import { PageDto } from '../pagination/dto/page.dto';

export interface ITenantRepository {
  /**
   * Obtiene la entidad Tenant completa (con credenciales encriptadas)
   * consultando la base de datos Master o la caché.
   *
   * @param tenantId El identificador resuelto previamente.
   * @returns La entidad Tenant de nuestro dominio.
   */
  getTenantConfig(tenantId: string): Promise<Tenant | null>;

  /**
   * Guarda un nuevo Tenant en la tabla del Master (Catálogo).
   *
   * @param tenant La entidad Tenant a persistir.
   */
  createTenant(tenant: Tenant): Promise<void>;

  /**
   * Elimina un Tenant de la Base de Datos Master (usado para Rollbacks)
   *
   * @param subdomain El subdominio único del Tenant
   */
  deleteTenant(subdomain: string): Promise<void>;

  /**
   * Obtiene todos los inquilinos paginados y filtrados
   */
  getAllTenants(
    pageOptionsDto: PageOptionsDto,
    filters: FilterCondition[],
  ): Promise<PageDto<Tenant>>;

  /**
   * Actualiza los datos de un tenant
   */
  updateTenant(tenant: Tenant): Promise<void>;

  /**
   * Obtiene conteos por status para estadísticas
   */
  getStatsCounts(): Promise<any>;
}
