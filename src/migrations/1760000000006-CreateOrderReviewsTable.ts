import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrderReviewsTable1760000000006 implements MigrationInterface {
  name = 'CreateOrderReviewsTable1760000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "order_reviews" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "orderId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "pharmacyId" uuid NOT NULL,
        "rating" INT NOT NULL,
        "comment" TEXT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_order_reviews" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_order_reviews_order" UNIQUE ("orderId")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "order_reviews"
      ADD CONSTRAINT "FK_order_reviews_order"
      FOREIGN KEY ("orderId") REFERENCES "orders"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "order_reviews"
      ADD CONSTRAINT "FK_order_reviews_user"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
    `);

    await queryRunner.query(`
      ALTER TABLE "order_reviews"
      ADD CONSTRAINT "FK_order_reviews_pharmacy"
      FOREIGN KEY ("pharmacyId") REFERENCES "pharmacies"("id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_order_review_order" ON "order_reviews" ("orderId")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_order_review_pharmacy" ON "order_reviews" ("pharmacyId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_order_review_pharmacy"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_order_review_order"`);
    await queryRunner.query(`ALTER TABLE "order_reviews" DROP CONSTRAINT IF EXISTS "FK_order_reviews_pharmacy"`);
    await queryRunner.query(`ALTER TABLE "order_reviews" DROP CONSTRAINT IF EXISTS "FK_order_reviews_user"`);
    await queryRunner.query(`ALTER TABLE "order_reviews" DROP CONSTRAINT IF EXISTS "FK_order_reviews_order"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "order_reviews"`);
  }
}
