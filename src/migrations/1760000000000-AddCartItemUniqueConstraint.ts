import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCartItemUniqueConstraint1760000000000 implements MigrationInterface {
  name = 'AddCartItemUniqueConstraint1760000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cart_items" ADD CONSTRAINT "UQ_cart_items_cart_product_pharmacy" UNIQUE ("cartId", "productId", "pharmacyId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cart_items" DROP CONSTRAINT "UQ_cart_items_cart_product_pharmacy"`,
    );
  }
}
