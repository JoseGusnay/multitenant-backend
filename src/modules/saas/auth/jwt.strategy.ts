import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { TokenPayloadUser } from './interfaces/token-payload-user.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey:
        configService.get<string>('JWT_SECRET') || 'fallback_preventivo', // Tomado de variables validadas
    });
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async validate(payload: JwtPayload): Promise<TokenPayloadUser> {
    if (!payload.tenantId && !payload.isGlobalAdmin) {
      throw new UnauthorizedException(
        'El token no posee un ámbito de aislamiento válido ni es administrador global',
      );
    }

    return {
      sub: payload.sub,
      username: payload.email,
      tenantId: payload.tenantId,
      isGlobalAdmin: payload.isGlobalAdmin,
      permissions: payload.permissions,
    };
  }
}
