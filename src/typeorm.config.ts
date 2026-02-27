import 'dotenv/config';
import { DataSource } from 'typeorm';

// Standalone TypeORM DataSource for CLI migrations (does NOT depend on Nest DI)
// Uses the same env vars as AppModule (see app.module.ts)

const DB_PORT = parseInt(process.env.DB_PORT || '5432', 10);

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number.isFinite(DB_PORT) ? DB_PORT : 5432,
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'mediaid',

  // Use file patterns so CLI can load entities without Nest
  entities: ['src/modules/**/*.entity.{ts,js}'],
  migrations: ['src/migrations/*.{ts,js}'],

  // For migrations we usually want logging on to see SQL
  logging: process.env.DB_LOGGING === 'true',
});

export default AppDataSource;

