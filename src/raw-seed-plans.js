const { Client } = require('pg');

async function seed() {
    const client = new Client({
        connectionString: 'postgresql://postgres:postgres@localhost:54321/postgres'
    });

    try {
        await client.connect();
        console.log('Conectado a la base de datos master (postgres).');

        // Crear la tabla manualmente ya que synchronize no llega a correr por el error de FK
        console.log('Creando tabla subscription_plans si no existe...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS "subscription_plans" (
        "id" character varying NOT NULL,
        "name" character varying NOT NULL,
        "max_users" integer NOT NULL,
        "max_invoices" integer NOT NULL,
        "max_branches" integer NOT NULL,
        "description" character varying,
        "price" numeric(10,2) NOT NULL DEFAULT 0,
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_subscription_plans" PRIMARY KEY ("id")
      )
    `);

        const plans = [
            ['BASIC', 'Plan Básico', 'Ideal para pequeños negocios', 10, 100, 1, 29.99],
            ['PRO', 'Plan Profesional', 'Para empresas en crecimiento', 50, 1000, 5, 99.99],
            ['ENTERPRISE', 'Plan Empresarial', 'Sin límites para grandes corporaciones', 9999, 99999, 99, 299.99]
        ];

        for (const plan of plans) {
            await client.query(
                `INSERT INTO subscription_plans (id, name, description, max_users, max_invoices, max_branches, price) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET 
         name = EXCLUDED.name, 
         description = EXCLUDED.description, 
         max_users = EXCLUDED.max_users, 
         max_invoices = EXCLUDED.max_invoices, 
         max_branches = EXCLUDED.max_branches, 
         price = EXCLUDED.price`,
                plan
            );
            console.log(`Plan ${plan[0]} sembrado/actualizado.`);
        }

    } catch (err) {
        console.error('Error sembrando planes:', err);
    } finally {
        await client.end();
    }
}

seed();
