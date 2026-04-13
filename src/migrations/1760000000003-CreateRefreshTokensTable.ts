import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRefreshTokensTable1760000000003 implements MigrationInterface {
  name = 'CreateRefreshTokensTable1760000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "refresh_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "token" character varying NOT NULL,
        "userId" uuid NOT NULL,
        "expiresAt" TIMESTAMP NOT NULL,
        "isRevoked" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_refresh_tokens" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "refresh_tokens"
      ADD CONSTRAINT "FK_refresh_tokens_user"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_refresh_tokens_user" ON "refresh_tokens" ("userId")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_refresh_tokens_token" ON "refresh_tokens" ("token")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_refresh_tokens_token"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_refresh_tokens_user"`);
    await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP CONSTRAINT IF EXISTS "FK_refresh_tokens_user"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens"`);
  }
}
