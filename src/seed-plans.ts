import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SubscriptionPlansService } from './modules/saas/plans/subscription-plans.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule);
  const plansService = app.get(SubscriptionPlansService);

  const initialPlans = [
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

  console.log('--- Sembrando Planes de Suscripción ---');

  for (const planData of initialPlans) {
    try {
      await plansService.findOne(planData.id);
      console.log(`Plan ${planData.id} ya existe. Actualizando...`);
      await plansService.update(planData.id, planData);
    } catch {
      console.log(`Creando plan ${planData.id}...`);
      await plansService.create(planData);
    }
  }

  console.log('Sembrado completado.');
  await app.close();
}

bootstrap().catch((err: unknown) => {
  console.error('Error seeding plans', err);
  process.exit(1);
});
