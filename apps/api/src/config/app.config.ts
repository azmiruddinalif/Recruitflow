import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.API_PORT ?? process.env.PORT ?? 4000),
  apiPrefix: process.env.API_PREFIX ?? 'api/v1',
  appUrl: process.env.APP_URL ?? 'http://localhost:3000',
  apiUrl: process.env.API_URL ?? 'http://localhost:4000',
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000,http://127.0.0.1:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  selfHostedMode: (process.env.SELF_HOSTED_MODE ?? 'true') === 'true',
  storageDriver: (process.env.STORAGE_DRIVER ?? 'local') as 'local' | 's3',
  storageLocalDir: process.env.STORAGE_LOCAL_DIR ?? './storage/uploads',
  maxUploadSizeBytes: Number(process.env.MAX_UPLOAD_SIZE_BYTES ?? 10 * 1024 * 1024),
  aiDefaultProvider: process.env.AI_DEFAULT_PROVIDER ?? 'GEMINI',
}));

export default appConfig;
