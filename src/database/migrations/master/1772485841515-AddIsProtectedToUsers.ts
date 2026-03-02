import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsProtectedToUsers1772485841515 implements MigrationInterface {
  name = 'AddIsProtectedToUsers1772485841515';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "saas_users" ADD "isProtected" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "saas_users" DROP COLUMN "isProtected"`,
    );
  }
}
