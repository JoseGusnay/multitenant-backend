import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handleRequest<TUser = any>(err: any, user: TUser, info: any): TUser {
        // Si hay un error o no hay usuario, simplemente retornamos null
        // en lugar de lanzar una UnauthorizedException (comportamiento por defecto)
        if (err || !user) {
            return null as unknown as TUser;
        }
        return user;
    }
}
