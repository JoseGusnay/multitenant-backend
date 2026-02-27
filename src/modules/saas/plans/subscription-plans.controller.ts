import { Controller, Get, Patch, Param, Body, Post } from '@nestjs/common';
import { SubscriptionPlansService } from './subscription-plans.service';

@Controller('backoffice/plans')
export class SubscriptionPlansController {
  constructor(private readonly plansService: SubscriptionPlansService) {}

  @Get()
  async getAll() {
    return this.plansService.findAll();
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.plansService.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.plansService.update(id, body);
  }

  @Post()
  async create(@Body() body: any) {
    return this.plansService.create(body);
  }
}
