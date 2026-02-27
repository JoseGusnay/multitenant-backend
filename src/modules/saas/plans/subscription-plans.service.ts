import { Injectable, NotFoundException, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionPlanCatalogEntity } from '../../../core/modules/tenant-identification/infrastructure/subscription-plan-catalog.entity';

@Injectable()
export class SubscriptionPlansService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SubscriptionPlansService.name);

  constructor(
    @InjectRepository(SubscriptionPlanCatalogEntity)
    private readonly planRepository: Repository<SubscriptionPlanCatalogEntity>,
  ) { }

  async onApplicationBootstrap() {
    this.logger.log('Iniciando verificación de Planes de Suscripción Master...');
    await this.seedDefaultPlans();
  }

  private async seedDefaultPlans() {
    const defaultPlans = [
      {
        id: 'BASIC',
        name: 'Plan Básico',
        description: 'Ideal para pequeños negocios',
        maxUsers: 10,
        maxInvoices: 100,
        maxBranches: 1,
        price: 29.99,
      },
      {
        id: 'PRO',
        name: 'Plan Profesional',
        description: 'Para empresas en crecimiento',
        maxUsers: 50,
        maxInvoices: 1000,
        maxBranches: 5,
        price: 99.99,
      },
      {
        id: 'ENTERPRISE',
        name: 'Plan Empresarial',
        description: 'Sin límites para grandes corporaciones',
        maxUsers: 9999,
        maxInvoices: 99999,
        maxBranches: 99,
        price: 299.99,
      },
    ];

    for (const planData of defaultPlans) {
      const exists = await this.planRepository.findOne({ where: { id: planData.id } });
      if (!exists) {
        const newPlan = this.planRepository.create(planData);
        await this.planRepository.save(newPlan);
        this.logger.log(`Plan ${planData.id} auto-generado exitosamente.`);
      }
    }
    this.logger.log('Semillado de Planes completado.');
  }

  async findAll(): Promise<SubscriptionPlanCatalogEntity[]> {
    return this.planRepository.find({ order: { price: 'ASC' } });
  }

  async findOne(id: string): Promise<SubscriptionPlanCatalogEntity> {
    const plan = await this.planRepository.findOne({ where: { id } });
    if (!plan) {
      throw new NotFoundException(`Plan with ID ${id} not found`);
    }
    return plan;
  }

  async update(
    id: string,
    data: Partial<SubscriptionPlanCatalogEntity>,
  ): Promise<SubscriptionPlanCatalogEntity> {
    const plan = await this.findOne(id);
    Object.assign(plan, data);
    return this.planRepository.save(plan);
  }

  async create(
    data: Partial<SubscriptionPlanCatalogEntity>,
  ): Promise<SubscriptionPlanCatalogEntity> {
    const plan = this.planRepository.create(data);
    return this.planRepository.save(plan);
  }
}

