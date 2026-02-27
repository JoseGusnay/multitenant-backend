import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './interfaces/login-credentials.interface';
import { SaasUser } from '../rbac/entities/saas-user.entity';
import { WhatsappService } from '../../notifications/whatsapp/whatsapp.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(SaasUser)
    private readonly saasUserRepo: Repository<SaasUser>,
    private readonly whatsappService: WhatsappService,
  ) {}

  /**
   * Simula la validación en el Master Catalog y emite un JWT firmado.
   * Pronto será ELIMINADO de aquí y movido a B2BAuthModule.
   */
  async login(loginDto: LoginDto): Promise<any> {
    if (loginDto.email === 'admin@demo.com' && loginDto.subdomain === 'demo') {
      const payload = {
        sub: 'usr_uuid_12345',
        email: loginDto.email,
        tenantId: '00000000-0000-0000-0000-0000000000demo',
      };
      return { access_token: await this.jwtService.signAsync(payload) };
    }
    throw new UnauthorizedException('Credenciales inválidas...');
  }

  /**
   * Endpoint de acceso oficial para dueños del SaaS validando
   * directo contra DB Maestro (Catálogo)
   */
  async loginGlobalAdmin(loginDto: LoginDto): Promise<any> {
    const user = await this.saasUserRepo.findOne({
      where: { email: loginDto.email },
      relations: ['roles', 'roles.permissions'],
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException(
        'Solo el Creador del SaaS puede acceder aquí.',
      );
    }

    const passHash = user.passwordHash;
    if (typeof passHash !== 'string') {
      throw new UnauthorizedException(
        'Solo el Creador del SaaS puede acceder aquí.',
      );
    }

    const passMatch = await bcrypt.compare(loginDto.password, passHash);
    if (!passMatch) {
      throw new UnauthorizedException(
        'Solo el Creador del SaaS puede acceder aquí.',
      );
    }

    // Aplanar permisos a nivel Master (Para que el portal lea lo que puedes hacer)
    const permissions = Array.from(
      new Set(
        user.roles.flatMap((r) => r.permissions?.map((p) => p.name) || []),
      ),
    );

    const isGlobalAdmin = user.roles.some((r) => r.name === 'GLOBAL_ADMIN');

    const payload = {
      sub: user.id,
      email: user.email,
      isGlobalAdmin, // Mantenemos compatibilidad con tu sistema de Guard actual
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        email: user.email,
        roles: user.roles.map((r) => r.name),
        countryCode: user.countryCode,
        phone: user.phone,
      },
    };
  }

  /**
   * Refresca el token de un Administrador Global activo.
   */
  async refresh(user: any): Promise<{ access_token: string }> {
    const payload = {
      sub: user.sub,
      email: user.username,
      isGlobalAdmin: user.isGlobalAdmin,
    };
    return { access_token: await this.jwtService.signAsync(payload) };
  }

  async recoverPassword(email: string) {
    const user = await this.saasUserRepo.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    if (!user.phone) {
      throw new BadRequestException(
        'El usuario no tiene un número de teléfono configurado para recibir alertas de WhatsApp.',
      );
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordOtp = otp;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
    await this.saasUserRepo.save(user);

    const sent = await this.whatsappService.sendOtpMessage(
      `${user.countryCode || ''}${user.phone}`,
      otp,
    );
    if (!sent) {
      throw new BadRequestException(
        'No se pudo enviar el mensaje por WhatsApp. Revisar logs.',
      );
    }

    return { success: true, message: 'Código temporal enviado por WhatsApp.' };
  }

  async resetPassword(email: string, otp: string, newPassword: string) {
    const user = await this.saasUserRepo.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (!user.resetPasswordOtp || user.resetPasswordOtp !== otp) {
      throw new BadRequestException('Código de seguridad inválido.');
    }

    if (new Date() > user.resetPasswordExpires!) {
      throw new BadRequestException(
        'El código ha expirado (más de 15 minutos). Solicite uno nuevo.',
      );
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.resetPasswordOtp = null as any;
    user.resetPasswordExpires = null as any;

    await this.saasUserRepo.save(user);

    return { success: true, message: 'Contraseña actualizada correctamente.' };
  }

  async updateProfile(userId: string, countryCode: string, phone: string) {
    const user = await this.saasUserRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    user.countryCode = countryCode;
    user.phone = phone;

    await this.saasUserRepo.save(user);

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        countryCode: user.countryCode,
        phone: user.phone,
      },
    };
  }
}
