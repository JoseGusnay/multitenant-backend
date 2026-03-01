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
import { UpdateTenantPlanDto } from './dto/update-tenant-plan.dto';
import { SaasPermissionGuard } from '../auth/saas-permission.guard';
import { SaasPermission } from '../auth/saas-permission.decorator';
import { Query } from '@nestjs/common';
import { PageOptionsDto } from '../../../core/pagination/dto/page-options.dto';
import { AdvancedFilterPipe } from '../../../core/filters/pipes/advanced-filter.pipe';
import { FilterCondition } from '../../../core/filters/interfaces/filter-condition.interface';
import { WhatsappService } from '../../notifications/whatsapp/whatsapp.service';

const SUBDOMAIN_PATH = ':subdomain';

@UseGuards(SaasPermissionGuard)
@Controller('backoffice/tenants')
export class TenantProvisioningController {
  constructor(
    private readonly provisioningService: TenantProvisioningService,
    private readonly eventEmitter: EventEmitter2,
    private readonly whatsappService: WhatsappService,
  ) {}

  @SaasPermission('SAAS_TENANTS_CREATE')
  @Post('provision')
  async provision(@Body() body: CreateTenantDto): Promise<{
    message: string;
    data: {
      id: string;
      name: string;
      subdomain: string;
      databaseName: string | undefined;
    };
  }> {
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

  @SaasPermission('SAAS_TENANTS_UPDATE')
  @Post(':subdomain/send-credentials')
  async sendCredentials(
    @Param('subdomain') subdomain: string,
  ): Promise<{ message: string; success: boolean }> {
    const result = await this.provisioningService.sendCredentials(subdomain);

    if (!result.success) {
      throw new BadRequestException(
        'No se pudo enviar el mensaje por WhatsApp. Verifica que el servicio esté activo.',
      );
    }

    return {
      message: 'Credenciales regeneradas y enviadas por WhatsApp exitosamente.',
      success: true,
    };
  }

  @SaasPermission('SAAS_TENANTS_VIEW')
  @Sse('provision/:id/status')
  provisionStatus(@Param('id') id: string): Observable<MessageEvent> {
    return fromEvent(this.eventEmitter, `tenant.provisioning.${id}`).pipe(
      map(
        (payload: object): MessageEvent => ({
          data: payload,
        }),
      ),
    );
  }

  @SaasPermission('SAAS_TENANTS_VIEW')
  @Get('stats')
  async getStats(): Promise<unknown> {
    return await this.provisioningService.getStats();
  }

  @SaasPermission('SAAS_TENANTS_VIEW')
  @Get()
  async findAll(
    @Query() pageOptions: PageOptionsDto,
    @Query(AdvancedFilterPipe) filters: FilterCondition[],
  ): Promise<unknown> {
    return await this.provisioningService.getAllTenants(pageOptions, filters);
  }

  @SaasPermission('SAAS_TENANTS_VIEW')
  @Get(SUBDOMAIN_PATH)
  async findOne(
    @Param('subdomain') subdomain: string,
  ): Promise<{ data: unknown }> {
    const tenant = await this.provisioningService.getTenant(subdomain);
    return { data: tenant };
  }

  @SaasPermission('SAAS_TENANTS_UPDATE')
  @Patch(SUBDOMAIN_PATH)
  async update(
    @Param('subdomain') subdomain: string,
    @Body() updateDto: UpdateTenantDto,
  ): Promise<{ message: string; data: unknown }> {
    const tenant = await this.provisioningService.updateTenant(
      subdomain,
      updateDto,
    );
    return { message: 'Inquilino actualizado', data: tenant };
  }

  @SaasPermission('SAAS_TENANTS_UPDATE')
  @Patch(`${SUBDOMAIN_PATH}/plan`)
  async updatePlan(
    @Param('subdomain') subdomain: string,
    @Body() planDto: UpdateTenantPlanDto,
  ): Promise<{ message: string; data: unknown }> {
    const tenant = await this.provisioningService.updateTenantPlan(
      subdomain,
      planDto,
    );
    return { message: 'Plan de suscripción actualizado', data: tenant };
  }

  @SaasPermission('SAAS_TENANTS_DELETE')
  @Delete(SUBDOMAIN_PATH)
  async remove(
    @Param('subdomain') subdomain: string,
  ): Promise<{ message: string }> {
    await this.provisioningService.deleteTenant(subdomain);
    return { message: 'Inquilino y su BD fueron eliminados permanentemente' };
  }
}
