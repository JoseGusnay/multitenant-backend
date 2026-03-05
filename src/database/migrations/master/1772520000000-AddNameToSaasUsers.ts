import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNameToSaasUsers1772520000000 implements MigrationInterface {
  name = 'AddNameToSaasUsers1772520000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "saas_users" ADD "firstName" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "saas_users" ADD "lastName" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "saas_users" DROP COLUMN "lastName"`);
    await queryRunner.query(`ALTER TABLE "saas_users" DROP COLUMN "firstName"`);
  }
}
