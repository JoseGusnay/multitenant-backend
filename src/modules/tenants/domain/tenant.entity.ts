import { BadRequestException } from '@nestjs/common';
import { InvalidTenantStatusException } from './exceptions/invalid-tenant-status.exception';
import { SubscriptionPlan } from './subscription-plan.entity';

export enum TenantStatus {
  PROVISIONING = 'PROVISIONING', // Base de datos en creación.
  ACTIVE = 'ACTIVE', // Operando normally.
  SUSPENDED_PAYMENT = 'SUSPENDED_PAYMENT', // Por adeudo.
  SUSPENDED_VIOLATION = 'SUSPENDED_VIOLATION', // Por violación de términos.
  DELETED = 'DELETED', // Soft-delete (archivado).
}

export class Tenant {
  constructor(
    public readonly id: string, // UUID central
    public name: string,
    public readonly subdomain: string,

    // Oculto: String de conexión (Debe venir desencriptado solo cuando se inyecte en memoria)
    private readonly dbConnectionString: string,

    public status: TenantStatus,
    public readonly createdAt: Date,

    // --- Configuraciones CRÍTICAS para Producción Real ---

    // 1. Regionalización (Evita fallos de fechas en reportes per-tenant)
    public timezone: string = 'UTC',
    public readonly locale: string = 'es-ES',

    // 2. Facturación (Plan Limits) - Previene que un plan "Básico" sature el servidor
    // Estos campos ahora pueden servir como overrides si el plan no existe o si queremos límites específicos
    public maxUsersCount: number = 10,
    public maxInvoicesCount: number = 100,
    public maxBranchesCount: number = 1,
    public currentPlanId: string = 'BASIC',

    // Objeto del plan (opcional, inyectado por el repositorio)
    public plan?: SubscriptionPlan,

    // 3. Seguridad Múltitenant
    public readonly requireMfa: boolean = false, // Obliga a los usuarios de este tenant a usar 2FA
    public readonly allowedIps: string[] = [], // IP Whitelisting (Opcional, para empresas grandes)

    // 4. Contacto Auxiliar
    public countryCode?: string,
    public phone?: string,
    public adminEmail?: string,
  ) {}

  /**
   * Getter para la cadena de conexión interna (uso infraestructural)
   */
  public getDbConnectionString(): string {
    return this.dbConnectionString;
  }

  /**
   * Mutadores controlados por Dominio (DDD)
   */
  public changeName(newName: string): void {
    if (!newName || newName.length < 4) {
      throw new BadRequestException(
        'El nombre del tenant debe tener al menos 4 caracteres',
      );
    }
    this.name = newName;
  }

  public changeStatus(newStatus: TenantStatus): void {
    this.status = newStatus;
  }

  public changeTimezone(newTimezone: string): void {
    this.timezone = newTimezone;
  }

  public updateContactDetails(countryCode?: string, phone?: string): void {
    if (countryCode) this.countryCode = countryCode;
    if (phone) this.phone = phone;
  }

  public setPlan(plan: SubscriptionPlan): void {
    this.plan = plan;
    this.currentPlanId = plan.id;
    // Opcionalmente sincronizamos los contadores locales para redundancia
    this.maxUsersCount = plan.maxUsers;
    this.maxInvoicesCount = plan.maxInvoices;
    this.maxBranchesCount = plan.maxBranches;
  }

  /**
   * Obtiene la cadena de conexión de forma controlada.
   */
  public getConnectionString(localeUserPreference: 'es' | 'en' = 'es'): string {
    if (
      this.status !== TenantStatus.ACTIVE &&
      this.status !== TenantStatus.PROVISIONING
    ) {
      throw new InvalidTenantStatusException(
        this.name,
        this.status,
        localeUserPreference,
      );
    }
    return this.dbConnectionString;
  }

  /**
   * Verifica si el tenant permite acceso operativo normal.
   */
  public isOperational(): boolean {
    return this.status === TenantStatus.ACTIVE;
  }

  /**
   * Validación de negocio antes de intentar crear un usuario nuevo.
   * Prioriza los límites del plan si está presente.
   */
  public canAddMoreUsers(currentActiveUsersCount: number): boolean {
    const limit = this.plan ? this.plan.maxUsers : this.maxUsersCount;
    return currentActiveUsersCount < limit;
  }

  public canAddMoreInvoices(currentInvoicesCount: number): boolean {
    const limit = this.plan ? this.plan.maxInvoices : this.maxInvoicesCount;
    return currentInvoicesCount < limit;
  }

  public canAddMoreBranches(currentBranchesCount: number): boolean {
    const limit = this.plan ? this.plan.maxBranches : this.maxBranchesCount;
    return currentBranchesCount < limit;
  }
}
