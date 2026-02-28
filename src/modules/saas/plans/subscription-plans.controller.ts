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
import { GlobalAdminGuard } from '../auth/global-admin.guard';
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

  @UseGuards(GlobalAdminGuard)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: Partial<SubscriptionPlanCatalogEntity>,
  ): Promise<SubscriptionPlanCatalogEntity> {
    return this.plansService.update(id, body);
  }

  @UseGuards(GlobalAdminGuard)
  @Post()
  async create(
    @Body() body: Partial<SubscriptionPlanCatalogEntity>,
  ): Promise<SubscriptionPlanCatalogEntity> {
    return this.plansService.create(body);
  }
}
