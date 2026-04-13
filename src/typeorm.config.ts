import 'dotenv/config';
import { DataSource } from 'typeorm';
import { join } from 'path';

// Note: This file is compiled to CommonJS by nest build,
// so __dirname is available and works correctly.

// Standalone TypeORM DataSource for CLI migrations (does NOT depend on Nest DI)
// Uses the same env vars as AppModule (see app.module.ts)
const AppDataSource = new DataSource({
  type: 'postgres',
  url: (() => {
    const directUrl = process.env.DATABASE_URL;
    if (directUrl) return directUrl;

    const host = process.env.DB_HOST;
    const port = process.env.DB_PORT;
    const username = process.env.DB_USER;
    const password = process.env.DB_PASS;
    const database = process.env.DB_NAME;

    if (!host || !port || !username || !password || !database) {
      throw new Error(
        'Missing database connection settings. Provide DATABASE_URL or DB_HOST/DB_PORT/DB_USER/DB_PASS/DB_NAME.',
      );
    }

    return `postgresql://${encodeURIComponent(
      username,
    )}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
  })(),
  ssl:
    process.env.DB_SSL === 'true' || process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : undefined,

  // Paths for compiled .js files (after `pnpm run build`)
  // When running from source (dev), ts-node handles resolution automatically.
  entities: [join(__dirname, '**', '*.entity.js')],
  migrations: [join(__dirname, 'migrations', '*.js')],
  migrationsRun: false,

  logging: process.env.DB_LOGGING === 'true',
});

export default AppDataSource;
