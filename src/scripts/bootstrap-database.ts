import 'dotenv/config';
import { DataSource, QueryRunner } from 'typeorm';
import AppDataSource from '../typeorm.config';

const MIGRATIONS_TABLE_NAME =
  AppDataSource.options.migrationsTableName ?? 'migrations';
const SHOULD_BOOTSTRAP_SCHEMA =
  process.env.DB_BOOTSTRAP_SCHEMA !== 'false';

type ExecutedMigration = {
  name: string;
  timestamp: number;
};

async function bootstrapDatabase() {
  const dataSource = AppDataSource as DataSource;

  try {
    await dataSource.initialize();

    const queryRunner = dataSource.createQueryRunner();

    try {
      const usersTableExists = await queryRunner.hasTable('users');
      const migrationsTableExists = await queryRunner.hasTable(
        MIGRATIONS_TABLE_NAME,
      );

      if (SHOULD_BOOTSTRAP_SCHEMA && (!usersTableExists || !migrationsTableExists)) {
        console.log(
          '[db:bootstrap] Bootstrapping schema from current entities before first production start...',
        );

        await dataSource.synchronize();
        await baselineCurrentMigrations(dataSource, queryRunner);

        console.log('[db:bootstrap] Schema bootstrap completed.');
        return;
      }

      const executedMigrations = await getExecutedMigrations(
        queryRunner,
        MIGRATIONS_TABLE_NAME,
      );

      if (executedMigrations.length === 0 && SHOULD_BOOTSTRAP_SCHEMA) {
        console.log(
          '[db:bootstrap] No migration history detected. Marking current migrations as baseline.',
        );
        await baselineCurrentMigrations(dataSource, queryRunner);
        console.log('[db:bootstrap] Migration baseline completed.');
        return;
      }

      const pendingMigrations = getConfiguredMigrations(dataSource).filter(
        (migration) =>
          !executedMigrations.some(
            (executedMigration) => executedMigration.name === migration.name,
          ),
      );

      if (pendingMigrations.length > 0) {
        console.log(
          `[db:bootstrap] Running ${pendingMigrations.length} pending migration(s)...`,
        );
        await dataSource.runMigrations();
      } else {
        console.log('[db:bootstrap] Database schema is up to date.');
      }
    } finally {
      await queryRunner.release();
    }
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

async function baselineCurrentMigrations(
  dataSource: DataSource,
  queryRunner: QueryRunner,
) {
  await queryRunner.query(`
    CREATE TABLE IF NOT EXISTS "${MIGRATIONS_TABLE_NAME}" (
      "id" SERIAL PRIMARY KEY,
      "timestamp" bigint NOT NULL,
      "name" character varying NOT NULL
    )
  `);

  const executedMigrations = await getExecutedMigrations(
    queryRunner,
    MIGRATIONS_TABLE_NAME,
  );
  const executedNames = new Set(executedMigrations.map((migration) => migration.name));
  const migrationsToInsert = getConfiguredMigrations(dataSource).filter(
    (migration) => !executedNames.has(migration.name),
  );

  if (migrationsToInsert.length === 0) {
    return;
  }

  await queryRunner.manager
    .createQueryBuilder()
    .insert()
    .into(MIGRATIONS_TABLE_NAME)
    .values(migrationsToInsert)
    .execute();
}

async function getExecutedMigrations(
  queryRunner: QueryRunner,
  migrationsTableName: string,
): Promise<ExecutedMigration[]> {
  const migrationsTableExists = await queryRunner.hasTable(migrationsTableName);

  if (!migrationsTableExists) {
    return [];
  }

  const rows = (await queryRunner.query(
    `SELECT "timestamp", "name" FROM "${migrationsTableName}"`,
  )) as Array<{ timestamp: string | number; name: string }>;

  return rows.map((row) => ({
    name: row.name,
    timestamp: Number(row.timestamp),
  }));
}

function getConfiguredMigrations(dataSource: DataSource): ExecutedMigration[] {
  return dataSource.migrations
    .map((migration) => {
      const name = migration.name || migration.constructor.name;
      const timestamp = Number.parseInt(name.slice(-13), 10);

      if (!Number.isFinite(timestamp)) {
        throw new Error(
          `Migration "${name}" must end with a 13-digit timestamp to be baselined safely.`,
        );
      }

      return { name, timestamp };
    })
    .sort((left, right) => left.timestamp - right.timestamp);
}

bootstrapDatabase().catch((error: Error) => {
  console.error('[db:bootstrap] Failed to prepare database:', error.message);
  console.error(error.stack);
  process.exit(1);
});
