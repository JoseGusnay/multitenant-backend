import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionPlansService } from './subscription-plans.service';
import { SubscriptionPlansController } from './subscription-plans.controller';
import { SubscriptionPlanCatalogEntity } from '../../../core/modules/tenant-identification/infrastructure/subscription-plan-catalog.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SubscriptionPlanCatalogEntity])],
  controllers: [SubscriptionPlansController],
  providers: [SubscriptionPlansService],
  exports: [SubscriptionPlansService],
})
export class SubscriptionPlansModule {}
