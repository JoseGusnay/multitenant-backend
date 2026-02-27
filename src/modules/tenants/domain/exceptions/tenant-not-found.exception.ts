import { HttpException, HttpStatus } from '@nestjs/common';
import { SupportedLanguage } from '../i18n/types/supported-language.type';
import { TenantErrorMessages } from '../i18n/tenant.messages';

export class TenantNotFoundException extends Error {
  constructor(
    public readonly identifier?: string,
    public readonly language: SupportedLanguage = 'es',
  ) {
    const message = TenantErrorMessages[language].NOT_FOUND(identifier);
    super(message);
    this.name = 'TenantNotFoundException';
  }
}
