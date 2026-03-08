import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPasswordRecoveryToTenantUsers1773000000000 implements MigrationInterface {
    name = 'AddPasswordRecoveryToTenantUsers1773000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "tenant_users" ADD "country_code" character varying`,
        );
        await queryRunner.query(
            `ALTER TABLE "tenant_users" ADD "phone" character varying`,
        );
        await queryRunner.query(
            `ALTER TABLE "tenant_users" ADD "reset_password_otp" character varying`,
        );
        await queryRunner.query(
            `ALTER TABLE "tenant_users" ADD "reset_password_expires" TIMESTAMP`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "tenant_users" DROP COLUMN "reset_password_expires"`,
        );
        await queryRunner.query(
            `ALTER TABLE "tenant_users" DROP COLUMN "reset_password_otp"`,
        );
        await queryRunner.query(
            `ALTER TABLE "tenant_users" DROP COLUMN "phone"`,
        );
        await queryRunner.query(
            `ALTER TABLE "tenant_users" DROP COLUMN "country_code"`,
        );
    }
}
