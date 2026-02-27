import { Module } from '@nestjs/common';
import { TenantProvisioningService } from './tenant-provisioning.service';
import { DatabaseCreatorService } from './database-creator.service';
import { TenantProvisioningController } from './tenant-provisioning.controller';
import { TenantIdentificationModule } from '../../../core/modules/tenant-identification/tenant-identification.module';
import { TenantConnectionModule } from '../../../core/modules/tenant-connection/tenant-connection.module';
import { NotificationsModule } from '../../notifications/notifications.module';
import { SubscriptionPlansModule } from '../plans/subscription-plans.module';

@Module({
  imports: [
    TenantIdentificationModule, // Para obtener el ITenantRepository inyectado
    TenantConnectionModule, // Para obtener el TenantMigrationService
    NotificationsModule, // Para WhatsappService
    SubscriptionPlansModule,
  ],
  controllers: [TenantProvisioningController],
  providers: [DatabaseCreatorService, TenantProvisioningService],
  exports: [TenantProvisioningService], // Por si se requiere aprovisionar desde CLI / scripts
})
export class TenantProvisioningModule {}
