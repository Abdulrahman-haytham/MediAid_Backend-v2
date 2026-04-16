import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPostGISExtensionAndSpatialIndexes1760000000001 implements MigrationInterface {
  name = 'AddPostGISExtensionAndSpatialIndexes1760000000001';
  transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable PostGIS extension — required for all spatial functions
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis;`);

    // Add geometry(Point, 4326) columns to existing tables that use lat/lng
    // Pharmacy table
    await queryRunner.query(
      `ALTER TABLE "pharmacies" ADD COLUMN IF NOT EXISTS "location" geometry(Point, 4326);`,
    );
    // Migrate existing lat/lng data into the geometry column
    // IMPORTANT: ST_MakePoint expects (longitude, latitude) — NOT (lat, lng)
    await queryRunner.query(
      `UPDATE "pharmacies" SET "location" = ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326) WHERE "latitude" IS NOT NULL AND "longitude" IS NOT NULL;`,
    );

    // Emergency orders table
    await queryRunner.query(
      `ALTER TABLE "emergency_orders" ADD COLUMN IF NOT EXISTS "location" geometry(Point, 4326);`,
    );
    await queryRunner.query(
      `UPDATE "emergency_orders" SET "location" = ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326) WHERE "latitude" IS NOT NULL AND "longitude" IS NOT NULL;`,
    );

    // Create GIST spatial indexes — enables fast nearest-neighbor queries
    // These indexes are used by ST_DWithin and ST_Distance when cast to ::geography
    await queryRunner.query(
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pharmacies_location_gist ON "pharmacies" USING GIST ("location");`,
    );
    await queryRunner.query(
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_emergency_orders_location_gist ON "emergency_orders" USING GIST ("location");`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_emergency_orders_location_gist;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_pharmacies_location_gist;`,
    );
    await queryRunner.query(
      `ALTER TABLE "emergency_orders" DROP COLUMN IF EXISTS "location";`,
    );
    await queryRunner.query(
      `ALTER TABLE "pharmacies" DROP COLUMN IF EXISTS "location";`,
    );
    // NOTE: We do NOT drop the postgis extension in down() as other
    // extensions or manual queries may depend on it.
  }
}
