import { HttpException, HttpStatus } from '@nestjs/common';
import { SupportedLanguage } from '../i18n/types/supported-language.type';
import { TenantErrorMessages } from '../i18n/tenant.messages';

export class MissingTenantIdentifierException extends Error {
  constructor(
    public readonly method: string,
    public readonly language: SupportedLanguage = 'es',
  ) {
    const message = TenantErrorMessages[language].MISSING_IDENTIFIER(method);
    super(message);
    this.name = 'MissingTenantIdentifierException';
  }
}
