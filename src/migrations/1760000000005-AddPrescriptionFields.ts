import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPrescriptionFields1760000000005 implements MigrationInterface {
  name = 'AddPrescriptionFields1760000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add requires_prescription to products
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "requires_prescription" BOOLEAN DEFAULT FALSE;`,
    );

    // Add prescription_image_url to orders
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "prescription_image_url" VARCHAR NULL;`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN IF EXISTS "prescription_image_url";`,
    );

    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN IF EXISTS "requires_prescription";`,
    );
  }
}
