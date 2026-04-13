import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTokenVersionToUsers1760000000002 implements MigrationInterface {
  name = 'AddTokenVersionToUsers1760000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "token_version" INT DEFAULT 0;`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "token_version";`,
    );
  }
}
