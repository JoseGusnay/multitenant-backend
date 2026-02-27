import { MigrationInterface, QueryRunner } from "typeorm";

export class MasterInitial1772205199568 implements MigrationInterface {
    name = 'MasterInitial1772205199568'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "subscription_plans" ("id" character varying NOT NULL, "name" character varying NOT NULL, "max_users" integer NOT NULL, "max_invoices" integer NOT NULL, "max_branches" integer NOT NULL, "description" character varying, "price" numeric(10,2) NOT NULL DEFAULT '0', "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9ab8fe6918451ab3d0a4fb6bb0c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "tenants" ("id" uuid NOT NULL, "name" character varying NOT NULL, "country_code" character varying, "phone" character varying, "subdomain" character varying NOT NULL, "db_connection_string" character varying NOT NULL, "status" character varying NOT NULL DEFAULT 'PROVISIONING', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "timezone" character varying NOT NULL DEFAULT 'UTC', "locale" character varying NOT NULL DEFAULT 'es-ES', "max_users_count" integer NOT NULL DEFAULT '10', "max_invoices_count" integer NOT NULL DEFAULT '100', "max_branches_count" integer NOT NULL DEFAULT '1', "current_plan_id" character varying NOT NULL DEFAULT 'BASIC', "require_mfa" boolean NOT NULL DEFAULT false, "admin_email" character varying, "allowedIps" jsonb NOT NULL DEFAULT '[]', "deleted_at" TIMESTAMP, CONSTRAINT "UQ_21bb89e012fa5b58532009c1601" UNIQUE ("subdomain"), CONSTRAINT "PK_53be67a04681c66b87ee27c9321" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "saas_permissions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" character varying, CONSTRAINT "UQ_db138321aa60172f2153a9429c7" UNIQUE ("name"), CONSTRAINT "PK_6d445b81c580ab49fa2d00513c8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "saas_roles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "UQ_caf201ce7cfcd9b77f2cdd53f97" UNIQUE ("name"), CONSTRAINT "PK_4cd94d095990c04594573d96507" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "saas_users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "passwordHash" character varying NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "countryCode" character varying, "phone" character varying, "resetPasswordOtp" character varying, "resetPasswordExpires" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "UQ_a7b333359cf3ac5628b7f82266b" UNIQUE ("email"), CONSTRAINT "PK_773facfdd448083dbf262426da5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "saas_role_permissions" ("role_id" uuid NOT NULL, "permission_id" uuid NOT NULL, CONSTRAINT "PK_610ddfc7d58a544d681184c0f85" PRIMARY KEY ("role_id", "permission_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_890ec584d193c10287762b0eb4" ON "saas_role_permissions" ("role_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_18c13f3273d3be83e46dbbfd54" ON "saas_role_permissions" ("permission_id") `);
        await queryRunner.query(`CREATE TABLE "saas_user_roles" ("user_id" uuid NOT NULL, "role_id" uuid NOT NULL, CONSTRAINT "PK_9cb550b9577674689b3478c780f" PRIMARY KEY ("user_id", "role_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_d09b4ed8d6d96cce46c8cb6ee2" ON "saas_user_roles" ("user_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_837307d97d19e634220a025ba2" ON "saas_user_roles" ("role_id") `);
        await queryRunner.query(`ALTER TABLE "tenants" ADD CONSTRAINT "FK_d487fa877acfd6e83e84d7798e8" FOREIGN KEY ("current_plan_id") REFERENCES "subscription_plans"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "saas_role_permissions" ADD CONSTRAINT "FK_890ec584d193c10287762b0eb47" FOREIGN KEY ("role_id") REFERENCES "saas_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "saas_role_permissions" ADD CONSTRAINT "FK_18c13f3273d3be83e46dbbfd54a" FOREIGN KEY ("permission_id") REFERENCES "saas_permissions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "saas_user_roles" ADD CONSTRAINT "FK_d09b4ed8d6d96cce46c8cb6ee20" FOREIGN KEY ("user_id") REFERENCES "saas_users"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "saas_user_roles" ADD CONSTRAINT "FK_837307d97d19e634220a025ba27" FOREIGN KEY ("role_id") REFERENCES "saas_roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "saas_user_roles" DROP CONSTRAINT "FK_837307d97d19e634220a025ba27"`);
        await queryRunner.query(`ALTER TABLE "saas_user_roles" DROP CONSTRAINT "FK_d09b4ed8d6d96cce46c8cb6ee20"`);
        await queryRunner.query(`ALTER TABLE "saas_role_permissions" DROP CONSTRAINT "FK_18c13f3273d3be83e46dbbfd54a"`);
        await queryRunner.query(`ALTER TABLE "saas_role_permissions" DROP CONSTRAINT "FK_890ec584d193c10287762b0eb47"`);
        await queryRunner.query(`ALTER TABLE "tenants" DROP CONSTRAINT "FK_d487fa877acfd6e83e84d7798e8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_837307d97d19e634220a025ba2"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d09b4ed8d6d96cce46c8cb6ee2"`);
        await queryRunner.query(`DROP TABLE "saas_user_roles"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_18c13f3273d3be83e46dbbfd54"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_890ec584d193c10287762b0eb4"`);
        await queryRunner.query(`DROP TABLE "saas_role_permissions"`);
        await queryRunner.query(`DROP TABLE "saas_users"`);
        await queryRunner.query(`DROP TABLE "saas_roles"`);
        await queryRunner.query(`DROP TABLE "saas_permissions"`);
        await queryRunner.query(`DROP TABLE "tenants"`);
        await queryRunner.query(`DROP TABLE "subscription_plans"`);
    }

}
