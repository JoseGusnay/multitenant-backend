import {
  Controller,
  Post,
  Body,
  Get,
  Patch,
  Delete,
  Param,
  Sse,
  MessageEvent,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Observable, fromEvent } from 'rxjs';
import { map } from 'rxjs/operators';
import { TenantProvisioningService } from './tenant-provisioning.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { SendCredentialsDto } from './dto/send-credentials.dto';
import { UpdateTenantPlanDto } from './dto/update-tenant-plan.dto';
import { GlobalAdminGuard } from '../auth/global-admin.guard';
import { Query } from '@nestjs/common';
import { PageOptionsDto } from '../../../core/pagination/dto/page-options.dto';
import { AdvancedFilterPipe } from '../../../core/filters/pipes/advanced-filter.pipe';
import { FilterCondition } from '../../../core/filters/interfaces/filter-condition.interface';
import { WhatsappService } from '../../notifications/whatsapp/whatsapp.service';

@Controller('backoffice/tenants')
@UseGuards(GlobalAdminGuard)
export class TenantProvisioningController {
  constructor(
    private readonly provisioningService: TenantProvisioningService,
    private readonly eventEmitter: EventEmitter2,
    private readonly whatsappService: WhatsappService,
  ) {}

  @Post('provision')
  async provision(@Body() body: CreateTenantDto) {
    const tenant = await this.provisioningService.provisionNewTenant(body);
    return {
      message:
        'Aprovisionamiento encolado. Conéctate a /status para ver el progreso en tiempo real.',
      data: {
        id: tenant.id,
        name: tenant.name,
        subdomain: tenant.subdomain,
        databaseName: tenant.getConnectionString().split('/').pop(),
      },
    };
  }

  @Post('send-credentials')
  async sendCredentials(@Body() body: SendCredentialsDto) {
    const sent = await this.whatsappService.sendTenantCredentials(body.phone, {
      tenantName: body.tenantName,
      subdomain: body.subdomain,
      adminEmail: body.adminEmail,
      adminPassword: body.adminPassword,
      timezone: body.timezone,
    });

    if (!sent) {
      throw new BadRequestException(
        'No se pudo enviar el mensaje por WhatsApp. Verifica que el servicio esté activo.',
      );
    }

    return { message: 'Credenciales enviadas por WhatsApp exitosamente.' };
  }

  @Sse('provision/:id/status')
  provisionStatus(@Param('id') id: string): Observable<MessageEvent> {
    return fromEvent(this.eventEmitter, `tenant.provisioning.${id}`).pipe(
      map((payload: object) => ({
        data: payload,
      })),
    );
  }

  @Get('stats')
  async getStats() {
    return await this.provisioningService.getStats();
  }

  @Get()
  async findAll(
    @Query() pageOptions: PageOptionsDto,
    @Query(AdvancedFilterPipe) filters: FilterCondition[],
  ) {
    return await this.provisioningService.getAllTenants(pageOptions, filters);
  }

  @Get(':subdomain')
  async findOne(@Param('subdomain') subdomain: string) {
    const tenant = await this.provisioningService.getTenant(subdomain);
    return { data: tenant };
  }

  @Patch(':subdomain')
  async update(
    @Param('subdomain') subdomain: string,
    @Body() updateDto: UpdateTenantDto,
  ) {
    const tenant = await this.provisioningService.updateTenant(
      subdomain,
      updateDto,
    );
    return { message: 'Inquilino actualizado', data: tenant };
  }

  @Patch(':subdomain/plan')
  async updatePlan(
    @Param('subdomain') subdomain: string,
    @Body() planDto: UpdateTenantPlanDto,
  ) {
    const tenant = await this.provisioningService.updateTenantPlan(
      subdomain,
      planDto,
    );
    return { message: 'Plan de suscripción actualizado', data: tenant };
  }

  @Delete(':subdomain')
  async remove(@Param('subdomain') subdomain: string) {
    await this.provisioningService.deleteTenant(subdomain);
    return { message: 'Inquilino y su BD fueron eliminados permanentemente' };
  }
}
