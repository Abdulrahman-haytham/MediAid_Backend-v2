import 'dotenv/config';
import { DataSource } from 'typeorm';
import { join } from 'path';

// Standalone TypeORM DataSource for CLI migrations (does NOT depend on Nest DI)
// Uses the same env vars as AppModule (see app.module.ts)

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl:
    process.env.DB_SSL === 'true' || process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : undefined,

  entities: [join(__dirname, '**', '*.entity.js')],
  migrations: [join(__dirname, 'migrations', '*.js')],
  migrationsRun: true,

  logging: process.env.DB_LOGGING === 'true',
});

export default AppDataSource;
