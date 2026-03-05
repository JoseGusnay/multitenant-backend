import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsProtectedToTenantUsers1772485971924 implements MigrationInterface {
  name = 'AddIsProtectedToTenantUsers1772485971924';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tenant_users" ADD "is_protected" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `CREATE TABLE "branches" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "name" character varying NOT NULL, "address" character varying, "phone" character varying, "city" character varying, "is_active" boolean NOT NULL DEFAULT true, "is_main" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_7f37d3b42defea97f1df0d19535" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "tenant_user_branches" ("user_id" uuid NOT NULL, "branch_id" uuid NOT NULL, CONSTRAINT "PK_1d3cd38267a8da04ac92bfe8cb3" PRIMARY KEY ("user_id", "branch_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ebf1034cf03a71a4c6bff7f73c" ON "tenant_user_branches" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4fbc8331a6275beda0bf891b80" ON "tenant_user_branches" ("branch_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_user_branches" ADD CONSTRAINT "FK_ebf1034cf03a71a4c6bff7f73c1" FOREIGN KEY ("user_id") REFERENCES "tenant_users"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_user_branches" ADD CONSTRAINT "FK_4fbc8331a6275beda0bf891b809" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tenant_user_branches" DROP CONSTRAINT "FK_4fbc8331a6275beda0bf891b809"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_user_branches" DROP CONSTRAINT "FK_ebf1034cf03a71a4c6bff7f73c1"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4fbc8331a6275beda0bf891b80"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ebf1034cf03a71a4c6bff7f73c"`,
    );
    await queryRunner.query(`DROP TABLE "tenant_user_branches"`);
    await queryRunner.query(`DROP TABLE "branches"`);
    await queryRunner.query(
      `ALTER TABLE "tenant_users" DROP COLUMN "is_protected"`,
    );
  }
}
