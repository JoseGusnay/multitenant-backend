import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { B2bAuthService } from './b2b-auth.service';
import { B2bAuthController } from './b2b-auth.controller';
import { TenantConnectionModule } from '../../../core/modules/tenant-connection/tenant-connection.module';

@Module({
  imports: [
    // Importamos TenantConnectionModule para poder usar el Scope.REQUEST del DataSource Inyectado
    TenantConnectionModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '8h' }, // 8h para empleados de empresas
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [B2bAuthService],
  controllers: [B2bAuthController],
  exports: [B2bAuthService],
})
export class B2bAuthModule {}
