import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNameAndTimestampToTenantUsers1772530000000 implements MigrationInterface {
  name = 'AddNameAndTimestampToTenantUsers1772530000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tenant_users" ADD "first_name" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_users" ADD "last_name" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_users" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tenant_users" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_users" DROP COLUMN "last_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_users" DROP COLUMN "first_name"`,
    );
  }
}
