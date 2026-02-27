import { HttpException, HttpStatus } from '@nestjs/common';
import { SupportedLanguage } from '../i18n/types/supported-language.type';
import { TenantErrorMessages } from '../i18n/tenant.messages';

export class InvalidTenantStatusException extends Error {
  constructor(
    public readonly tenantName: string,
    public readonly currentStatus: string,
    public readonly language: SupportedLanguage = 'es', // Por defecto Español
  ) {
    // Escoge el copy profesional según el diccionario y el tipo de error
    const message =
      currentStatus === 'SUSPENDED_PAYMENT'
        ? TenantErrorMessages[language].PAYMENT_REQUIRED(tenantName)
        : TenantErrorMessages[language].INVALID_STATUS(
            tenantName,
            currentStatus,
          );

    super(message);
    this.name = 'InvalidTenantStatusException';
  }
}
