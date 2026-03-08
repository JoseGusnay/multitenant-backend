import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { TokenPayloadUser } from './interfaces/token-payload-user.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          let token = null;
          if (request && request.cookies) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
            token = request.cookies['b2b_access_token'];
          }
          return typeof token === 'string' ? token : null;
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      secretOrKey:
        configService.get<string>('JWT_SECRET') || 'fallback_preventivo', // Tomado de variables validadas
    });
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async validate(payload: JwtPayload): Promise<TokenPayloadUser> {
    if (!payload.tenantId && !payload.isGlobalAdmin) {
      throw new UnauthorizedException(
        `El token no posee un ámbito de aislamiento válido ni es administrador global. Payload recibido: ${JSON.stringify(payload)}`,
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
