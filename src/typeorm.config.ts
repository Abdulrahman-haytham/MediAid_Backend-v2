import 'dotenv/config';
import { DataSource } from 'typeorm';

// Standalone TypeORM DataSource for CLI migrations (does NOT depend on Nest DI)
// Uses the same env vars as AppModule (see app.module.ts)

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,

  // Use file patterns so CLI can load entities without Nest
  entities: ['src/modules/**/*.entity.{ts,js}'],
  migrations: ['src/migrations/*.{ts,js}'],

  // For migrations we usually want logging on to see SQL
  logging: process.env.DB_LOGGING === 'true',
});

export default AppDataSource;
