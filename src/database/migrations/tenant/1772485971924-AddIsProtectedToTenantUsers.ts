import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsProtectedToTenantUsers1772485971924 implements MigrationInterface {
  name = 'AddIsProtectedToTenantUsers1772485971924';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tenant_users" ADD "is_protected" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tenant_users" DROP COLUMN "is_protected"`,
    );
  }
}
