import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPgTrgmAndProductNameGinIndex1760000000007
  implements MigrationInterface
{
  name = 'AddPgTrgmAndProductNameGinIndex1760000000007';
  transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);
    await queryRunner.query(
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_name_trgm ON "products" USING GIN ("name" gin_trgm_ops);`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_products_name_trgm;`);
  }
}

