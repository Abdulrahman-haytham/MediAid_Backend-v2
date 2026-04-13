import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFcmTokenToUsers1760000000004 implements MigrationInterface {
  name = 'AddFcmTokenToUsers1760000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "fcm_token" VARCHAR NULL;`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "fcm_token";`,
    );
  }
}
