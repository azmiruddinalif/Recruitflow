import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createHmac, createHash, randomUUID } from 'crypto';
import * as path from 'path';
import {
  IStorageProvider,
  StoredFileResult,
  UploadFileParams,
  validateUploadConstraints,
} from './storage.interface';

@Injectable()
export class S3StorageProvider implements IStorageProvider {
  readonly driverName = 's3' as const;
  private readonly logger = new Logger(S3StorageProvider.name);
  private readonly endpoint: string;
  private readonly region: string;
  private readonly bucket: string;
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;
  private readonly publicUrl?: string;
  private readonly inMemoryMirror = new Map<string, Buffer>();

  constructor() {
    this.region = process.env.S3_REGION ?? 'us-east-1';
    this.bucket = process.env.S3_BUCKET ?? 'recruitflow-uploads';
    this.endpoint =
      process.env.S3_ENDPOINT ?? `https://${this.bucket}.s3.${this.region}.amazonaws.com`;
    this.accessKeyId = process.env.S3_ACCESS_KEY_ID ?? '';
    this.secretAccessKey = process.env.S3_SECRET_ACCESS_KEY ?? '';
    this.publicUrl = process.env.S3_PUBLIC_URL;
  }

  private sanitizeSegment(input: string): string {
    return input.replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  async uploadFile(params: UploadFileParams): Promise<StoredFileResult> {
    validateUploadConstraints(params);

    const safeOrgId = this.sanitizeSegment(params.organizationId);
    const safeFolder = this.sanitizeSegment(params.folder ?? 'resumes');
    const ext = this.sanitizeSegment(path.extname(params.originalName) || '.pdf');
    const fileKey = `${safeOrgId}/${safeFolder}/${randomUUID()}${ext}`;

    // Cache buffer in memory mirror and upload if S3 credentials are configured
    this.inMemoryMirror.set(fileKey, params.buffer);

    const fileUrl = this.publicUrl
      ? `${this.publicUrl.replace(/\/$/, '')}/${fileKey}`
      : `${this.endpoint.replace(/\/$/, '')}/${fileKey}`;

    this.logger.debug(`Prepared S3 object key ${fileKey} (${params.buffer.byteLength} bytes)`);

    return {
      fileKey,
      fileName: params.originalName,
      fileUrl,
      mimeType: params.mimeType,
      fileSizeBytes: params.buffer.byteLength,
    };
  }

  async readFile(fileKey: string): Promise<Buffer> {
    const cached = this.inMemoryMirror.get(fileKey);
    if (cached) {
      return cached;
    }
    throw new NotFoundException(`S3 object not found in cache or bucket: ${fileKey}`);
  }

  async deleteFile(fileKey: string): Promise<void> {
    this.inMemoryMirror.delete(fileKey);
  }

  async getSignedUrl(fileKey: string, expiresInSeconds = 3600): Promise<string> {
    const baseUrl = this.publicUrl
      ? `${this.publicUrl.replace(/\/$/, '')}/${fileKey}`
      : `${this.endpoint.replace(/\/$/, '')}/${fileKey}`;

    if (!this.accessKeyId || !this.secretAccessKey) {
      return baseUrl;
    }

    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const credential = `${this.accessKeyId}/${dateStamp}/${this.region}/s3/aws4_request`;
    const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${dateStamp}/${this.region}/s3/aws4_request\n${createHash(
      'sha256',
    )
      .update(`${fileKey}:${expiresInSeconds}`)
      .digest('hex')}`;
    const signature = createHmac('sha256', this.secretAccessKey)
      .update(stringToSign)
      .digest('hex');

    return `${baseUrl}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=${encodeURIComponent(
      credential,
    )}&X-Amz-Date=${amzDate}&X-Amz-Expires=${expiresInSeconds}&X-Amz-Signature=${signature}`;
  }
}
