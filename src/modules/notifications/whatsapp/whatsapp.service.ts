import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { Client, LocalAuth } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';

@Injectable()
export class WhatsappService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsappService.name);
  private client: Client;
  private isReady = false;

  onModuleInit() {
    if (process.env.ENABLE_WHATSAPP !== 'true') {
      this.logger.warn(
        'WhatsApp Client deshabilitado por configuración (ENABLE_WHATSAPP=false). No se generará el QR.',
      );
      return;
    }

    this.logger.log('Inicializando cliente de WhatsApp...');

    this.client = new Client({
      authStrategy: new LocalAuth(),
      puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
    });

    this.client.on('qr', (qr) => {
      this.logger.log(
        'Escanea este QR con tu dispositivo WhatsApp (Soporte SaaS):',
      );
      qrcode.generate(qr, { small: true });
    });

    this.client.on('ready', () => {
      this.isReady = true;
      this.logger.log('¡Cliente de WhatsApp listo y vinculado!');
    });

    this.client.on('disconnected', (reason) => {
      this.isReady = false;
      this.logger.warn(`Cliente WhatsApp desconectado: ${reason}`);
    });

    this.client.on('auth_failure', (msg) => {
      this.logger.error(`Fallo de autenticación: ${msg}`);
    });

    this.client.initialize().catch((err) => {
      this.logger.error('Error al iniciar WhatsApp Client:', err);
    });
  }

  onModuleDestroy() {
    if (this.client) {
      this.logger.log('Cerrando cliente de WhatsApp...');
      this.client.destroy();
    }
  }

  /**
   * Envía un mensaje a un número.
   * phoneTo ej: '+593988888888'
   */
  async sendOtpMessage(phoneTo: string, otp: string): Promise<boolean> {
    if (!this.isReady) {
      this.logger.error('Imposible enviar mensaje: WhatsApp no está listo.');
      return false;
    }

    try {
      const chatId = `${phoneTo.replace('+', '').trim()}@c.us`;
      const message = `🔒 *SaaS Global Admin*\n\nTu código temporal para cambiar de contraseña es: *${otp}*\n\nEste código expirará en 15 minutos. Si no solicitaste esto, ignora el mensaje.`;

      await this.client.sendMessage(chatId, message);
      this.logger.log(`OTP enviado a ${phoneTo}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Error enviando WhatsApp a ${phoneTo}: ${error.message}`,
      );
      return false;
    }
  }

  /**
   * Envía las credenciales del inquilino por WhatsApp.
   */
  async sendTenantCredentials(
    phoneTo: string,
    data: {
      tenantName: string;
      subdomain: string;
      adminEmail: string;
      adminPassword: string;
      timezone?: string;
    },
  ): Promise<boolean> {
    if (!this.isReady) {
      this.logger.error('Imposible enviar mensaje: WhatsApp no está listo.');
      return false;
    }

    try {
      const chatId = `${phoneTo.replace('+', '').trim()}@c.us`;
      const url = `${data.subdomain}.misaas.com`;
      const message =
        `🎉 *¡Tu espacio está listo!*\n\n` +
        `Hola, te informamos que tu plataforma *${data.tenantName}* ya se encuentra activa.\n\n` +
        `🌐 *Acceso:* ${url}\n` +
        `📧 *Usuario:* ${data.adminEmail}\n` +
        `🔑 *Contraseña:* ${data.adminPassword}\n` +
        (data.timezone ? `🕐 *Zona horaria:* ${data.timezone}\n` : '') +
        `\nTe recomendamos cambiar tu contraseña la primera vez que ingreses.\n\n` +
        `Si tienes alguna duda, no dudes en contactarnos. ¡Bienvenido! 🚀`;

      await this.client.sendMessage(chatId, message);
      this.logger.log(
        `Credenciales enviadas a ${phoneTo} para tenant ${data.tenantName}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Error enviando credenciales a ${phoneTo}: ${error.message}`,
      );
      return false;
    }
  }
}
