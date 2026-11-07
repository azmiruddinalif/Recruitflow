import { Global, Module } from '@nestjs/common';
import { LocalStorageProvider } from './local-storage.provider';
import { S3StorageProvider } from './s3-storage.provider';
import { STORAGE_PROVIDER } from './storage.interface';

@Global()
@Module({
  providers: [
    LocalStorageProvider,
    S3StorageProvider,
    {
      provide: STORAGE_PROVIDER,
      useFactory: (local: LocalStorageProvider, s3: S3StorageProvider) => {
        return process.env.STORAGE_DRIVER === 's3' ? s3 : local;
      },
      inject: [LocalStorageProvider, S3StorageProvider],
    },
  ],
  exports: [STORAGE_PROVIDER, LocalStorageProvider, S3StorageProvider],
})
export class StorageModule {}
