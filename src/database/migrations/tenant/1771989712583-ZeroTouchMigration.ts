import { MigrationInterface, QueryRunner } from 'typeorm';

export class ZeroTouchMigration1771989712583 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Necesitamos la extensión ext-ossp para soportar uuid_generate_v4() si usamos UUIDs nativos en postgres
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
            CREATE TABLE "permissions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                "description" character varying,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_permissions_name" UNIQUE ("name"),
                CONSTRAINT "PK_permissions" PRIMARY KEY ("id")
            )
        `);

    await queryRunner.query(`
            CREATE TABLE "roles" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMP,
                CONSTRAINT "UQ_roles_name" UNIQUE ("name"),
                CONSTRAINT "PK_roles" PRIMARY KEY ("id")
            )
        `);

    await queryRunner.query(`
            CREATE TABLE "role_permissions" (
                "role_id" uuid NOT NULL,
                "permission_id" uuid NOT NULL,
                CONSTRAINT "PK_role_permissions" PRIMARY KEY ("role_id", "permission_id")
            )
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_rp_role" ON "role_permissions" ("role_id");
            CREATE INDEX "IDX_rp_permission" ON "role_permissions" ("permission_id");
            ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_rp_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
            ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_rp_permission" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        `);

    await queryRunner.query(`
            CREATE TABLE "tenant_users" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "email" character varying NOT NULL,
                "password_hash" character varying NOT NULL,
                "is_active" boolean NOT NULL DEFAULT true,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_tenant_users_email" UNIQUE ("email"),
                CONSTRAINT "PK_tenant_users" PRIMARY KEY ("id")
            )
        `);

    await queryRunner.query(`
            CREATE TABLE "tenant_user_roles" (
                "user_id" uuid NOT NULL,
                "role_id" uuid NOT NULL,
                CONSTRAINT "PK_tenant_user_roles" PRIMARY KEY ("user_id", "role_id")
            )
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_tur_user" ON "tenant_user_roles" ("user_id");
            CREATE INDEX "IDX_tur_role" ON "tenant_user_roles" ("role_id");
            ALTER TABLE "tenant_user_roles" ADD CONSTRAINT "FK_tur_user" FOREIGN KEY ("user_id") REFERENCES "tenant_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
            ALTER TABLE "tenant_user_roles" ADD CONSTRAINT "FK_tur_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        `);

    await queryRunner.query(`
            CREATE TABLE "categories" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "deletedAt" TIMESTAMP,
                "name" character varying(150) NOT NULL,
                "description" text,
                CONSTRAINT "UQ_categories_name" UNIQUE ("name"),
                CONSTRAINT "PK_categories_id" PRIMARY KEY ("id")
            )
        `);

    await queryRunner.query(`
            CREATE TABLE "products" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "deletedAt" TIMESTAMP WITH TIME ZONE,
                "sku" character varying(50) NOT NULL,
                "name" character varying(150) NOT NULL,
                "description" text,
                "price" numeric(10,2) NOT NULL DEFAULT '0',
                "stock" integer NOT NULL DEFAULT 0,
                "isActive" boolean NOT NULL DEFAULT true,
                "category_id" uuid,
                CONSTRAINT "UQ_products_sku" UNIQUE ("sku"),
                CONSTRAINT "PK_products_id" PRIMARY KEY ("id")
            )
        `);

    await queryRunner.query(`
            ALTER TABLE "products" ADD CONSTRAINT "FK_products_category" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tenant_user_roles" DROP CONSTRAINT "FK_tur_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_user_roles" DROP CONSTRAINT "FK_tur_role"`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_rp_role"`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_rp_permission"`,
    );

    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT "FK_products_category"`,
    );

    await queryRunner.query(`DROP TABLE "products"`);
    await queryRunner.query(`DROP TABLE "categories"`);
    await queryRunner.query(`DROP TABLE "tenant_user_roles"`);
    await queryRunner.query(`DROP TABLE "tenant_users"`);
    await queryRunner.query(`DROP TABLE "role_permissions"`);
    await queryRunner.query(`DROP TABLE "roles"`);
    await queryRunner.query(`DROP TABLE "permissions"`);
  }
}
