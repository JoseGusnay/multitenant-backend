import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SubscriptionPlansService } from './subscription-plans.service';
import { SaasPermissionGuard } from '../auth/saas-permission.guard';
import { SaasPermission } from '../auth/saas-permission.decorator';
import { SubscriptionPlanCatalogEntity } from '../../../core/modules/tenant-identification/infrastructure/subscription-plan-catalog.entity';

@Controller('backoffice/plans')
export class SubscriptionPlansController {
  constructor(private readonly plansService: SubscriptionPlansService) {}

  @Get()
  async getAll(): Promise<SubscriptionPlanCatalogEntity[]> {
    return this.plansService.findAll();
  }

  @Get(':id')
  async getOne(
    @Param('id') id: string,
  ): Promise<SubscriptionPlanCatalogEntity> {
    return this.plansService.findOne(id);
  }

  @SaasPermission('SAAS_TENANTS_UPDATE')
  @UseGuards(SaasPermissionGuard)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: Partial<SubscriptionPlanCatalogEntity>,
  ): Promise<SubscriptionPlanCatalogEntity> {
    return this.plansService.update(id, body);
  }

  @SaasPermission('SAAS_TENANTS_CREATE')
  @UseGuards(SaasPermissionGuard)
  @Post()
  async create(
    @Body() body: Partial<SubscriptionPlanCatalogEntity>,
  ): Promise<SubscriptionPlanCatalogEntity> {
    return this.plansService.create(body);
  }
}
