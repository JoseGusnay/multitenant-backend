// src/modules/tenants/domain/i18n/tenant.messages.ts

export const TenantErrorMessages = {
  es: {
    INVALID_STATUS: (name: string, status: string): string =>
      `El espacio de trabajo "${name}" se encuentra actualmente en estado ${status}. Por favor, contacte con soporte técnico para restaurar el acceso.`,
    PAYMENT_REQUIRED: (name: string): string =>
      `El acceso al espacio de trabajo "${name}" ha sido suspendido por falta de pago. Regularice su situación administrativa para continuar.`,
    NOT_FOUND: (identifier?: string): string =>
      identifier
        ? `No se ha podido localizar el espacio de trabajo asociado a "${identifier}". Verifique la dirección o contacte con su administrador.`
        : `No se ha podido localizar el espacio de trabajo solicitado. Verifique la dirección o contacte con su administrador.`,
    MISSING_IDENTIFIER: (method: string): string =>
      `Es necesario especificar un identificador de espacio de trabajo válido mediante ${method}.`,
  },
  en: {
    INVALID_STATUS: (name: string, status: string): string =>
      `The workspace "${name}" is currently ${status}. Please contact technical support to restore access.`,
    PAYMENT_REQUIRED: (name: string): string =>
      `Access to the workspace "${name}" has been suspended due to pending payments. Please settle your account to continue.`,
    NOT_FOUND: (identifier?: string): string =>
      identifier
        ? `The workspace associated with "${identifier}" could not be found. Please verify the address or contact your administrator.`
        : `The requested workspace could not be found. Please verify the address or contact your administrator.`,
    MISSING_IDENTIFIER: (method: string): string =>
      `A valid workspace identifier must be specified via ${method}.`,
  },
};
