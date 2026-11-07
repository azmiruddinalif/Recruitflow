import { registerAs } from '@nestjs/config';

export const databaseConfig = registerAs('database', () => ({
  url:
    process.env.DATABASE_URL ??
    'postgresql://postgres:postgres@localhost:5432/recruitflow?schema=public',
  logQueries: process.env.DATABASE_LOG_QUERIES === 'true',
}));

export default databaseConfig;
