import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import * as Joi from 'joi';
import { APP_PIPE, APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TenantIdentificationModule } from './core/modules/tenant-identification/tenant-identification.module';
import { TenantConnectionModule } from './core/modules/tenant-connection/tenant-connection.module';
import { BusinessModule } from './modules/b2b/business.module';
import { TenantProvisioningModule } from './modules/saas/provisioning/tenant-provisioning.module';
import { AuthModule } from './modules/saas/auth/auth.module';
import { SaasRbacModule } from './modules/saas/rbac/saas-rbac.module';
import { TransformInterceptor } from './core/interceptors/transform.interceptor';
import { SlidingExpirationInterceptor } from './core/interceptors/sliding-expiration.interceptor';
import { B2bAuthModule } from './modules/b2b/auth/b2b-auth.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SubscriptionPlansModule } from './modules/saas/plans/subscription-plans.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        DB_MIGRATION_TEMP_URL: Joi.string().uri().required(),
        JWT_SECRET: Joi.string().required(),
        PORT: Joi.number().default(3000),
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
      }),
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DB_MIGRATION_TEMP_URL'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'], // Carga recursiva global (Solo lo de /src, no lo de migrations)
        synchronize: false, // ¡NUNCA EN TRUE! Previene eliminación o alteración accidental de tablas.
        migrations: [__dirname + '/database/migrations/master/*{.ts,.js}'],
        migrationsRun: true, // AUTO-EJECUTA LAS MIGRACIONES EN EL ARRANQUE
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    TenantIdentificationModule,
    TenantConnectionModule,
    BusinessModule,
    TenantProvisioningModule,
    AuthModule,
    B2bAuthModule,
    SaasRbacModule,
    EventEmitterModule.forRoot(),
    NotificationsModule,
    SubscriptionPlansModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: SlidingExpirationInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    AppService,
  ],
})
export class AppModule { }
